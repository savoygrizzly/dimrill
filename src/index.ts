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
      persistantIvm?: boolean;
    } = {}
  ) {
    this.opts = {
      validateData: true,
      ivmMemoryLimit: 8,
      ivmTimeout: 500,
      persistantIvm: false,
      ...options,
    };
    if (Number(this.opts.ivmMemoryLimit) < 8) {
      throw new Error("Minimum memory limit is 8MB");
    }
    this.schema = new Schema();
    this.DRNA = new DRNA();
    this.ivmSandbox = new IvmSandbox({
      memoryLimit: this.opts.ivmMemoryLimit!,
      timeout: this.opts.ivmTimeout!,
    });
    this.policies = new Policies(this.DRNA, new Condition());
    this.policiesCompiler = new PoliciesCompiler(this.DRNA, this.schema);
  }

  private readonly opts: {
    validateData?: boolean;
    ivmMemoryLimit?: number;
    ivmTimeout?: number;
    persistantIvm?: boolean;
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

  public async autoload(directoryPath: string): Promise<void> {
    const schemas = await this.readFiles(directoryPath);
    const schemaSet = new Map<string, RootSchema>();
    Object.entries(schemas).forEach(([key, value]) => {
      schemaSet.set(key, this.schema.validateSchema(value));
    });
    this.schema.compileSchema(schemaSet);
  }

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

  public compileSchemas(): void {
    const schemaSet = new Map<string, RootSchema>();
    Object.entries(this.schemaLoadingList).forEach(([key, value]) => {
      schemaSet.set(key, this.schema.validateSchema(value));
    });
    this.schema.compileSchema(schemaSet);
  }

  public schemaHasCompiled(): boolean {
    return this.schema.schemaHasLoaded();
  }

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

  public compilePolicies(policies: Policy[]): Map<number, CompilationResults> {
    return this.policiesCompiler.compilePolicies(policies);
  }

  private async launchIvm(): Promise<void> {
    await this.ivmSandbox.create();
    // await this.ivmSandbox.setup(validatedObjects);
    /*
        Pass the Isolate and the Context to the Policies class
    */
    this.policies.setVm(
      this.ivmSandbox.get().isolate,
      this.ivmSandbox.get().context
    );
  }

  public async authorizePathOnly(
    drna: string[],
    policies: Policy[],
    options: {
      validateData: boolean;
      pathOnly?: boolean;
    } = {
      validateData: true,
    }
  ): Promise<object> {
    return await this.authorize(drna, policies, {});
  }

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
      throw new Error(`Invalid DRNA path: ${drna.join(":")}`);
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
    await this.ivmSandbox.create();
    await this.ivmSandbox.setup(validatedObjects);
    /*
        Pass the Isolate and the Context to the Policies class
    */
    this.policies.setVm(
      this.ivmSandbox.get().isolate,
      this.ivmSandbox.get().context
    );

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
      }
    );

    /*
      Merge the results
    */
    const results = this.policies.mergePoliciesResults(matchedPolicy);
    this.ivmSandbox.destroy();
    this.policies.destroyVm();

    return results;
  }
}
export default Dimrill;
