import { type ConditionSchema, type StatementCondition } from "../types/custom";
import {
  SchemaGlobalKeys,
  SchemaConditionKeys,
  SchemaOperators,
  SchemaConditionValues,
} from "../constants";
import * as operators from "./operators/operators";
import Policies from "./policies";
class Condition extends Policies {
  constructor(
    options = {
      adapter: "mongodb",
    }
  ) {
    super();
    this.options = options;
  }

  private readonly options: {
    adapter: string;
  };

  public async runConditions(
    condition: StatementCondition,
    schema: ConditionSchema
  ) {
    if (schema.Enforce !== undefined) {
      condition = { ...condition, ...schema.Enforce };
    }
    const results = await Promise.all(
      Object.entries(condition).map(async ([key, value]) => {
        const keys = key.split(":");
        const [mainOperator, ...otherModifiers] = keys.filter((k) =>
          SchemaOperators.includes(k)
        );

        if (!mainOperator || keys.length > 3) {
          throw new Error(`Invalid condition key: ${key}`);
        }

        await this.processCondition(mainOperator, otherModifiers, value);
      })
    );

    // Process results
    // ...
  }

  private async processCondition(
    mainOperator: string,
    modifiers: string[],
    values: object
  ): Promise<{
    valid: boolean;
    query: object | string;
  }> {
    const isQuery = modifiers.includes("ToQuery");
    const returnValue = {
      valid: false,
      query: {},
    };
    if (isQuery) {
      returnValue.valid = true;
      // this.transformToQueryCondition(mainOperator, value);
    } else {
      const results = await Promise.all(
        Object.entries(values).map(async (variables) => {
          return await this.runCondition(mainOperator, variables);
        })
      );
      // Process results
      if (modifiers.includes("AnyValues")) {
        returnValue.valid = results.filter((result) => result).length > 0;
      }
      returnValue.valid =
        results.filter((result) => result).length === results.length;
    }
    return returnValue;
  }

  private async runCondition(
    operator: string,
    valueArray: string[]
  ): Promise<boolean> {
    const result = await this.isolatedVmContext.eval(
      `
      ( 
        __operatorsClass__.apply(
          undefined, 
          [${operator}, ${valueArray[0]},${valueArray[1]}] 
          ,{
            arguments: { copy: true },
            result: { promise: true },
          }
        )
      )
      `
    );

    return result;
  }
}
export default Condition;
