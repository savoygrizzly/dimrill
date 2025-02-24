import { type RootSchema, type PathSchema, type VariableSchema } from "../types/custom";
import { ObjectId } from "bson";

interface LinterError {
    type: 'variable' | 'argument' | 'syntax';
    message: string;
    path?: string;
    expected?: string;
    received?: string;
    line?: number;
    column?: number;
}

interface SchemaDetails {
    variables?: Record<string, VariableSchema>;
    arguments?: Record<string, { type: string }>;
    conditions?: {
        queryEnforceTypeCast?: Record<string, string>;
        operators?: string[];
    };
    type?: string[];
}

export class DimrillLinter {
    private schema: RootSchema;

    constructor(schema: RootSchema) {
        this.schema = schema;
    }

    /**
     * Get schema details for a given DRNA path
     */
    public getSchemaDetails(path: string): SchemaDetails | null {
        const pathParts = path.split(':');
        let current = this.schema;

        // Navigate through schema
        for (const part of pathParts) {
            if (current[part]) {
                current = current[part];
            } else {
                return null;
            }
        }

        return {
            variables: (current as PathSchema).Variables,
            arguments: (current as PathSchema).Arguments as any,
            conditions: (current as PathSchema).Condition as any,
            type: (current as PathSchema).Type
        };
    }

    /**
     * Validate variables against schema
     */
    public validateVariables(path: string, variables: Record<string, unknown>): LinterError[] {
        const details = this.getSchemaDetails(path);
        if (!details?.variables) return [];

        const errors: LinterError[] = [];

        // Check required variables
        for (const [key, schema] of Object.entries(details.variables)) {
            if (schema.required && !(key in variables)) {
                errors.push({
                    type: 'variable',
                    message: `Required variable "${key}" is missing`,
                    path: key
                });
                continue;
            }

            if (key in variables) {
                const value = variables[key];

                // Type validation
                switch (schema.type) {
                    case 'string':
                        if (typeof value !== 'string') {
                            errors.push({
                                type: 'variable',
                                message: `Variable "${key}" must be a string`,
                                path: key,
                                expected: 'string',
                                received: typeof value
                            });
                        }
                        break;

                    case 'number':
                        if (typeof value !== 'number') {
                            errors.push({
                                type: 'variable',
                                message: `Variable "${key}" must be a number`,
                                path: key,
                                expected: 'number',
                                received: typeof value
                            });
                        }
                        break;

                    case 'boolean':
                        if (typeof value !== 'boolean') {
                            errors.push({
                                type: 'variable',
                                message: `Variable "${key}" must be a boolean`,
                                path: key,
                                expected: 'boolean',
                                received: typeof value
                            });
                        }
                        break;

                    case 'array':
                        if (!Array.isArray(value)) {
                            errors.push({
                                type: 'variable',
                                message: `Variable "${key}" must be an array`,
                                path: key,
                                expected: 'array',
                                received: typeof value
                            });
                        }
                        break;

                    case 'date':
                        if (!(value instanceof Date) && isNaN(new Date(value as string | number).getTime())) {
                            errors.push({
                                type: 'variable',
                                message: `Variable "${key}" must be a Date or valid date string`,
                                path: key,
                                expected: 'Date',
                                received: typeof value
                            });
                        }
                        break;

                    case 'objectId':
                        if (!(value instanceof ObjectId)) {
                            errors.push({
                                type: 'variable',
                                message: `Variable "${key}" must be an ObjectId`,
                                path: key,
                                expected: 'ObjectId',
                                received: typeof value
                            });
                        }
                        break;

                    case 'objectIdArray':
                        if (!Array.isArray(value) || !value.every(v => v instanceof ObjectId)) {
                            errors.push({
                                type: 'variable',
                                message: `Variable "${key}" must be an array of ObjectIds`,
                                path: key,
                                expected: 'ObjectId[]',
                                received: Array.isArray(value) ? 'array' : typeof value
                            });
                        }
                        break;

                    // Add other type validations...
                }
            }
        }

        return errors;
    }

    /**
     * Format for IDE integration
     */
    public formatForIDE(errors: LinterError[]): {
        markers: Array<{
            startRow: number;
            startCol: number;
            endRow: number;
            endCol: number;
            className: string;
            type: string;
            text: string;
        }>;
        annotations: Array<{
            row: number;
            column: number;
            text: string;
            type: string;
        }>;
    } {
        // Format errors in a way that can be consumed by ACE editor or similar
        // This is just an example structure - adjust based on your IDE needs
        return {
            markers: errors.map(error => ({
                startRow: error.line || 0,
                startCol: error.column || 0,
                endRow: error.line || 0,
                endCol: (error.column || 0) + 1,
                className: `dimrill-error-${error.type}`,
                type: 'text',
                text: error.message
            })),
            annotations: errors.map(error => ({
                row: error.line || 0,
                column: error.column || 0,
                text: error.message,
                type: 'error'
            }))
        };
    }
} 