import _get from "lodash/get";

import {
  type ArgumentSchema,
  type ConditionSchema,
  type RootSchema,
  type PathSchema,
  type VariableSchema,
  type validatedDataObjects,
} from "../types/custom";

import Ajv from "ajv";
import Schema from "./schema";
class DRNA extends Schema {
  constructor() {
    super();
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
            schema.Arguments[key].enum === null ||
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
              schema.Arguments[key].enum === null) ||
            schema.Arguments[key].enum?.includes(
              String(validatedObjectValue)
            ) === true)
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
      removeWildcards: true,
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
  ): object {
    // match the schema arguments with the request, user and context objects
    // return the drna with the arguments values

    const sanitizedDrna = this.sanitizeDrnaString(drna).split("&");

    const parameters = this.matchParametersToSchema(
      this.mapInjectedParams(sanitizedDrna.slice(1)),
      schema,
      validatedObjects
    );

    // join the parameters to the drna

    return {
      drnaPaths: sanitizedDrna[0].split(":"),
      parameters,
    };
  }
}
export default DRNA;
