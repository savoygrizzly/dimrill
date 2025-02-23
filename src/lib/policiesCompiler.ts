import type Schema from "./schema";
import type DRNA from "./drna";

import {
  type PathSchema,
  type StatementCondition,
  type Statement,
  type Policy,
  type _CompilationResults,
  type _CompilatorReturnFormat,
} from "../types/custom";
import { SchemaOperators, SchemaOperands, SchemaCastTypes } from "../constants";

class PoliciesCompiler {
  private readonly DRNA: DRNA;
  private readonly schema: Schema;
  constructor(DRNA: DRNA, Schema: Schema) {
    this.DRNA = DRNA;
    this.schema = Schema;
  }

  public compilePolicies(policies: Policy[]): Map<number, _CompilationResults> {
    const compilationResults = new Map<number, any>();
    policies.forEach((policy, index) => {
      compilationResults.set(index, this.compilePolicy(policy));
    });
    return compilationResults;
  }

  private compilePolicy(policy: Policy): {
    effects: string[];
    drna: _CompilatorReturnFormat[];
    conditions: _CompilatorReturnFormat[][];
  } {
    /*
        Try to get a schema from the policy path
    */
    const results: _CompilationResults = {
      effects: [],
      drna: [],
      conditions: [],
    };
    Object.values(policy.Statement).forEach((statement: Statement) => {
      Object.keys(statement).forEach((key: string) => {
        if (key === "Effect") {
          if (!["Allow", "Deny"].includes(statement[key])) {
            results.effects.push(`${String(statement[key])}: Invalid effect`);
          }
        } else if (key === "Condition") {
          const compiledConditions = this.compileCondition(
            statement[key] ?? {},
          );
          results.conditions.push(compiledConditions.filter((c) => !c.valid));
        } else if (
          (key === "Action" || key === "Ressource") &&
          statement[key]
        ) {
          statement[key]?.forEach((drna) => {
            const compiledDrna = this.compileDrna(key, drna);
            if (!compiledDrna.valid) {
              results.drna.push({
                valid: false,
                message: compiledDrna.message,
              });
            }
          });
        }
      });
    });
    return results;
  }

  private compileCondition(
    condition: StatementCondition,
  ): _CompilatorReturnFormat[] {
    const compiledConditions = Object.entries(condition).map(([key, value]) => {
      const keys = key.split(":");
      if (keys.length > 4) {
        return {
          valid: false,
          message: `${String(key)}: Condition has too many operators`,
        };
      }
      const modifiers = keys.filter(
        (k) =>
          SchemaOperators.includes(k) ||
          SchemaOperands.includes(k) ||
          SchemaCastTypes.includes(k) ||
          k === "ToQuery",
      );

      // Identify main operator, operand, ToQuery modifier, and castType
      const mainOperator = modifiers.find((modifier: string) =>
        SchemaOperators.includes(modifier),
      );

      if (!mainOperator) {
        return {
          valid: false,
          message: {
            [String(key)]: "Condition has no main operator.",
          },
        };
      }

      const mainOperatorCount = modifiers.filter((modifier) =>
        SchemaOperators.includes(modifier),
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
        return {
          valid: false,
          message: {
            [String(key)]: "Condition structure is invalid.",
          },
        };
      }
      return {
        valid: true,
        message: {
          [String(key)]: "Condition validation successful.",
        },
      };
    });
    return compiledConditions as _CompilatorReturnFormat[];
  }

  private compileDrna(drnaType: string, drna: string): _CompilatorReturnFormat {
    const schemaExists = this.DRNA.matchDrnaFromSchema(
      [drnaType, drna],
      this.schema.returnSchema(),
      { removeDynamicParameters: true },
    );

    if (schemaExists === false) {
      return {
        valid: false,
        message: {
          [String(drna)]: "DRNA not found in schema.",
        },
      };
    }
    try {
      this.DRNA.synthetizeDrnaFromSchema(drna, schemaExists as PathSchema, {
        req: {},
        user: {},
        context: {},
      });

      return {
        valid: true,
        message: {
          [String(drna)]: "DRNA validation successful.",
        },
      };
    } catch (error) {
      return {
        valid: false,
        message: {
          [String(drna)]: "DRNA validation failed.",
        },
      };
    }
  }
}
export default PoliciesCompiler;
