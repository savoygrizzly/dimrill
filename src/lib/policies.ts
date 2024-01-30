import {
  type PathSchema,
  type Policy,
  type validatedDataObjects,
} from "../types/custom";
import type Schema from "./schema";
class Policies {
  private readonly schema: Schema;
  private isolatedVm: any;
  public isolatedVmContext: any;
  constructor(schema: Schema) {
    this.schema = schema;
    this.isolatedVm = null;
    this.isolatedVmContext = null;
  }

  public setVm(isolatedVm: any, context: any): void {
    this.isolatedVm = isolatedVm;
    this.isolatedVmContext = context;
  }

  public destroyVm(): void {
    this.isolatedVm.dispose();
    this.isolatedVm = null;
    this.isolatedVmContext = null;
  }

  private parsePolicyDrna(
    drna: string,
    schema: PathSchema,
    validatedObjects: validatedDataObjects
  ): string {
    const rawParameters = this.schema.matchParametersToSchema(
      this.schema.mapInjectedParams(drna.split("&").slice(1), {
        removeWildcards: true,
      }),
      schema,
      validatedObjects,
      { allowWildcards: true }
    );

    /*
      Iterate over parameters to replace the template strings with the actual values using an Isolate
      Doing so prevents potential code injection and parameters tampering via the validateObject
    */
    const parameters = Object.entries(rawParameters).reduce(
      (acc: Record<string, string>, [key, value]) => {
        const parsedKey: string = this.isolatedVmContext.evalSync(
          "`" + key + "`"
        );
        const parsedValue: string = this.isolatedVmContext.evalSync(
          "`" + value + "`"
        );
        acc[parsedKey] = parsedValue;
        return acc;
      },
      {}
    );
    /*
      Replace the parameters in the DRNA
    */
  }

  public matchPolicy(
    drnaType: string,
    drnaToMatch: string,
    schema: PathSchema,
    policies: Policy[],
    validatedObjects: validatedDataObjects
  ): object | boolean {
    if (policies.length === 0) {
      return {
        valid: false,
        query: {},
      };
    }
    policies.map((policy) => {
      const matchedPolicy = policy.Statement.reduce((results, statement) => {
        if (statement[drnaType]) {
          const matchedStatement = statement[drnaType].find((elem) => {
            // parse elem
            const sanitizedDrna = this.parsePolicyDrna(
              String(elem),
              schema,
              validatedObjects
            );
          });
        }
        return results;
      }, []);
      return matchedPolicy ?? false;
    });
    return false;
  }
}
export default Policies;
