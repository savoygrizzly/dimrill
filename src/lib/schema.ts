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
        if (!this.validateSchemaType(value)) {
          throw new Error(`Invalid Type value for global key: ${key}`);
        }
        return value;
        break;
      default:
        return value;
    }
  }

  private validateSchemaType(value: any): boolean {
    // Add logic to handle validation when 'value' is an array

    return (
      Array.isArray(value) &&
      ["Action", "Ressource"].some((i) => value.includes(i))
    ); // Placeholder return, adjust according to actual validation logic
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

  private readonly validationFunctions: Record<string, (obj: any) => boolean> =
    {
      Type: (obj) => this.validateSchemaType(obj),
      Arguments: (obj) => this.validateSchemaArguments(obj) !== null,
      Condition: (obj) => this.validateSchemaCondition(obj) !== null,
      Variables: () => true, // Assuming no validation needed; adjust as necessary
      // Add other section validations as needed
    };

  private reValidateSchema(
    path: string,
    targetKey: string,
    testObject: any
  ): boolean {
    // Early return if the validation function for the targetKey doesn't exist,
    // indicating that no validation is needed for this key.
    if (!this.validationFunctions[targetKey]) {
      console.error(`Validation function for ${targetKey} is not defined.`);
      return false;
    }

    // Determine the sectionName. If the targetKey directly maps to a validation function,
    // use it; otherwise, try to derive sectionName from the testObject.
    const sectionName =
      targetKey === "Type" ||
      !testObject[targetKey] ||
      typeof testObject[targetKey].sectionName !== "function"
        ? targetKey
        : testObject[targetKey].sectionName();

    // Fetch the validation function based on the determined sectionName.
    const validate = this.validationFunctions[sectionName];
    if (!validate) {
      console.error(
        `No validation function found for section: ${sectionName} at path: ${path}`
      );
      return false;
    }

    // Call the validation function with the part of the testObject to validate.
    // Adjust the argument as necessary based on how your validation functions are designed to work.
    // If they expect the whole testObject, pass testObject. If they expect just the target section, pass testObject[targetKey].
    return validate(testObject[targetKey] || testObject);
  }

  public extendSchema(path: string): {
    set: (value: string | string[] | object) => void;
    unset: (value: string | string[] | object) => void;
    push: (value: string | string[]) => void;
    remove: (value: string | string[]) => void;
  } {
    const pathSections = path.split(".");
    const targetKey = pathSections[pathSections.length - 1];
    const parentPath = pathSections.slice(0, -1).join(".");
    // Assuming validEndpoints includes keys that are allowed to be endpoints.
    const validEndpoints = ["Type", "Arguments", "Condition", "Variables"];

    if (!validEndpoints.includes(targetKey)) {
      throw new Error(
        `Invalid endpoint: ${targetKey}. Only ${validEndpoints.join(
          ", "
        )} are modifiable.`
      );
    }

    return {
      set: (value: any) => {
        const parentObject = _get(this.schema, parentPath, {});
        const testObject = { ...parentObject, [targetKey]: value };

        if (!this.reValidateSchema(parentPath, targetKey, testObject)) {
          throw new Error(`Validation failed for path: ${path}`);
        }

        _set(this.schema, path, value);
      },
      unset: (keyToRemove: any) => {
        const parentPath = pathSections.slice(0, -1).join(".");

        const parentObject = _get(this.schema, parentPath);

        if (Array.isArray(parentObject[targetKey])) {
          throw new Error(
            `Cannot unset property from an array at path: ${path}`
          );
        }

        if (!(keyToRemove in parentObject[targetKey])) {
          console.error(
            `Key ${keyToRemove} not found in object at path: ${path}.`
          );
          return; // Key not found, no operation performed
        }

        delete parentObject[targetKey][keyToRemove];

        if (!this.reValidateSchema(parentPath, targetKey, parentObject)) {
          throw new Error(
            `Validation failed after unsetting key from path: ${path}`
          );
        }

        _set(this.schema, parentPath, parentObject);
      },
      push: (value: any) => {
        const existingArray = _get(this.schema, path);
        if (!Array.isArray(existingArray)) {
          throw new Error(`Target is not an array at path: ${path}`);
        }

        const newArrayValue = [
          ...existingArray,
          ...(Array.isArray(value) ? value : [value]),
        ];

        const testObject = {
          ..._get(this.schema, parentPath, {}),
          [targetKey]: newArrayValue,
        };

        if (!this.reValidateSchema(parentPath, targetKey, testObject)) {
          throw new Error(`Validation failed for path: ${path}`);
        }

        _set(this.schema, path, newArrayValue);
      },
      remove: (elementName: any) => {
        const currentArray = _get(this.schema, path);
        if (!Array.isArray(currentArray)) {
          throw new Error(`Target at path: ${path} is not an array.`);
        }

        const index = currentArray.indexOf(elementName);
        if (index === -1) {
          console.error(
            `Element named ${elementName} not found in array at path: ${path}.`
          );
          return false; // Element not found, removal not performed
        }

        currentArray.splice(index, 1);

        const testObject = _get(
          this.schema,
          path.split(".").slice(0, -1).join("."),
          {}
        ) as Record<string, any>;
        testObject[path.split(".").pop() || ""] = currentArray;

        if (
          !this.reValidateSchema(path, path.split(".").pop() || "", testObject)
        ) {
          throw new Error(
            `Validation failed after removing element from path: ${path}`
          );
        }

        _set(this.schema, path, currentArray);
      },
    };
  }
}
export default Schema;
