import {
  type RootSchema,
  type CompilationResults,
  type PathSchema,
  type Policy,
} from "./types/custom";
import Schema from "./lib/schema";
import PoliciesCompiler from "./lib/policiesCompiler";
import DRNA from "./lib/drna";
import Policies from "./lib/policies";
import Condition from "./lib/conditions";
import fs from "fs";
import path from "path";
import IvmSandbox from "./lib/ivmSandbox";
import { fileExtensionName } from "./constants";
const fsp = fs.promises;
class Dimrill {
  constructor(
    options: {
      validateData?: boolean;
      ivmMemoryLimit?: number;
      ivmTimeout?: number;
      schemaPrefix?: string;
      autoLaunchIvm?: boolean;
    } = {}
  ) {
    this.opts = {
      validateData: true,
      ivmMemoryLimit: 12,
      ivmTimeout: 500,
      autoLaunchIvm: true,
      schemaPrefix: "",
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
    });
    this.policies = new Policies(this.DRNA, new Condition(), {
      timeout: this.opts.ivmTimeout ? this.opts.ivmTimeout : 300,
    });
    this.policiesCompiler = new PoliciesCompiler(this.DRNA, this.schema);
  }

  private readonly opts: {
    schemaPrefix: any;
    validateData?: boolean;
    ivmMemoryLimit?: number;
    ivmTimeout?: number;
    autoLaunchIvm?: boolean;
  };

  private readonly schemaLoadingList: Record<string, RootSchema> = {};
  private readonly policiesCompiler: PoliciesCompiler;
  private readonly ivmSandbox: IvmSandbox;
  private readonly DRNA: DRNA;
  private readonly policies: Policies;
  private readonly schema: Schema;

  private async readFiles(
    dirname: string
  ): Promise<Record<string, RootSchema>> {
    const data: Record<string, RootSchema> = {};
    const files = await fsp.readdir(dirname);
    await Promise.all(
      files.map(async (filename) => {
        const fileType = path.extname(filename);
        const full = path.join(dirname, filename);
        if (!fileExtensionName.includes(fileType)) return;
        try {
          const content = await fsp.readFile(full, { encoding: "utf8" });
          data[filename] = JSON.parse(content);
        } catch (e) {
          throw new Error(`Error reading file: ${full}`);
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
        const fileType = path.extname(filename);
        if (!fileExtensionName.includes(fileType)) {
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
  public compilePolicies(policies: Policy[]): Map<number, CompilationResults> {
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
      req: {},
      user: {},
      context: {},
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
    { req = {}, user = {}, context = {} },
    options: {
      validateData?: boolean;
      pathOnly?: boolean;
    } = {
      pathOnly: false,
    }
  ): Promise<object> {
    if (!options.validateData) {
      options.validateData = this.opts.validateData;
    }

    const schemaExists = this.DRNA.matchDrnaFromSchema(
      drna,
      this.schema.returnSchema()
    );
    if (schemaExists === false) {
      throw new Error(`Invalid DRNA path: ${drna}`);
    }

    const validatedObjects = this.schema.castObjectsToSchemaTypes(
      (schemaExists as PathSchema)?.Variables ?? {},
      req,
      user,
      context,
      {
        validateData: options.validateData ?? true,
      }
    );
    const ivmContext = await this.ivmSandbox.createContext(validatedObjects);
    /*
        Pass the Isolate and the Context to the Policies class
    */
    this.policies.setVm(this.ivmSandbox.get().isolate, ivmContext);

    /*
        Parse the DRNA to match the policy
    */
    const synthetizedMatch = this.DRNA.synthetizeDrnaFromSchema(
      drna[1],
      schemaExists as PathSchema,
      options.pathOnly ? { req: {}, user: {}, context: {} } : validatedObjects
    );
    /*
        Match the policy
    */
    const matchedPolicy = await this.policies.matchPolicy(
      drna[0],
      synthetizedMatch,
      schemaExists as PathSchema,
      policies,
      options.pathOnly ? { req: {}, user: {}, context: {} } : validatedObjects,
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
}
export default Dimrill;
