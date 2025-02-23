import {
  type RootSchema,
  type _CompilationResults,
  type PathSchema,
  type Policy,
  type VariableSchema,
} from "./types/custom";
import Schema from "./lib/schema";
import PoliciesCompiler from "./lib/policiesCompiler";
import DRNA from "./lib/drna";
import Policies from "./lib/policies";
import Condition from "./lib/conditions";
import { DimrillLinter } from "./lib/linter";
import fs from "fs";
import path from "path";
import IvmSandbox from "./lib/ivmSandbox";
import { ObjectId } from "bson"; // Add this import
import { fileExtensionName } from "./constants";

const fsp = fs.promises;

class Dimrill {
  constructor(
    options: {
      ivmMemoryLimit?: number;
      ivmTimeout?: number;
      schemaPrefix?: string;
      autoLaunchIvm?: boolean;
    } = {},
  ) {
    this.opts = {
      ivmMemoryLimit: 12,
      ivmTimeout: 500,
      autoLaunchIvm: true,
      schemaPrefix: "",
      unsafeEquals: false,
      ...options,
    };
    if (Number(this.opts.ivmMemoryLimit) < 8) {
      throw new Error("Minimum memory limit is 8MB");
    }

    this.schema = new Schema({ prefix: this.opts.schemaPrefix });
    this.DRNA = new DRNA();
    this.ivmSandbox = new IvmSandbox({
      memoryLimit: this.opts.ivmMemoryLimit ? this.opts.ivmMemoryLimit : 12,
      timeout: this.opts.ivmTimeout ? this.opts.ivmTimeout : 500,
      unsafeEquals: this.opts.unsafeEquals ? this.opts.unsafeEquals : false,
    });
    this.policies = new Policies(this.DRNA, new Condition(), {
      timeout: this.opts.ivmTimeout ? this.opts.ivmTimeout : 300,
    });
    this.policiesCompiler = new PoliciesCompiler(this.DRNA, this.schema);
    this.linter = null;
  }

  private readonly opts: {
    schemaPrefix: any;
    validateData?: boolean;
    ivmMemoryLimit?: number;
    ivmTimeout?: number;
    autoLaunchIvm?: boolean;
    unsafeEquals?: boolean;
  };

  private readonly schemaLoadingList: Record<string, RootSchema> = {};
  private readonly policiesCompiler: PoliciesCompiler;
  private readonly ivmSandbox: IvmSandbox;
  private readonly DRNA: DRNA;
  private readonly policies: Policies;
  private readonly schema: Schema;
  private linter: DimrillLinter | null = null;

  private validateFileExtension(filename: string): boolean {
    let fileType = path.extname(filename);

    // Check for double extension of .dmrl.json
    const fileExtensions = filename.split(".");
    const totalExtensions = fileExtensions.slice(
      Math.max(fileExtensions.length - 2, 1),
    );

    if (totalExtensions.length < 3) {
      fileType = `.${totalExtensions.join(".")}`;
    }

    if (!fileExtensionName.includes(fileType)) return false;
    return true;
  }

  private async readFiles(
    dirname: string,
  ): Promise<Record<string, RootSchema>> {
    const data: Record<string, RootSchema> = {};
    const files = await fsp.readdir(dirname);
    await Promise.all(
      files.map(async (filename) => {
        const full = path.join(dirname, filename);

        if (!this.validateFileExtension(filename)) return;
        try {
          const content = await fsp.readFile(full, { encoding: "utf8" });
          data[filename] = JSON.parse(content);
        } catch (e) {
          throw new Error(`Error reading file: ${full}`);
        }
      }),
    );
    return data;
  }

  private async autolaunchIvm(): Promise<void> {
    if (this.opts.autoLaunchIvm === true) {
      await this.ivmSandbox.createIvm();
    }
  }

  /**
   * Destroy the IVM instance
   */
  public destroyIvm(): void {
    this.ivmSandbox.destroy();
  }

  /**
   * Create a new IVM instance using the options dimrill was initialized with
   * @returns Promise
   */
  public async createIvm(): Promise<void> {
    await this.ivmSandbox.createIvm();
  }

  /**
   *  Autoload the schema files from a directory
   * @param directoryPath Path to directory containing the schema files
   * @returns Promise
   */
  public async autoload(directoryPath: string): Promise<void> {
    const schemas = await this.readFiles(directoryPath);
    const schemaSet = new Map<string, RootSchema>();
    Object.entries(schemas).forEach(([key, value]) => {
      schemaSet.set(key, this.schema.validateSchema(value));
    });
    this.schema.compileSchema(schemaSet);
    /*
        Launch the IVM
    */
    await this.autolaunchIvm();
  }

  /**
   * Load the schema file or files into memory
   * @param paths Path to the schema file or an array of paths
   * @returns Promise
   */
  public async loadSchema(paths: string | string[]): Promise<void> {
    if (!Array.isArray(paths)) paths = [paths];
    await Promise.all(
      paths.map(async (filename) => {
        if (!this.validateFileExtension(filename)) {
          throw new Error(
            `Invalid file type: ${filename}, extension must be: ${fileExtensionName.join(
              ", ",
            )}`,
          );
        }
        try {
          const content = await fsp.readFile(filename, { encoding: "utf8" });
          this.schemaLoadingList[filename] = JSON.parse(content);
        } catch (error) {
          throw new Error(
            `Error reading file, file may not exist: ${filename}`,
          );
        }
      }),
    );
  }

  /**
   * Compile the schema files into memory
   */
  public async compileSchemas(): Promise<void> {
    const schemaSet = new Map<string, RootSchema>();
    Object.entries(this.schemaLoadingList).forEach(([key, value]) => {
      schemaSet.set(key, this.schema.validateSchema(value));
    });
    this.schema.compileSchema(schemaSet);
    /*
        Launch the IVM
    */
    await this.autolaunchIvm();
  }

  /**
   * Get the compiled schema
   * @returns The compiled schema
   */
  public getSchema(): RootSchema | boolean {
    return this.schema.getSchema();
  }

  /**
   * Check if the schema has been compiled
   * @returns True if the schema has been compiled
   */
  public schemaHasCompiled(): boolean {
    return this.schema.schemaHasLoaded();
  }

  /**
   * Extend the schema at specified path
   * @param path Schema path to extend
   * @returns An object with methods to set, unset, push and remove values from the schema
   */
  public extendSchema(path: string): {
    set: (value: string | string[] | object) => void;
    unset: (value: string | object) => void;
    push: (value: string | string[]) => void;
    remove: (value: string) => void;
  } {
    return {
      set: (value) => {
        this.schema.extendSchema(path).set(value);
      },
      unset: (value) => {
        this.schema.extendSchema(path).unset(value);
      },
      push: (value) => {
        this.schema.extendSchema(path).push(value);
      },
      remove: (value) => {
        this.schema.extendSchema(path).remove(value);
      },
    };
  }

  /**
   *  Compile and validate the policies
   * @param policies Array of policies to check against
   * @returns A Map of the compiled policies with their compilation results
   */
  public compilePolicies(policies: Policy[]): Map<number, _CompilationResults> {
    return this.policiesCompiler.compilePolicies(policies);
  }

  /**
   *  Authorize a DRNA Array
   * @param drnaArray The array of DRNA to authorize
   * @param policies The policies to check against
   * @param options Options
   * @returns An array of all the valid drna strings supplied
   */
  public async authorizeBulk(
    drnaArray: string[][],
    policies: Policy[],
    options: {
      ignoreConditions?: boolean;
    } = {
        ignoreConditions: true,
      },
  ): Promise<string[]> {
    const validatedObjects = {
      variables: {},
    };

    const ivmContext = await this.ivmSandbox.createContext(validatedObjects);

    /*
        Pass the Isolate and the Context to the Policies class
    */
    this.policies.setVm(this.ivmSandbox.get().isolate, ivmContext);

    const returnedDRNA: Array<string | boolean> = await Promise.all(
      drnaArray.map(async (drna) => {
        const schemaExists = this.DRNA.matchDrnaFromSchema(
          drna,
          this.schema.returnSchema(),
        );
        if (schemaExists !== false) {
          const synthetizedMatch = this.DRNA.synthetizeDrnaFromSchema(
            drna[1],
            schemaExists as PathSchema,
            validatedObjects,
          );

          /*
            Match the policy
          */
          const matchedPolicy = await this.policies.matchPolicy(
            drna[0],
            synthetizedMatch,
            schemaExists as PathSchema,
            policies,
            validatedObjects,
            {
              pathOnly: true,
              ignoreConditions: Boolean(options.ignoreConditions),
            },
          );

          /*
          Merge the results
        */
          const results = this.policies.mergePoliciesResults(matchedPolicy);
          if (results.valid) {
            return String(drna[0]) + "," + String(drna[1]);
          }
        }
        return false;
      }),
    );

    this.ivmSandbox.release(ivmContext);
    this.policies.destroyVm();

    return returnedDRNA.filter((v) => v) as string[];
  }

  /**
   * Authorize a user/entity against a DRNA type and path, generates a query if requested
   * @param drna The DRNA to authorize
   * @param policies The policies to check against
   * @param validatedObjects The Objects to use in the authorizer
   * @param options
   * @returns The query or an object with the query and the valid status
   */
  public async authorize(
    drna: string[],
    policies: Policy[],
    {
      // eslint-disable-next-line
      variables = {} as Record<string, unknown>,
    },
    options: {
      validateData?: boolean;
      pathOnly?: boolean;
    } = {
        pathOnly: false,
      },
  ): Promise<{
    query: string | object;
    valid: boolean;
  }> {
    if (!options.validateData) {
      options.validateData = this.opts.validateData;
    }
    const schemaExists = this.DRNA.matchDrnaFromSchema(
      drna,
      this.schema.returnSchema(),
    ) as PathSchema | false; // First, explicitly type the return value

    if (schemaExists === false) {
      throw new Error(
        `Invalid DRNA path: ${Array.isArray(drna) ? drna.join(",") : drna}`,
      );
    }
    /*
        Validate the variables passed.
    */
    if (Object.keys(variables).length > 0 && schemaExists.Variables) {
      const schemaVariables = schemaExists.Variables as Record<
        string,
        VariableSchema
      >;

      // Create a new variables object with cast values
      const castVariables: Record<string, unknown> = {};

      for (const [key, schema] of Object.entries(schemaVariables)) {
        if (schema.required && !(key in variables)) {
          throw new Error(`Required variable "${key}" is missing`);
        }
        if (key in variables) {
          const value = variables[key];
          switch (schema.type) {
            case "string":
              if (typeof value !== "string") {
                throw new Error(`Variable "${key}" must be a string`);
              }
              castVariables[key] = value;
              break;
            case "number":
              if (typeof value !== "number") {
                throw new Error(`Variable "${key}" must be a number`);
              }
              castVariables[key] = value;
              break;
            case "boolean":
              if (typeof value !== "boolean") {
                throw new Error(`Variable "${key}" must be a boolean`);
              }
              castVariables[key] = value;
              break;
            case "array":
              if (!Array.isArray(value)) {
                throw new Error(`Variable "${key}" must be an array`);
              }
              castVariables[key] = value;
              break;
            case "objectId":
              // First check if it's already an ObjectId
              // @ts-expect-error inferring the type of value
              if (ObjectId.isValid(value) && typeof value === "object") {
                castVariables[key] = (value as ObjectId).toString();
              } else if (typeof value === "string" && ObjectId.isValid(value)) {
                // If it's a string and valid ObjectId format, convert it
                castVariables[key] = new ObjectId(value).toString();
              } else {
                throw new Error(
                  `Variable "${key}" must be an ObjectId or valid ObjectId string`,
                );
              }

              break;
            case "objectIdArray":
              if (!Array.isArray(value)) {
                throw new Error(
                  `Variable "${key}" must be an array of ObjectIds`,
                );
              }
              // eslint-disable-next-line
              const objectIds = value.map((item) => {
                // eslint-disable-next-line
                if (ObjectId.isValid(item) && typeof item === "object") {
                  return (item as ObjectId).toString();
                } else if (typeof item === "string" && ObjectId.isValid(item)) {
                  return new ObjectId(item).toString();
                } else {
                  throw new Error(
                    `All items in "${key}" must be ObjectIds or valid ObjectId strings`,
                  );
                }
              });

              castVariables[key] = objectIds;
              break;
            case "date":
              if (value instanceof Date) {
                castVariables[key] = value;
              } else {
                try {
                  const date = new Date(value as string | number);
                  if (isNaN(date.getTime())) {
                    throw new Error();
                  }
                  castVariables[key] = date;
                } catch {
                  throw new Error(
                    `Variable "${key}" must be a Date or valid date string`,
                  );
                }
              }
              break;
          }
        }
      }

      // Replace the original variables with the cast ones
      variables = castVariables;
    }

    const ivmContext = await this.ivmSandbox.createContext(
      variables,
    );

    /*

        Pass the Isolate and the Context to the Policies class
    */
    this.policies.setVm(this.ivmSandbox.get().isolate, ivmContext);

    /*
        Parse the DRNA to match the policy
    */
    const synthetizedMatch = this.DRNA.synthetizeDrnaFromSchema(
      drna[1],
      schemaExists,
      options.pathOnly
        ? { variables: {} }
        : { variables },
    );

    /*
        Match the policy
    */
    const matchedPolicy = await this.policies.matchPolicy(
      drna[0],
      synthetizedMatch,
      schemaExists,
      policies,
      options.pathOnly
        ? { variables: {} }
        : { variables },
      {
        pathOnly: options.pathOnly ? options.pathOnly : false,
        ignoreConditions: false,
      },
    );

    /*
      Merge the results
    */
    const results = this.policies.mergePoliciesResults(matchedPolicy);
    this.ivmSandbox.release(ivmContext);
    this.policies.destroyVm();

    return results;
  }

  /**
   * Get the linter instance. Creates one if it doesn't exist.
   */
  public getLinter(): DimrillLinter {
    if (!this.linter) {
      if (!this.schema.schemaHasLoaded()) {
        throw new Error("Schema must be loaded before using the linter");
      }
      this.linter = new DimrillLinter(this.schema.returnSchema());
    }
    return this.linter;
  }

  /**
   * Validate variables for a given DRNA path
   */
  public validateVariables(path: string, variables: Record<string, unknown>): Array<{
    type: 'variable' | 'argument' | 'syntax';
    message: string;
    path?: string;
    expected?: string;
    received?: string;
  }> {
    return this.getLinter().validateVariables(path, variables);
  }

  /**
   * Get schema details for a given DRNA path
   */
  public getSchemaDetails(path: string): {
    variables?: Record<string, VariableSchema>;
    arguments?: Record<string, { type: string }>;
    conditions?: {
      queryEnforceTypeCast?: Record<string, string>;
      operators?: string[];
    };
    type?: string[];
  } | null {
    return this.getLinter().getSchemaDetails(path);
  }
}
export default Dimrill;
