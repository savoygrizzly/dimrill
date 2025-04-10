import { ObjectId } from "bson";
import { VariableSchema } from "../types/custom";

export class Variables {
    public static castVariables(
        variables: Record<string, unknown>,
        schemaVariables: Record<string, VariableSchema>
    ): Record<string, unknown> {
        // Create a new variables object with cast values
        const castVariables: Record<string, unknown> = {};

        for (const [key, schema] of Object.entries(schemaVariables)) {
            if (schema.required && !(key in variables)) {
                throw new Error(`Required variable "${key}" is missing`);
            }
            if (key in variables) {
                const value = variables[key];
                switch (schema.type) {
                    case "string":
                        if (typeof value !== "string") {
                            throw new Error(`Variable "${key}" must be a string`);
                        }
                        castVariables[key] = value;
                        break;
                    case "number":
                        if (typeof value !== "number") {
                            throw new Error(`Variable "${key}" must be a number`);
                        }
                        castVariables[key] = value;
                        break;
                    case "boolean":
                        if (typeof value !== "boolean") {
                            throw new Error(`Variable "${key}" must be a boolean`);
                        }
                        castVariables[key] = value;
                        break;
                    case "array": // Treat as anyArray
                    case "anyArray":
                        if (!Array.isArray(value)) {
                            throw new Error(`Variable "${key}" must be an array`);
                        }
                        castVariables[key] = value; // No type check on elements for anyArray
                        break;
                    case "stringArray":
                        if (!Array.isArray(value) || !value.every(item => typeof item === 'string')) {
                            throw new Error(`Variable "${key}" must be an array of strings`);
                        }
                        castVariables[key] = value;
                        break;
                    case "numberArray":
                        if (!Array.isArray(value) || !value.every(item => typeof item === 'number')) {
                            throw new Error(`Variable "${key}" must be an array of numbers`);
                        }
                        castVariables[key] = value;
                        break;
                    case "objectId":
                        // First check if it's already an ObjectId
                        // @ts-expect-error inferring the type of value
                        if (ObjectId.isValid(value) && typeof value === "object" && value._bsontype === 'ObjectId') {
                            castVariables[key] = (value as ObjectId).toString();
                        } else if (typeof value === "string" && ObjectId.isValid(value)) {
                            // If it's a string and valid ObjectId format, convert it
                            castVariables[key] = new ObjectId(value).toString();
                        } else {
                            throw new Error(
                                `Variable "${key}" must be an ObjectId or valid ObjectId string`
                            );
                        }
                        break;
                    case "objectIdArray":
                        if (!Array.isArray(value)) {
                            throw new Error(
                                `Variable "${key}" must be an array of ObjectIds`
                            );
                        }
                        const objectIds = value.map((item) => {
                            if (ObjectId.isValid(item) && typeof item === "object" && item._bsontype === 'ObjectId') {
                                return (item as ObjectId).toString();
                            } else if (typeof item === "string" && ObjectId.isValid(item)) {
                                return new ObjectId(item).toString();
                            } else {
                                throw new Error(
                                    `All items in "${key}" must be ObjectIds or valid ObjectId strings`
                                );
                            }
                        });
                        castVariables[key] = objectIds;
                        break;
                    case "date":
                        if (value instanceof Date) {
                            castVariables[key] = value;
                        } else {
                            try {
                                const date = new Date(value as string | number);
                                if (isNaN(date.getTime())) {
                                    throw new Error(); // Will be caught below
                                }
                                castVariables[key] = date;
                            } catch {
                                throw new Error(
                                    `Variable "${key}" must be a Date or valid date string`
                                );
                            }
                        }
                        break;
                }
            }
        }
        return castVariables;
    }
}