import {
  type PathSchema,
  type Policy,
  type validatedDataObjects,
  type synthetizedDRNAMatch,
} from "../types/custom";
import type Schema from "./schema";
import type DRNA from "./drna";
class Policies {
  private readonly DRNA: DRNA;

  private isolatedVm: any;
  public isolatedVmContext: any;

  constructor(DRNA: DRNA) {
    this.DRNA = DRNA;
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

  private sanitizePolicyDrna(
    drna: string,
    schema: PathSchema,
    validatedObjects: validatedDataObjects
  ): synthetizedDRNAMatch {
    const rawParameters = this.DRNA.matchParametersToSchema(
      this.DRNA.mapInjectedParams(drna.split("&").slice(1), {
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
        const parsedValue: string = this.isolatedVmContext.evalSync(
          "`" + value + "`"
        );
        acc[String(key)] = parsedValue;
        return acc;
      },
      {}
    );
    return {
      drnaPaths: drna.split("&")[0].split(":"),
      parameters,
    };
  }

  public matchPolicy(
    drnaType: string,
    drnaToMatch: synthetizedDRNAMatch,
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
          const matchedStatement = statement[drnaType].find((elem: string) => {
            // parse elem
            const sanitizedDrna = this.sanitizePolicyDrna(
              String(elem),
              schema,
              validatedObjects
            );

            const valid = this.DRNA.checkDrnaAccess(
              drnaToMatch.drnaPaths,
              drnaToMatch.parameters,
              sanitizedDrna.drnaPaths,
              sanitizedDrna.parameters
            );
            console.log("split says", valid);
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
