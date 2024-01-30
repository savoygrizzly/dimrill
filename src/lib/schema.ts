import { remove } from "lodash";
import {
  SchemaGlobalKeys,
  SchemaConditionKeys,
  SchemaOperators,
} from "../constants";

import {
  type ArgumentSchema,
  type ConditionSchema,
  type RootSchema,
  type PathSchema,
  type VariableSchema,
  type validatedDataObjects,
} from "../types/custom";

import Ajv from "ajv";
import _get from "lodash/get";
class Schema {
  constructor() {
    this.schema = {};
    this.ajv = new Ajv();
  }

  private readonly ajv: Ajv;
  private readonly schema: RootSchema;

  public validateSchema(schema: RootSchema): RootSchema {
    this.validateSchemaObject(schema, []);
    return schema;
  }

  private validateSchemaObject(schema: RootSchema, path: string[]): void {
    Object.keys(schema as Record<string, any>).forEach((key: string) => {
      const currentPath = [...path, key];

      if (SchemaGlobalKeys.includes(key)) {
        if (key === "Arguments") {
          this.validateSchemaArguments(
            schema[key] as unknown as ArgumentSchema
          );
        }
        if (key === "Condition") {
          this.validateSchemaCondition(schema[key] as ConditionSchema);
        }
        console.log("found key");
      } else {
        // If key is not a global key, it's assumed to be a path. Recursively validate the nested object.
        if (typeof schema[key] === "object" && schema[key] !== null) {
          this.validateSchemaObject(
            schema[key] as unknown as RootSchema,
            currentPath
          );
        } else {
          // If we reach a non-object without hitting a known global key, it's an invalid path.
          throw new Error(`Invalid schema path: ${currentPath.join(":")}`);
        }
      }
    });

    // If at the end of a path, check for necessary definitions like Arguments or Condition
    if (path.length > 0 && !SchemaGlobalKeys.some((key) => key in schema)) {
      throw new Error(
        `Incomplete schema definition at path: ${path.join(
          ":"
        )}. Expected keys like 'Arguments' or 'Condition' are missing.`
      );
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
      if (schemaArguments[key].type === "string") {
        if (schemaArguments[key].enum !== null) {
          throw new Error(`Invalid schema argument enum for: ${key}`);
        }
      }
    });
    return schemaArguments;
  }

  private validateSchemaCondition(
    schemaCondition: ConditionSchema
  ): ConditionSchema {
    Object.keys(schemaCondition as Record<string, any>).forEach(
      (key: string) => {
        if (!SchemaConditionKeys.includes(key)) {
          throw new Error(`Invalid schema condition key: ${key}`);
        }
        schemaCondition[key].forEach((operator: string) => {
          if (!SchemaOperators.includes(operator)) {
            throw new Error(`Invalid schema operator: ${operator} for ${key}`);
          }
        });
      }
    );
    return schemaCondition;
  }

  public matchDrnaFromSchema(drna: string[]): object | boolean {
    if (drna.length < 2) {
      return false; // DRNA must have at least two parts: Type and the path
    }
    const type = drna[0];
    const drnaPath = drna[1].split(":");
    /* remove params and wildcard from the last path */

    let currentSchema: RootSchema | PathSchema = this.schema;

    for (const part of drnaPath) {
      if (typeof currentSchema === "object" && part in currentSchema) {
        const nextSchema: RootSchema | PathSchema = currentSchema[part];
        if (typeof nextSchema === "object") {
          currentSchema = nextSchema;
        } else {
          return false;
        }
      } else {
        return false;
      }
    }
    if ((currentSchema.Type as string[]).includes(type)) {
      return currentSchema;
    } else {
      return false;
    }
  }

  public castObjectsToSchemaTypes(
    schema: Record<string, any>,
    req: object,
    user: object,
    context: object
  ): validatedDataObjects {
    // Force the removal of the properties that are not in the schema
    schema.additonalProperties = false;
    const validate = this.ajv.compile(schema);
    const data = { req, user, context };
    const valid = validate(data);
    if (!valid) {
      throw new Error(`Invalid schema: `);
    }
    return data;
  }

  private sanitizeDrnaString(drna: string): string {
    return String(drna).replace(/\./g, "-").replace(/\s/g, "-");
  }

  public matchParametersToSchema(
    injectedDrnaParams: Map<string, string>,
    schema: PathSchema,
    validatedObjects: object,
    options = {
      allowWildcards: false,
    }
  ): Record<string, string | number | undefined> {
    const parameters: Record<string, string | number | undefined> = {};
    // iterate over the schema arguments
    Object.keys(schema.Arguments).forEach((key) => {
      // if the arfument is in injectedDrnaParams
      if (injectedDrnaParams.has(key)) {
        // add the value to the parameters object
        parameters[key] = injectedDrnaParams.get(key);
        if (schema.Arguments[key].type === "number") {
          parameters[key] = Number(injectedDrnaParams.get(key));
        } else {
          if (
            schema.Arguments[key].enum?.includes(
              String(injectedDrnaParams.get(key))
            ) === true ||
            (options.allowWildcards &&
              String(injectedDrnaParams.get(key)) === "*")
          ) {
            parameters[key] = String(injectedDrnaParams.get(key));
          }
        }
      } else {
        // if the argument is not in injectedDrnaParams
        // add the default value to the parameters object
        const validatedObjectValue = _get(
          validatedObjects,
          schema.Arguments[key].dataFrom,
          false
        );
        if (
          validatedObjectValue &&
          (schema.Arguments[key].type === "number" ||
            (schema.Arguments[key].type === "string" &&
              schema.Arguments[key].enum?.includes(
                String(validatedObjectValue)
              ) === true))
        ) {
          parameters[key] = _get(
            validatedObjects,
            schema.Arguments[key].dataFrom
          );
        }
      }
    });
    return parameters;
  }

  public mapInjectedParams(
    drnaParams: string[],
    options = {
      removeWildcards: false,
    }
  ): Map<string, string> {
    const injectedDrnaParams = new Map<string, string>(
      drnaParams
        .map((param) => {
          const [key, value] = param.split("/");
          return [key, value] as [string, string]; // Return as an entry for the Map
        })
        .filter((param) => {
          if (options.removeWildcards) {
            return param[0] !== "*";
          }
          return param;
        })
    );

    return injectedDrnaParams;
  }

  public synthetizeDrnaFromSchema(
    drna: string,
    schema: PathSchema,
    validatedObjects: object
  ): string {
    // match the schema arguments with the request, user and context objects
    // return the drna with the arguments values

    const sanitizedDrna = this.sanitizeDrnaString(drna).split("&");

    const parameters = this.matchParametersToSchema(
      this.mapInjectedParams(sanitizedDrna.slice(1)),
      schema,
      validatedObjects
    );

    // join the parameters to the drna
    const drnaWithParams = Object.keys(parameters).reduce((acc, key) => {
      return `${acc}&${key}/${parameters[key]}`;
    }, sanitizedDrna[0]);
    console.log(drnaWithParams);

    return drnaWithParams;
  }
}
export default Schema;
