import { type RootSchema, type PathSchema, type Policy } from "../types/custom";
import Schema from "./schema";
import DRNA from "./drna";
import Policies from "./policies";

import fs from "fs";
import path from "path";
import ivm from "isolated-vm";
const fsp = fs.promises;
class GateKeeper {
  constructor() {
    this.schema = new Schema();
    this.DRNA = new DRNA();
    this.policies = new Policies(this.DRNA);
  }

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
    push: (value: string | string[]) => void;
  } {
    return {
      set: (value) => {
        this.schema.extendSchema(path).set(value);
      },
      push: (value) => {
        this.schema.extendSchema(path).push(value);
      },
    };
  }

  public authorize(
    drna: string[],
    policies: Policy[],
    { req = {}, user = {}, context = {} },
    options = {
      validateData: true,
    }
  ): object {
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
    /*
        Create an Isolate and a Context to prevent code injection
    */
    const isolate = new ivm.Isolate({ memoryLimit: 8 });
    const isolateContext = isolate.createContextSync();
    const jail = isolateContext.global;
    /*
        Pass the validated objects to the Isolate
    */
    jail.setSync("req", new ivm.ExternalCopy(validatedObjects.req).copyInto());
    jail.setSync(
      "user",
      new ivm.ExternalCopy(validatedObjects.user).copyInto()
    );
    jail.setSync(
      "context",
      new ivm.ExternalCopy(validatedObjects.context).copyInto()
    );
    jail.setSync("global", jail.derefInto());

    /*
        Pass the Isolate and the Context to the Policies class
    */
    this.policies.setVm(isolate, isolateContext);

    /*
        Parse the DRNA to match the policy
    */
    const synthetizedMatch = this.DRNA.synthetizeDrnaFromSchema(
      drna[1],
      schemaExists as PathSchema,
      validatedObjects
    );

    /*
        Match the policy
    */
    const matchedPolicy = this.policies.matchPolicy(
      drna[0],
      synthetizedMatch,
      schemaExists as PathSchema,
      policies,
      validatedObjects
    );

    return {
      valid: true, // or false
      query: {},
    };
  }
}
export default GateKeeper;
