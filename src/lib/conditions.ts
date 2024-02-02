import { type ConditionSchema, type StatementCondition } from "../types/custom";
import {
  SchemaGlobalKeys,
  SchemaConditionKeys,
  SchemaOperators,
  SchemaConditionValues,
} from "../constants";
import ivm from "isolated-vm";
import * as operators from "./operators/operators";
import Policies from "./policies";
class Condition {
  constructor(
    options = {
      adapter: "mongodb",
    }
  ) {
    this.options = options;
  }

  private isolatedVmContext: any;
  private readonly options: {
    adapter: string;
  };

  public setVm(context: any): void {
    this.isolatedVmContext = context;
  }

  public unsetVm(): void {
    this.isolatedVmContext = null;
  }

  public async runConditions(
    condition: StatementCondition | undefined,
    schema: ConditionSchema
  ) {
    if (!condition) return;
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

        return await this.processCondition(mainOperator, otherModifiers, value);
      })
    );
    console.log(results);
    return results;
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

  private async castStringLiteral(val: string): Promise<any> {
    console.log(val);
    if (typeof val === "string" && val.startsWith("${") && val.endsWith("}")) {
      val = await this.isolatedVmContext.eval("`" + val + "`");
    }
    console.log("valueval", val);
    return val;
  }

  private async runCondition(
    operator: string,
    valueArray: string[]
  ): Promise<boolean> {
    /*
      SOOO fucking uuugly
    const jail = this.isolatedVmContext.global;
    await jail.set(
      "_leftCondVar",
      new ivm.ExternalCopy(valueArray[0]).copyInto()
    );
    await jail.set(
      "_rightCondVar",
      new ivm.ExternalCopy(valueArray[1]).copyInto()
    );
    await jail.set("global", jail.derefInto());
    */
    valueArray[0] = await this.castStringLiteral(valueArray[0]);
    valueArray[1] = await this.castStringLiteral(valueArray[1]);

    const result = await this.isolatedVmContext.eval(`
      (function() {
        function formatValue(value) {
          
          let parsedValue;
          try {
            // Attempt to parse the value
            parsedValue = JSON.parse(value);
          } catch (e) {
            // If parsing fails, use the original value
            parsedValue = value;
          }
         
          if (typeof parsedValue === 'string') {
            // Check if it seems to be a template literal expression
            if (parsedValue.startsWith('$') && parsedValue.endsWith('}')) {
              // Process as a template literal
              return '(' + parsedValue + ')';
            } else {
              // Regular string
              return '"' + parsedValue.replace(/"/g, '\\\\"') + '"';
            }
          } else if (Array.isArray(parsedValue)) {
            // Process each element of the array
            return '[' + parsedValue.map(v => formatValue(JSON.stringify(v))).join(',') + ']';
          } else {
            // Numbers, booleans, and other types
            return parsedValue;
          }
        }
    
        const formattedValue1 = formatValue(${valueArray[0]});
        
       
        const formattedValue2 = formatValue(${valueArray[1]});
   
    
        return __operatorsClass__.apply(
          undefined, 
          ["${operator}", formattedValue1, formattedValue2],
          {
            arguments: { copy: true },
            result: { promise: true },
          }
        );
      })()
    `);

    return result;
  }
}
export default Condition;
