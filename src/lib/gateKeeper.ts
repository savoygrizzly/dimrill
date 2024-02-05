import { type RootSchema, type PathSchema, type Policy } from "../types/custom";
import Schema from "./schema";
import DRNA from "./drna";
import Policies from "./policies";
import Condition from "./conditions";
import fs from "fs";
import path from "path";
import IvmSandbox from "./ivmSandbox";
const fsp = fs.promises;
class Dimrill {
  constructor() {
    this.schema = new Schema();
    this.DRNA = new DRNA();
    this.ivmSandbox = new IvmSandbox();
    this.policies = new Policies(this.DRNA, new Condition());
  }

  private readonly ivmSandbox: IvmSandbox;
  private readonly DRNA: DRNA;
  private readonly policies: Policies;
  public schema: Schema;

  private async readFiles(
    dirname: string
  ): Promise<Record<string, RootSchema>> {
    const data: Record<string, RootSchema> = {};
    const files = await fsp.readdir(dirname);
    await Promise.all(
      files.map(async (filename) => {
        const fileType = path.extname(filename);
        const full = path.join(dirname, filename);
        if (fileType !== ".dmrl") return;
        const content = await fsp.readFile(full, { encoding: "utf8" });
        data[filename] = JSON.parse(content);
      })
    );
    return data;
  }

  public async autoload(directory: string): Promise<void> {
    const schemas = await this.readFiles(directory);
    const schemaSet = new Map<string, RootSchema>();
    Object.entries(schemas).forEach(([key, value]) => {
      schemaSet.set(key, this.schema.validateSchema(value));
    });
    this.schema.compileSchema(schemaSet);
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
      validateData: boolean;
      pathOnly?: boolean;
    } = {
      validateData: true,
      pathOnly: false,
    }
  ): Promise<object> {
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
      options
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
    console.log(results);
    this.ivmSandbox.destroy();
    this.policies.destroyVm();

    return results;
  }
}
export default Dimrill;
