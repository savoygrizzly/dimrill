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
import { Variables } from './lib/variables'; // Import Variables class

export {
  type RootSchema,
  type PathSchema,
  type Policy,
  type VariableSchema,
  type Statement,
  type StatementCondition,
  type AuthorizationResult,
  type _CompilationResults,
} from "./types/custom";

const fsp = fs.promises;

class Dimrill {
  constructor(
    options: {
      ivmMemoryLimit?: number;
      ivmTimeout?: number;
      schemaPrefix?: string;
      autoLaunchIvm?: boolean;
    } = {}
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
      Math.max(fileExtensions.length - 2, 1)
    );

    if (totalExtensions.length < 3) {
      fileType = `.${totalExtensions.join(".")}`;
    }

    if (!fileExtensionName.includes(fileType)) return false;
    return true;
  }

  private async readFiles(
    dirname: string,
    recursive: boolean = false,
    prefix: string = ""
  ): Promise<Record<string, RootSchema>> {
    const data: Record<string, RootSchema> = {};
    const files = await fsp.readdir(dirname, { withFileTypes: true });

    await Promise.all(
      files.map(async (dirent) => {
        const filename = dirent.name;
        const full = path.join(dirname, filename);

        if (dirent.isDirectory() && recursive) {
          // For directories, recursively scan with the directory name as prefix
          const nestedPrefix = prefix ? `${prefix}.${filename}` : filename;
          const nestedData = await this.readFiles(
            full,
            recursive,
            nestedPrefix
          );

          // Merge nested data with current data
          Object.entries(nestedData).forEach(([key, value]) => {
            data[key] = value;
          });
        } else if (dirent.isFile()) {
          if (!this.validateFileExtension(filename)) return;
          try {
            const content = await fsp.readFile(full, { encoding: "utf8" });
            const parsed = JSON.parse(content);

            // If we have a prefix, store with prefix information
            const key = prefix ? `${prefix}:${filename}` : filename;
            data[key] = parsed;
          } catch (e) {
            throw new Error(`Error reading file: ${full}`);
          }
        }
      })
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
   * @param options Additional options for loading
   * @param options.recursive When true, recursively scan subdirectories and use folder names as prefixes
   * @returns Promise
   */
  public async autoload(
    directoryPath: string,
    options: { recursive?: boolean } = {}
  ): Promise<void> {
    const { recursive = false } = options;
    const schemas = await this.readFiles(directoryPath, recursive);
    const schemaSet = new Map<string, RootSchema>();

    Object.entries(schemas).forEach(([key, value]) => {
      // Extract prefix from key if it exists (format: "prefix:filename")
      const [prefix, filename] = key.includes(":")
        ? key.split(":")
        : [null, key];

      // Validate schema
      const validatedSchema = this.schema.validateSchema(value);

      // Set the schema with the appropriate key
      schemaSet.set(key, validatedSchema);
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
              ", "
            )}`
          );
        }
        try {
          const content = await fsp.readFile(filename, { encoding: "utf8" });
          this.schemaLoadingList[filename] = JSON.parse(content);
        } catch (error) {
          throw new Error(
            `Error reading file, file may not exist: ${filename}`
          );
        }
      })
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
      }
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
          this.schema.returnSchema()
        );
        if (schemaExists !== false) {
          const synthetizedMatch = this.DRNA.synthetizeDrnaFromSchema(
            drna[1],
            schemaExists as PathSchema,
            validatedObjects
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
            }
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
      })
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
      }
  ): Promise<{
    query: string | object;
    valid: boolean;
  }> {
    if (!options.validateData) {
      options.validateData = this.opts.validateData;
    }
    const schemaExists = this.DRNA.matchDrnaFromSchema(
      drna,
      this.schema.returnSchema()
    ) as PathSchema | false; // First, explicitly type the return value

    if (schemaExists === false) {
      throw new Error(
        `Invalid DRNA path: ${Array.isArray(drna) ? drna.join(",") : drna}`
      );
    }

    // Use Variables.castVariables
    if (Object.keys(variables).length > 0 && schemaExists.Variables) {
      const schemaVariables = schemaExists.Variables as Record<
        string,
        VariableSchema
      >;
      variables = Variables.castVariables(variables, schemaVariables);
    }

    const ivmContext = await this.ivmSandbox.createContext(variables);

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
      options.pathOnly ? { variables: {} } : { variables }
    );

    /*
        Match the policy
    */
    const matchedPolicy = await this.policies.matchPolicy(
      drna[0],
      synthetizedMatch,
      schemaExists,
      policies,
      options.pathOnly ? { variables: {} } : { variables },
      {
        pathOnly: options.pathOnly ? options.pathOnly : false,
        ignoreConditions: false,
      }
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
  public validateVariables(
    path: string,
    variables: Record<string, unknown>
  ): Array<{
    type: "variable" | "argument" | "syntax";
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
