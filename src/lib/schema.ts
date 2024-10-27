import {
  SchemaGlobalKeys,
  SchemaConditionKeys,
  SchemaOperators,
  SchemaConditionValues,
  SchemaConditionsOnlyOperators,
} from "../constants";
import {
  type ArgumentSchema,
  type ConditionSchema,
  type ConditionEnforceSchema,
  type RootSchema,
  type validatedDataObjects,
} from "../types/custom";

// import type CompiledSchemaObject from "./compiledSchema";
import Ajv from "ajv";
import _get from "lodash/get";
import _set from "lodash/set";
// import _merge from "lodash/merge";
interface SchemaVariable {
  type: "string" | "number" | "boolean" | "array";
  required?: boolean;
  description?: string;
}
class Schema {
  constructor(options: { prefix: string } = { prefix: "" }) {
    this.schema = {};
    this.compiledSchema = null;
    this.ajv = new Ajv();
    this.schemaPrefix = options.prefix;
  }

  private readonly schemaPrefix: string;
  private readonly ajv: Ajv;
  public schema: RootSchema;
  public compiledSchema: RootSchema | null;
  public validateSchema(schema: RootSchema): RootSchema {
    this.validateSchemaObject(schema, []);
    return schema;
  }

  public schemaHasLoaded(): boolean {
    return this.compiledSchema !== null;
  }

  private returnSchemaSectionPrototype(
    type: string,
    isEndpoint: boolean,
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

  private returnSchemaFilePrototype(fileName: string): object {
    return {
      fromFile() {
        return fileName;
      },
    };
  }

  public returnSchema(): RootSchema {
    return this.schema;
  }

  private validateSchemaObject(schema: RootSchema, path: string[]): RootSchema {
    const keys = Object.keys(schema as Record<string, any>);

    keys.forEach((key: string) => {
      const currentPath = [...path, key];
      const value = schema[key];

      if (SchemaGlobalKeys.includes(key)) {
        this.validateGlobalKey(value, key);

        if (
          typeof value === "object" &&
          value !== null &&
          !Array.isArray(value)
        ) {
          Object.setPrototypeOf(
            value,
            this.returnSchemaSectionPrototype(key, true),
          );
        }
        return;
      }

      if (typeof value === "object" && value !== null) {
        const isEndpoint = Object.keys(value).includes("Type");

        if (isEndpoint) {
          if (
            !Array.isArray(value.Type) ||
            (!value.Type.includes("Action") &&
              !value.Type.includes("Ressource"))
          ) {
            throw new Error(
              `Missing or invalid 'Type' key at: ${currentPath.join(":")}`,
            );
          }

          Object.setPrototypeOf(
            value,
            this.returnSchemaSectionPrototype(key, true),
          );

          // Check for nested endpoints which are not allowed
          const nestedKeys = Object.keys(value);
          const hasNestedEndpoints = nestedKeys.some(
            (subKey) => !SchemaGlobalKeys.includes(subKey),
          );
          if (hasNestedEndpoints) {
            const nestedKey = nestedKeys.filter(
              (subKey) => !SchemaGlobalKeys.includes(subKey),
            );
            throw new Error(
              `Nested endpoints are not allowed at: ${String(
                currentPath.join(":"),
              )} for key: ${String(nestedKey)}`,
            );
          }
        } else {
          if (Object.keys(value).length === 0) {
            throw new Error(`Empty object at: ${currentPath.join(":")}`);
          }
          schema[key] = Object.setPrototypeOf(
            this.validateSchemaObject(
              schema[key] as unknown as RootSchema,
              currentPath,
            ),
            this.returnSchemaSectionPrototype(key, false),
          );
          this.validateSchemaObject(value, currentPath);
        }
      }
    });

    return schema;
  }

  private validateSchemaVariables(
    variables: Record<string, SchemaVariable>,
  ): boolean {
    for (const [key, value] of Object.entries(variables)) {
      if (
        !value.type ||
        !["string", "number", "boolean", "array"].includes(value.type)
      ) {
        throw new Error(
          `Invalid variable type for ${key}. Must be one of: string, number, boolean, array`,
        );
      }
    }
    return true;
  }

  private validateGlobalKey(value: any, key: string): any {
    switch (key) {
      case "Arguments":
        return this.validateSchemaArguments(value as unknown as ArgumentSchema);

      case "Condition":
        return this.validateSchemaCondition(value as ConditionSchema);
      case "Type":
        if (!this.validateSchemaType(value)) {
          throw new Error(`Invalid Type value for global key: ${key}`);
        }
        return value;
      case "Variables":
        return this.validateSchemaVariables(
          value as Record<string, SchemaVariable>,
        );
      default:
        return value;
    }
  }

  private validateSchemaType(value: any): boolean {
    return (
      Array.isArray(value) &&
      ["Action", "Ressource"].some((i) => value.includes(i))
    ); // Placeholder return, adjust according to actual validation logic
  }

  private validateSchemaArguments(
    schemaArguments: ArgumentSchema,
  ): ArgumentSchema {
    Object.keys(schemaArguments as Record<string, any>).forEach((key) => {
      if (
        schemaArguments[key].type !== "string" &&
        schemaArguments[key].type !== "number"
      ) {
        throw new Error(`Invalid schema argument type for: ${key}`);
      }
    });

    return schemaArguments;
  }

  private validateSchemaCondition(
    schemaCondition: ConditionSchema,
  ): ConditionSchema {
    Object.keys(schemaCondition).forEach((key: string) => {
      if (!SchemaConditionKeys.includes(key)) {
        throw new Error(`Invalid schema condition key: ${key}`);
      }
      if (key === "Operators" || key === "ContextOperators") {
        schemaCondition[key]?.forEach((operator: string) => {
          if (
            key === "Operators" &&
            !SchemaOperators.includes(operator) &&
            !SchemaConditionsOnlyOperators.includes(operator)
          ) {
            throw new Error(
              `Invalid schema condition operator: ${operator} for ${key}`,
            );
          } else if (
            key === "ContextOperators" &&
            !SchemaOperators.includes(operator)
          ) {
            throw new Error(
              `Invalid schema context operator: ${operator} for ${key}`,
            );
          }
        });
      } else {
        if (typeof schemaCondition[key] !== "object") {
          throw new Error(`Invalid schema condition value for: ${key}`);
        }

        const conditionValues = Object.keys(
          schemaCondition[key] as ConditionEnforceSchema,
        );
        conditionValues.forEach((operators: string) => {
          const splitOperators = operators.split(":");
          if (
            splitOperators.length > 3 ||
            !SchemaConditionValues.every((i) =>
              SchemaConditionValues.includes(i),
            )
          ) {
            throw new Error(`Invalid schema operator: ${operators} for ${key}`);
          }
        });
      }
    });
    return schemaCondition;
  }

  private mergeSchemaObjects(
    obj1: Record<string, any>,
    obj2: Record<string, any>,
    fileName: string,
  ): Record<string, any> {
    Object.keys(obj2).forEach((key) => {
      // Ensure prototype is set for new keys in obj1
      if (
        !Object.prototype.hasOwnProperty.call(obj1, key) &&
        this.returnSchemaFilePrototype(fileName)
      ) {
        Object.setPrototypeOf(
          obj2[key],
          this.returnSchemaFilePrototype(fileName),
        );
      }

      if (Array.isArray(obj1[key]) && Array.isArray(obj2[key])) {
        // Combine arrays without duplicates
        obj1[key] = Array.from(new Set([...obj1[key], ...obj2[key]]));
      } else if (this.isObject(obj1[key]) && this.isObject(obj2[key])) {
        // Recursively merge objects
        obj1[key] = this.mergeSchemaObjects(
          obj1[key] as Record<string, any>,
          obj2[key] as Record<string, any>,
          fileName,
        );
      } else {
        // For non-overlapping keys or primitive values, simply set/overwrite with obj2's value
        obj1[key] = obj2[key];
      }
    });

    return obj1;
  }

  private isObject(item: any): boolean {
    return item && typeof item === "object" && !Array.isArray(item);
  }

  public compileSchema(schemaMap: Map<string, RootSchema>): any {
    let mergedSchema = {};

    schemaMap.forEach((value, key: string) => {
      mergedSchema = this.mergeSchemaObjects(mergedSchema, value, key);
    });
    if (this.schemaPrefix !== "") {
      mergedSchema = {
        [String(this.schemaPrefix)]: mergedSchema,
      };
    }
    this.schema = mergedSchema;
    this.compiledSchema = mergedSchema;
  }

  public castObjectsToSchemaTypes(
    validationSchema: Record<string, any>,
    req: object,
    user: object,
    context: object,
    variables: Record<string, unknown>,
    options: {
      validateData: boolean;
    },
  ): validatedDataObjects {
    const data = { req, user, context };

    if (!options.validateData) {
      return { ...data, variables };
    }
    validationSchema.additionalProperties = false;

    const validate = this.ajv.compile(
      Object.setPrototypeOf(validationSchema, Object),
    );

    const valid = validate(data);
    if (!valid) {
      throw new Error(`Invalid data`);
    }
    return { ...data, variables };
  }

  private readonly validationFunctions: Record<string, (obj: any) => boolean> =
    {
      Type: (obj) => this.validateSchemaType(obj),
      Arguments: (obj) =>
        this.validateSchemaArguments(obj as ArgumentSchema) !== null,
      Condition: (obj) =>
        this.validateSchemaCondition(obj as ConditionSchema) !== null,
      Variables: () => true, // Assuming no validation needed; adjust as necessary
      // Add other section validations as needed
    };

  private reValidateSchema(
    path: string,
    targetKey: string,
    testObject: any,
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
        `No validation function found for section: ${sectionName} at path: ${path}`,
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
          ", ",
        )} are modifiable.`,
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
            `Cannot unset property from an array at path: ${path}`,
          );
        }

        if (!(keyToRemove in parentObject[targetKey])) {
          console.error(
            `Key ${keyToRemove} not found in object at path: ${path}.`,
          );
          return; // Key not found, no operation performed
        }
        // eslint-disable-next-line
        delete parentObject[targetKey][keyToRemove];

        if (!this.reValidateSchema(parentPath, targetKey, parentObject)) {
          throw new Error(
            `Validation failed after unsetting key from path: ${path}`,
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

        const included = currentArray.includes(elementName);
        if (!included) {
          console.error(
            `Element named ${elementName} not found in array at path: ${path}.`,
          );
          return false; // Element not found, removal not performed
        }
        const index = currentArray.indexOf(elementName);
        currentArray.splice(index, 1);

        const testObject = _get(
          this.schema,
          path.split(".").slice(0, -1).join("."),
          {},
        ) as Record<string, any>;
        testObject[path.split(".").pop() ?? ""] = currentArray;

        if (
          !this.reValidateSchema(path, path.split(".").pop() ?? "", testObject)
        ) {
          throw new Error(
            `Validation failed after removing element from path: ${path}`,
          );
        }

        _set(this.schema, path, currentArray);
      },
    };
  }

  public getSchema(): RootSchema | boolean {
    if (!this.compiledSchema) {
      return false;
    }
    return this.compiledSchema;
  }
}
export default Schema;
