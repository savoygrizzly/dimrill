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
    // console.log(util.inspect(schema, false, null, true));
    return schema;
  }

  private returnSchemaSectionPrototype(
    type: string,
    isEndpoint: boolean
  ): object {
    return {
      isEndpoint() {
        return isEndpoint;
      },
      sectionName() {
        return type;
      },
    };
  }

  public returnSchema(): RootSchema {
    return this.schema;
  }

  private validateSchemaObject(schema: RootSchema, path: string[]): RootSchema {
    const keys = Object.keys(schema as Record<string, any>);
    const hasNestedObjects = keys.some(
      (key) => typeof schema[key] === "object" && schema[key] !== null
    );

    keys.forEach((key: string) => {
      const currentPath = [...path, key];

      if (SchemaGlobalKeys.includes(key)) {
        schema[key] = this.validateGlobalKey(schema[key], key);

        if (
          typeof schema[key] === "object" &&
          !Array.isArray(schema[key]) &&
          schema[key] !== null
        ) {
          schema[key] = Object.setPrototypeOf(
            schema[key],
            this.returnSchemaSectionPrototype(key, false)
          );
        }
        return; // Move to the next key
      }

      if (typeof schema[key] === "object" && schema[key] !== null) {
        schema[key] = Object.setPrototypeOf(
          this.validateSchemaObject(
            schema[key] as unknown as RootSchema,
            currentPath
          ),
          this.returnSchemaSectionPrototype(key, false)
        );
      } else {
        throw new Error(`Invalid schema path: ${currentPath.join(":")}`);
      }
    });

    // Check for 'Type' key at endpoints when no nested objects are present
    if (!hasNestedObjects) {
      if (
        !schema.Type.includes("Action") &&
        !schema.Type.includes("Ressource")
      ) {
        throw new Error(`Missing 'Type' key at endpoint: ${path.join(":")}`);
      }
      schema = Object.setPrototypeOf(
        schema,
        this.returnSchemaSectionPrototype(path[path.length - 1], true)
      );
    }
    return schema;
  }

  private validateGlobalKey(value: any, key: string): any {
    switch (key) {
      case "Arguments":
        return this.validateSchemaArguments(value as unknown as ArgumentSchema);

        break;
      case "Condition":
        return this.validateSchemaCondition(value as ConditionSchema);
        break;
      case "Type":
        if (
          !Array.isArray(value) ||
          ["Action", "Ressource"].some((i) => !value.includes(i))
        ) {
          throw new Error(`Invalid Type value for global key: ${key}`);
        }
        return value;
        break;
      default:
        return value;
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
    context: object,
    options = {
      validateData: true,
    }
  ): validatedDataObjects {
    const data = { req, user, context };

    if (!options.validateData) {
      return data;
    }
    validationSchema.additionalProperties = false;

    const validate = this.ajv.compile(
      Object.setPrototypeOf(validationSchema, Object)
    );

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
          _set(this.schema, path, value);
        }
      },
      push: (value: string | string[]) => {
        if (objectAtPath !== undefined && Array.isArray(objectAtPath)) {
          const newArray = [
            ...objectAtPath,
            ...(Array.isArray(value) ? value : [value]),
          ];
          _set(this.schema, path, newArray);
        }
      },
    };
  }
}
export default Schema;
