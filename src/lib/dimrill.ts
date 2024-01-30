import { type PathSchema } from "../types/custom";
import Schema from "./schema";
import Policies from "./policies";
import ivm from "isolated-vm";
class Dimrill {
  constructor() {
    this.schema = new Schema();
    this.policies = new Policies(this.schema);
  }

  private readonly policies: Policies;
  public schema: Schema;

  authorize(
    drna: string[],
    req: object,
    user: object,
    context: object
  ): object {
    const schemaExists = this.schema.matchDrnaFromSchema(drna);

    if (schemaExists === false) {
      throw new Error(`Invalid DRNA path: ${drna.join(":")}`);
    }
    const validatedObjects = this.schema.castObjectsToSchemaTypes(
      schemaExists as PathSchema,
      req,
      user,
      context
    );
    /*
        Create an Isolate and a Context to prevent code injection
    */
    const isolate = new ivm.Isolate({ memoryLimit: 1 });
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
    const synthetizedMatch = this.schema.synthetizeDrnaFromSchema(
      drna[1],
      schemaExists as PathSchema,
      validatedObjects
    );

    return {
      valid: true, // or false
      query: {},
    };
  }
}
