import { type ConditionSchema, type StatementCondition } from "../types/custom";
import {
  SchemaOperators,
  SchemaConditionsOnlyOperators,
  SchemaOperands,
  SchemaCastTypes,
} from "../constants";
import TypeCasters from "./operators/typeCasters";
class Condition {
  constructor(
    options: {
      adapter?: string;
    } = {
      adapter: "mongodb",
    },
  ) {
    this.typeCasters = new TypeCasters();
    this.options = options;
  }

  private readonly typeCasters: TypeCasters;
  private isolatedVmContext: any;
  private isolatedVm: any;
  private readonly options: {
    adapter?: string;
  };

  public setVm(isolate: any, context: any): void {
    this.isolatedVmContext = context;
    this.isolatedVm = isolate;
  }

  public unsetVm(): void {
    this.isolatedVmContext = null;
    this.isolatedVm = null;
  }

  public async runConditions(
    condition: StatementCondition | undefined,
    schema: ConditionSchema,
  ): Promise<{
    valid: boolean;
    query: object | string;
  }> {
    if (schema?.Condition?.Enforce) {
      condition = { ...condition, ...schema?.Condition?.Enforce };
    }
    if (!condition) {
      return { valid: true, query: {} };
    }
    const results = await Promise.all(
      Object.entries(condition).map(async ([key, value]) => {
        const keys = key.split(":");
        const modifiers = keys.filter(
          (k) =>
            SchemaOperators.includes(k) ||
            SchemaOperands.includes(k) ||
            SchemaCastTypes.includes(k) ||
            SchemaConditionsOnlyOperators.includes(k) ||
            k === "ToQuery",
        );

        // Identify main operator, operand, ToQuery modifier, and castType
        const mainOperator = modifiers.find((modifier) =>
          [...SchemaOperators, ...SchemaConditionsOnlyOperators].includes(
            modifier,
          ),
        );

        const operand = modifiers.find((modifier) =>
          SchemaOperands.includes(modifier),
        );
        const toQuery = modifiers.includes("ToQuery") ? "ToQuery" : undefined;
        const castType = modifiers.find((modifier) =>
          SchemaCastTypes.includes(modifier),
        );

        if (!mainOperator) {
          throw new Error(
            `Invalid condition key: ${String(key)}. Main operator is missing.`,
          );
        }
        if (
          SchemaConditionsOnlyOperators.includes(mainOperator) &&
          toQuery !== undefined
        ) {
          throw new Error(
            `Invalid condition query key: ${String(key)}. Operator ${String(
              mainOperator,
            )} is not allowed to be used with the ToQuery modifier.`,
          );
        }
        const mainOperatorCount = modifiers.filter(
          (modifier) =>
            (toQuery !== undefined && SchemaOperators.includes(modifier)) ||
            [...SchemaOperators, ...SchemaConditionsOnlyOperators].includes(
              modifier,
            ),
        ).length;
        const operandCount = modifiers.filter((modifier) =>
          SchemaOperands.includes(modifier),
        ).length;
        const castTypeCount = modifiers.filter((modifier) =>
          SchemaCastTypes.includes(modifier),
        ).length;

        if (
          mainOperatorCount > 1 ||
          operandCount > 1 ||
          castTypeCount > 1 ||
          keys.length > modifiers.length
        ) {
          throw new Error(
            `Invalid condition key: ${key}. Structure not valid.`,
          );
        }

        // Assuming processCondition is defined to handle the new structure
        return await this.processCondition(
          mainOperator,
          { operand, toQuery, castType },
          value,
          schema,
        );
      }),
    );

    return this.mergeConditionsResults(results);
  }

  private mergeConditionsResults(
    results: Array<{
      valid: boolean;
      query: object | string;
    }>,
  ): {
    valid: boolean;
    query: object | string;
  } {
    // Determine if all are valid
    const isValid = results.every((result) => result.valid);

    // Determine the type of query in the results
    const allQueries = results.map((result) => result.query);
    const isObjectQuery = typeof allQueries[0] === "object";

    // Merge queries based on their type
    const mergedQuery = isObjectQuery
      ? this.mergeObjectQueries(allQueries as Array<Record<string, any>>)
      : this.mergeStringQueries(allQueries as string[]);

    return {
      valid: isValid,
      query: mergedQuery,
    };
  }

  public mergeObjectQueries(
    queries: Array<Record<string, any>>,
  ): Record<string, any> {
    return queries.reduce((acc, currentArray) => {
      if (!Array.isArray(currentArray)) {
        return acc;
      }
      currentArray.forEach((obj: any) => {
        // Merge each object into the accumulator
        Object.assign(acc, obj);
      });
      return acc;
    }, {});
  }

  public mergeStringQueries(queries: string[]): string {
    return queries.join("; "); // Using '; ' as a delimiter
  }

  private async processCondition(
    mainOperator: string,
    modifiers: {
      operand: string | undefined;
      toQuery: string | undefined;
      castType: string | undefined;
    },
    values: object,
    schema: ConditionSchema,
  ): Promise<{
    valid: boolean;
    query: object | string;
  }> {
    const returnValue = {
      valid: false,
      query: {},
    };

    if (
      modifiers.toQuery &&
      SchemaOperators.includes(mainOperator) &&
      (!schema?.Condition?.QueryOperators ||
        schema?.Condition?.QueryOperators.includes(mainOperator))
    ) {
      returnValue.valid = true;

      const results = await Promise.all(
        Object.entries(values).map(async (variables) => {
          return await this.runAdapter(
            mainOperator,
            variables,
            modifiers.castType ?? schema?.Condition?.QueryEnforceTypeCast,
          );
        }),
      );
      if (modifiers.castType ?? schema?.Condition?.QueryEnforceTypeCast) {
        // cast results to correct type
        returnValue.query = this.castQuery(
          results,
          modifiers.castType ?? "",
          schema?.Condition?.QueryEnforceTypeCast as Record<string, string>,
        );
      } else {
        returnValue.query = results;
      }
    } else if (
      !schema?.Condition?.Operators ||
      schema?.Condition?.Operators.includes(mainOperator)
    ) {
      const results = await Promise.all(
        Object.entries(values).map(async (variables) => {
          return await this.runCondition(mainOperator, variables);
        }),
      );
      // Process results
      if (modifiers.operand === "AnyValues") {
        returnValue.valid = results.filter((result) => result).length > 0;
      } else {
        returnValue.valid =
          results.filter((result) => result).length === results.length;
      }
    }
    return returnValue;
  }

  private castQuery(
    results: any[],
    castType: string,
    enforceTypeCast: Record<string, string> | undefined,
  ): string | Record<string, any> {
    return results.map((result) => {
      if (typeof result === "string") {
        return result; // Directly return the string if the result is a string
      } else if (typeof result === "object" && result !== null) {
        // Process each key-value pair in the object
        return Object.entries(result as Record<string, any>).reduce(
          (acc: Record<string, any>, [key, value]) => {
            // Check if value is a direct object or a MongoDB query object
            let enforcedTypeCast = castType;
            if (enforceTypeCast) {
              if (enforceTypeCast[key]) {
                enforcedTypeCast = enforceTypeCast[key];
              }
            }
            if (
              SchemaCastTypes.includes(enforcedTypeCast) &&
              typeof this.typeCasters[enforcedTypeCast as keyof TypeCasters] ===
                "function"
            ) {
              if (
                typeof value === "object" &&
                value !== null &&
                !Array.isArray(value)
              ) {
                Object.entries(
                  value as Record<string, unknown> | ArrayLike<unknown>,
                ).forEach(([queryKey, queryValue]) => {
                  const castedValue =
                    this.typeCasters[
                      String(enforcedTypeCast) as keyof TypeCasters
                    ](queryValue);
                  if (!acc[key]) acc[key] = {};
                  acc[key][queryKey] = castedValue;
                });
              } else {
                acc[key] =
                  this.typeCasters[
                    String(enforcedTypeCast) as keyof TypeCasters
                  ](value);
              }
            } else {
              acc[key] = value;
            }
            return acc;
          },
          {},
        );
      } else if (typeof result === "boolean") {
        return Boolean(result);
      } else if (typeof result === "number") {
        return Number(result);
      } else {
        return String(result); // enforce string type
      }
    });
  }

  private async runAdapter(
    operator: string,
    valueArray: string[],
    castType: string | any,
  ): Promise<Record<string, object> | string> {
    const result = await this.isolatedVmContext.eval(`
    (function() {
      const formattedValue1 = formatValue(${JSON.stringify(
        valueArray[0],
      )}, groupedContext);
      const formattedValue2 = formatValue(${JSON.stringify(
        valueArray[1],
      )}, groupedContext);

      const query = __adapterClass__.apply(
        undefined,
        ["${operator}","${castType}", formattedValue1, formattedValue2],
        {
          arguments: { copy: true },
        }
        );
      return JSON.stringify(query); //make transferable
    })()
    `);

    return JSON.parse(result as string); // quick hack to pass thru the sandbox
  }

  private async runCondition(
    operator: string,
    valueArray: string[],
  ): Promise<boolean> {
    const result = await this.isolatedVmContext.eval(`
    (function() {
    const formattedValue1 = formatValue(${JSON.stringify(
      valueArray[0],
    )}, groupedContext);
    const formattedValue2 = formatValue(${JSON.stringify(
      valueArray[1],
    )}, groupedContext);

    return  (__operatorsClass__.apply(
      undefined,
      ["${operator}", formattedValue1, formattedValue2],
      {
        arguments: { copy: true },

      }
    ));
    })()
    `);
    return result;
  }
}
export default Condition;
