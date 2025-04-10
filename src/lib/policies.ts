import {
  type PathSchema,
  type Policy,
  type ValidatedDataObjects,
  type _SynthetizedDRNAMatch,
  type _DrnaParameters,
} from "../types/custom";
import type Condition from "./conditions";
import type DRNA from "./drna";
import { type Isolate, type Context } from "isolated-vm";
class Policies {
  public DRNA: DRNA;
  private readonly Conditions: Condition;

  private isolatedVm: Isolate | null;
  public isolatedVmContext: Context | null;
  private readonly ivmOptions: {
    timeout: number;
  };

  constructor(
    DRNA: DRNA,
    Conditions: Condition,
    options: { timeout: number } = { timeout: 300 }
  ) {
    this.DRNA = DRNA;
    this.Conditions = Conditions;
    this.isolatedVm = null;
    this.isolatedVmContext = null;
    this.ivmOptions = options;
  }

  public setVm(isolatedVm: Isolate | null, context: Context | null): void {
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
    validatedObjects: ValidatedDataObjects
  ): Promise<_SynthetizedDRNAMatch> {
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
  ): Promise<_DrnaParameters> {
    const acc: Record<string, string | number | undefined> = {}; // This will be the accumulator object

    for (const [key, value] of Object.entries(rawParameters)) {
      if (!this.isolatedVmContext) {
        // Add retry logic - try to check if context exists after a small delay
        await new Promise((resolve) => setTimeout(resolve, 10));
        if (!this.isolatedVmContext) {
          throw new Error("Isolated VM context is not set");
        }
      }

      try {
        // Assuming isolatedVmContext.eval is an async function
        const parsedValue = await this.isolatedVmContext.eval(
          `(function() {return formatValue(${JSON.stringify(
            value
          )},groupedContext)})()`,
          this.ivmOptions
        );
        acc[String(key)] = parsedValue;
      } catch (error) {
        // Handle eval errors gracefully
        throw new Error(`Error processing parameter ${key}: ${error}`);
        // acc[String(key)] = value; // Fall back to the original value
      }
    }

    return acc;
  }

  private async processPolicy(
    drnaType: string,
    policy: Policy,
    drnaToMatch: _SynthetizedDRNAMatch,
    schema: PathSchema,
    validatedObjects: ValidatedDataObjects,
    options: {
      pathOnly: boolean;
      ignoreConditions: boolean;
    }
  ): Promise<{ valid: boolean; query: object | string }> {
    for (const statement of policy.Statement) {
      if (statement[String(drnaType)] && statement.Effect === "Allow") {
        const drnaElements = statement[drnaType];
        if (!Array.isArray(drnaElements)) continue;

        for (const elem of drnaElements) {
          // First check if base paths match before processing parameters
          const policyBasePath = elem.split("&")[0];
          const requestBasePath = drnaToMatch.drnaPaths.join(":");

          // Use policyPathMatches instead of direct equality

          if (
            this.DRNA.policyPathMatches(
              policyBasePath as string,
              requestBasePath
            )
          ) {
            const sanitizedDrna = await this.sanitizePolicyDrna(
              String(elem),
              schema,
              validatedObjects
            );

            const valid = this.DRNA.checkDrnaAccess(
              drnaToMatch.drnaPaths,
              drnaToMatch.parameters,
              sanitizedDrna.drnaPaths,
              sanitizedDrna.parameters,
              options.pathOnly
            );

            if (valid) {
              if (options.ignoreConditions) {
                return { valid: true, query: {} };
              }
              return await this.Conditions.runConditions(
                statement.Condition,
                schema
              );
            }
          }
        }
      }
    }

    return { valid: false, query: {} };
  }

  public async matchPolicy(
    drnaType: string,
    drnaToMatch: _SynthetizedDRNAMatch,
    schema: PathSchema,
    policies: Policy[],
    validatedObjects: ValidatedDataObjects,
    options: {
      pathOnly: boolean;
      ignoreConditions: boolean;
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
