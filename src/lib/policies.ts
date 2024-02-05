import {
  type PathSchema,
  type Policy,
  type validatedDataObjects,
  type synthetizedDRNAMatch,
  type drnaParameters,
  type Statement,
} from "../types/custom";
import type Condition from "./conditions";
import type DRNA from "./drna";

class Policies {
  public DRNA: DRNA;
  private readonly Conditions: Condition;

  private isolatedVm: any;
  public isolatedVmContext: any;

  constructor(DRNA: DRNA, Conditions: Condition) {
    this.DRNA = DRNA;
    this.Conditions = Conditions;
    this.isolatedVm = null;
    this.isolatedVmContext = null;
  }

  public setVm(isolatedVm: any, context: any): void {
    this.isolatedVm = isolatedVm;
    this.isolatedVmContext = context;
    this.Conditions.setVm(isolatedVm, context);
  }

  public destroyVm(): void {
    this.isolatedVm = null;
    this.isolatedVmContext = null;
    this.Conditions.unsetVm();
  }

  public async sanitizePolicyDrna(
    drna: string,
    schema: PathSchema,
    validatedObjects: validatedDataObjects
  ): Promise<synthetizedDRNAMatch> {
    const rawParameters = this.DRNA.matchParametersToSchema(
      this.DRNA.mapInjectedParams(drna.split("&").slice(1), {
        removeWildcards: true,
      }),
      schema,
      validatedObjects,
      { allowWildcards: true }
    );

    const parameters = await this.processParameters(rawParameters);
    return {
      drnaPaths: drna.split("&")[0].split(":"),
      parameters,
    };
  }

  private async processParameters(
    rawParameters: Record<string, string | number | undefined>
  ): Promise<drnaParameters> {
    const acc: Record<string, string | number | undefined> = {}; // This will be the accumulator object

    for (const [key, value] of Object.entries(rawParameters)) {
      // Assuming isolatedVmContext.eval is an async function
      const parsedValue = await this.isolatedVmContext.eval(
        `(function() {return formatValue(${JSON.stringify(
          value
        )},groupedContext)})()`
      );
      acc[String(key)] = parsedValue;
    }

    return acc;
  }

  private async processPolicy(
    drnaType: string,
    policy: Policy,
    drnaToMatch: synthetizedDRNAMatch,
    schema: PathSchema,
    validatedObjects: validatedDataObjects,
    options: {
      pathOnly: boolean;
    }
  ): Promise<{
    valid: boolean;
    query: object | string;
  }> {
    for (const statement of policy.Statement) {
      if (statement[drnaType]) {
        for (const elem of statement[drnaType]) {
          const sanitizedDrna = await this.sanitizePolicyDrna(
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

          if (valid) {
            return await this.Conditions.runConditions(
              statement.Condition,
              schema
            );
          }
        }
      }
    }
    return {
      valid: false,
      query: {},
    };
  }

  public async matchPolicy(
    drnaType: string,
    drnaToMatch: synthetizedDRNAMatch,
    schema: PathSchema,
    policies: Policy[],
    validatedObjects: validatedDataObjects,
    options: {
      pathOnly: boolean;
    }
  ): Promise<Array<{ valid: boolean; query: object | string }>> {
    if (policies.length === 0) {
      return [
        {
          valid: false,
          query: {},
        },
      ];
    }
    const promises = await Promise.all(
      policies.map(
        async (policy) =>
          await this.processPolicy(
            drnaType,
            policy,
            drnaToMatch,
            schema,
            validatedObjects,
            options
          )
      )
    );

    return promises;
  }

  public mergePoliciesResults(
    results: Array<{ valid: boolean; query: object | string }>
  ): {
    valid: boolean;
    query: object | string;
  } {
    const allValidResults = results.filter((result) => result.valid);
    if (allValidResults.length === 0) {
      return {
        valid: false,
        query: {},
      };
    }
    const allQueries = [allValidResults.map((result) => result.query)];
    // Merge queries based on their type
    const mergedQuery =
      typeof allQueries[0] === "object"
        ? this.Conditions.mergeObjectQueries(
            allQueries as Array<Record<string, any>>
          )
        : this.Conditions.mergeStringQueries(allQueries[0] as string[]);
    return {
      valid: true,
      query: mergedQuery,
    };
  }
}
export default Policies;
