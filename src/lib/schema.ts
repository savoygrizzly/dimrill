import {
  SchemaGlobalKeys,
  SchemaConditionKeys,
  SchemaOperators,
  SchemaConditionValues,
} from "../constants";
import util from "util";
import {
  type ArgumentSchema,
  type ConditionSchema,
  type ConditionEnforceSchema,
  type RootSchema,
  type PathSchema,
  type VariableSchema,
  type validatedDataObjects,
} from "../types/custom";

import CompiledSchemaObject from "./compiledSchema";
import Ajv from "ajv";
import _get from "lodash/get";
import _set from "lodash/set";
class Schema {
  constructor() {
    this.schema = {};
    this.compiledSchema = null;
    this.ajv = new Ajv();
  }

  private readonly ajv: Ajv;
  public schema: RootSchema;
  public compiledSchema: CompiledSchemaObject | null;
  public validateSchema(schema: RootSchema): RootSchema {
    this.validateSchemaObject(schema, []);
    return schema;
  }

  private validateSchemaObject(schema: RootSchema, path: string[]): void {
    const keys = Object.keys(schema as Record<string, any>);
    const hasNestedObjects = keys.some(
      (key) => typeof schema[key] === "object" && schema[key] !== null
    );

    keys.forEach((key: string) => {
      const currentPath = [...path, key];

      if (SchemaGlobalKeys.includes(key)) {
        this.validateGlobalKey(schema[key], key);
        return; // Move to the next key
      }

      if (typeof schema[key] === "object" && schema[key] !== null) {
        this.validateSchemaObject(
          schema[key] as unknown as RootSchema,
          currentPath
        );
      } else {
        throw new Error(`Invalid schema path: ${currentPath.join(":")}`);
      }
    });

    // Check for 'Type' key at endpoints when no nested objects are present
    if (!hasNestedObjects && !("Type" in schema)) {
      throw new Error(`Missing 'Type' key at endpoint: ${path.join(":")}`);
    }
  }

  private validateGlobalKey(value: any, key: string): void {
    switch (key) {
      case "Arguments":
        this.validateSchemaArguments(value as unknown as ArgumentSchema);
        break;
      case "Condition":
        this.validateSchemaCondition(value as ConditionSchema);
        break;
      case "Type":
        if (
          !Array.isArray(value) ||
          ["Action", "Ressource"].some((i) => !value.includes(i))
        ) {
          throw new Error(`Invalid Type value for global key: ${key}`);
        }
        break;
      default:
    }
  }

  private validateSchemaArguments(
    schemaArguments: ArgumentSchema
  ): ArgumentSchema {
    Object.keys(schemaArguments as Record<string, any>).forEach((key) => {
      if (
        schemaArguments[key].type !== "string" &&
        schemaArguments[key].type !== "number"
      ) {
        throw new Error(`Invalid schema argument type for: ${key}`);
      }
      if (schemaArguments[key].dataFrom === null) {
        throw new Error(`Missing schema argument dataFrom for: ${key}`);
      }
    });
    return schemaArguments;
  }

  private validateSchemaCondition(
    schemaCondition: ConditionSchema
  ): ConditionSchema {
    Object.keys(schemaCondition).forEach((key: string) => {
      if (!SchemaConditionKeys.includes(key)) {
        throw new Error(`Invalid schema condition key: ${key}`);
      }
      if (key === "Operators" || key === "ContextOperators") {
        schemaCondition[key]?.forEach((operator: string) => {
          if (!SchemaOperators.includes(operator)) {
            throw new Error(`Invalid schema operator: ${operator} for ${key}`);
          }
        });
      } else {
        if (typeof schemaCondition[key] !== "object") {
          throw new Error(`Invalid schema condition value for: ${key}`);
        }

        const conditionValues = Object.keys(
          schemaCondition[key] as ConditionEnforceSchema
        );
        conditionValues.forEach((operators: string) => {
          const splitOperators = operators.split(":");
          if (
            splitOperators.length > 3 ||
            !SchemaConditionValues.every((i) =>
              SchemaConditionValues.includes(i)
            )
          ) {
            throw new Error(`Invalid schema operator: ${operators} for ${key}`);
          }
        });
      }
    });
    return schemaCondition;
  }

  public compileSchema(schemaMap: Map<string, RootSchema>): any {
    const mergedSchema = new CompiledSchemaObject("global");

    schemaMap.forEach((value, key) => {
      const compiledSchema = new CompiledSchemaObject(key);
      compiledSchema.assign(value);

      // Merge the modified schema into the mergedSchema object
      mergedSchema.assign(compiledSchema);
    });
    this.schema = mergedSchema.schema;
    this.compiledSchema = mergedSchema;
  }

  public castObjectsToSchemaTypes(
    validationSchema: Record<string, any>,
    req: object,
    user: object,
    context: object
  ): validatedDataObjects {
    // Force the removal of the properties that are not in the schema
    validationSchema.additonalProperties = false;
    const validate = this.ajv.compile(validationSchema);
    const data = { req, user, context };
    const valid = validate(data);
    if (!valid) {
      throw new Error(`Invalid data`);
    }
    return data;
  }

  public extendSchema(path: string): {
    set: (value: string | string[] | object) => void;
    push: (value: string | string[]) => void;
  } {
    const objectAtPath = _get(this.schema, path);
    return {
      set: (value: string | string[] | object) => {
        if (objectAtPath !== undefined) {
          console.log(path, value);
          _set(this.schema, path, value);
          console.log(util.inspect(this.schema, false, null, true));
        }
      },
      push: (value: string | string[]) => {
        if (objectAtPath !== undefined && Array.isArray(objectAtPath)) {
          const newArray = [
            ...objectAtPath,
            ...(Array.isArray(value) ? value : [value]),
          ];
          _set(this.schema, path, newArray);
          console.log(util.inspect(this.schema, false, null, true));
        }
      },
    };
  }
}
export default Schema;
