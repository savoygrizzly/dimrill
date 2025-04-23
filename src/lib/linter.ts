import { type RootSchema, type PathSchema, type VariableSchema, type Policy, type Statement, type StatementCondition } from "../types/custom";
import { ObjectId } from "bson";

interface LinterError {
    type: 'variable' | 'argument' | 'syntax' | 'condition' | 'policy';
    message: string;
    path?: string;
    expected?: string;
    received?: string;
    line?: number;
    column?: number;
    statementIndex?: number;
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
    // Expanded list of supported operators in conditions
    private readonly supportedOperators = [
        // Basic operators
        "StringEquals",
        "StringNotEquals",
        "StringEqualsIgnoreCase",
        "NumberEquals",
        "NumberNotEquals",
        "NumberLessThan",
        "NumberLessThanEquals",
        "NumberGreaterThan",
        "NumberGreaterThanEquals",
        "DateEquals",
        "DateNotEquals",
        "DateLessThan",
        "DateLessThanEquals",
        "DateGreaterThan",
        "DateGreaterThanEquals",
        "BooleanEquals",
        "ArrayContains",
        "ArrayNotContains",
        // Complex operators
        "InArray",
        "InArray:ToQuery",
        "InArray:ToQuery:AnyValues",
        "InArray:ToQuery:AllValues",
        "NotInArray",
        "NotInArray:ToQuery",
        "NotInArray:ToQuery:AnyValues",
        "NotInArray:ToQuery:AllValues",
        "StringContains",
        "StringNotContains",
        "If"
    ];

    // Regex to extract template variables from strings
    private readonly templateVarRegex = /\{\{\$([\w\d_]+)\}\}/g;

    constructor(schema: RootSchema) {
        this.schema = schema;
    }

    /**
     * Get schema details for a given DRNA path
     */
    public getSchemaDetails(path: string): SchemaDetails | null {
        // Extract base path by removing parameters (anything after & or /)
        const basePath = path.split(/[&/]/)[0];
        const pathParts = basePath.split(':');
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
     * Extract template variables from a string or array value
     */
    private extractTemplateVariables(value: unknown): string[] {
        const variables: string[] = [];

        if (typeof value === 'string') {
            // Extract variables from string
            const matches = [...value.matchAll(this.templateVarRegex)];
            matches.forEach(match => {
                variables.push(match[1]); // The first capture group is the variable name
            });
        } else if (Array.isArray(value)) {
            // Extract variables from each array element
            value.forEach(item => {
                variables.push(...this.extractTemplateVariables(item));
            });
        } else if (value && typeof value === 'object') {
            // Extract variables from object values
            Object.values(value).forEach(val => {
                variables.push(...this.extractTemplateVariables(val));
            });
        }

        return variables;
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
                    case 'stringArray':
                    case 'numberArray':
                    case 'anyArray':
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
                }
            }
        }

        return errors;
    }

    /**
     * Validate a policy against the schema
     */
    public validatePolicy(policy: Policy): LinterError[] {
        if (!policy.Statement || !Array.isArray(policy.Statement)) {
            return [{
                type: 'policy',
                message: 'Policy must have a Statement array'
            }];
        }

        const errors: LinterError[] = [];

        if (!policy.Version) {
            errors.push({
                type: 'policy',
                message: 'Policy must have a Version'
            });
        }

        // Validate each statement
        policy.Statement.forEach((statement, index) => {
            const statementErrors = this.validateStatement(statement);
            statementErrors.forEach(error => {
                error.statementIndex = index;
                errors.push(error);
            });
        });

        return errors;
    }

    /**
     * Validate a statement against the schema
     */
    public validateStatement(statement: Statement): LinterError[] {
        const errors: LinterError[] = [];

        // Check if Effect is valid
        if (!statement.Effect || (statement.Effect !== 'Allow' && statement.Effect !== 'Deny')) {
            errors.push({
                type: 'syntax',
                message: 'Statement must have a valid Effect (Allow or Deny)',
                expected: 'Allow | Deny',
                received: statement.Effect
            });
        }

        // Check if either Action or Ressource is present
        if ((!statement.Action || !Array.isArray(statement.Action) || statement.Action.length === 0) &&
            (!statement.Ressource || !Array.isArray(statement.Ressource) || statement.Ressource.length === 0)) {
            errors.push({
                type: 'syntax',
                message: 'Statement must have either Action or Ressource defined as non-empty arrays'
            });
        }

        // Validate Actions and Resources
        if (statement.Action && Array.isArray(statement.Action)) {
            // Check each action
            statement.Action.forEach(action => {
                const actionErrors = this.validateDRNAPath(action, 'Action');
                errors.push(...actionErrors);
            });
        }

        if (statement.Ressource && Array.isArray(statement.Ressource)) {
            // Check each resource
            statement.Ressource.forEach(resource => {
                const resourceErrors = this.validateDRNAPath(resource, 'Ressource');
                errors.push(...resourceErrors);
            });
        }

        // Validate Conditions if present
        if (statement.Condition) {
            const conditionErrors = this.validateConditions(statement.Condition, statement);
            errors.push(...conditionErrors);
        }

        return errors;
    }

    /**
     * Validate if the DRNA path is valid and exists in the schema
     */
    private validateDRNAPath(path: string, expectedType: 'Action' | 'Ressource'): LinterError[] {
        const errors: LinterError[] = [];

        // First check if the DRNA path has valid format (allowing for wildcards and parameters)
        if (!path.includes(':')) {
            errors.push({
                type: 'syntax',
                message: `Invalid DRNA path format: ${path}. Expected format: prefix:category:action`,
                path
            });
            return errors;
        }

        // Skip detailed validation for paths with wildcards
        if (path.includes('*')) {
            return errors;
        }

        // Extract base path by removing parameters (anything after & or /)
        const basePath = path.split(/[&/]/)[0];

        // Check if the path exists in schema
        const details = this.getSchemaDetails(basePath);
        if (!details) {
            errors.push({
                type: 'syntax',
                message: `DRNA path ${basePath} does not exist in schema`,
                path
            });
            return errors;
        }

        // Check if the path is of expected type
        if (details.type && !details.type.includes(expectedType)) {
            errors.push({
                type: 'syntax',
                message: `DRNA path ${basePath} is not a valid ${expectedType}. Expected types: ${details.type?.join(', ')}`,
                path,
                expected: expectedType,
                received: details.type?.join(', ')
            });
        }

        // Validate parameters in path if they exist
        if (path.includes('&') || path.includes('/')) {
            const paramsSection = path.substring(basePath.length);
            // Basic validation that parameters exist in the schema
            // This could be enhanced with more detailed parameter validation
            if (details.arguments) {
                // Just do a simple check for parameters existence
                // In a real implementation, more thorough validation would be required
                const paramNames = Object.keys(details.arguments);

                // For now, just log the parameters that appear to be specified in the schema
                if (paramNames.length > 0 && !paramsSection.includes('&') && !paramsSection.includes('/')) {
                    errors.push({
                        type: 'syntax',
                        message: `Path may be missing parameters. Available parameters in schema: ${paramNames.join(', ')}`,
                        path
                    });
                }
            }
        }

        return errors;
    }

    /**
     * Validate conditions against schema
     */
    public validateConditions(conditions: StatementCondition, statement: Statement): LinterError[] {
        const errors: LinterError[] = [];

        // Check for empty conditions
        if (!conditions || Object.keys(conditions).length === 0) {
            return [];
        }

        // Collect all possible DRNA paths from the statement
        const drnaPaths: string[] = [];
        if (statement.Action && Array.isArray(statement.Action)) {
            drnaPaths.push(...statement.Action);
        }
        if (statement.Ressource && Array.isArray(statement.Ressource)) {
            drnaPaths.push(...statement.Ressource);
        }

        // Find all available variables from the paths
        const availableVariables = new Set<string>();
        drnaPaths.forEach(path => {
            // Handle paths with parameters by extracting the base path
            const basePath = path.split(/[&/]/)[0];
            // Skip paths with wildcards
            if (basePath.includes('*')) return;

            const details = this.getSchemaDetails(basePath);
            if (details?.variables) {
                Object.keys(details.variables).forEach(key => {
                    availableVariables.add(key);
                });
            }
        });

        // Check each condition
        for (const [operator, conditionMap] of Object.entries(conditions)) {
            // Check if the operator is supported
            const baseOperator = operator.split(':')[0];
            if (!this.supportedOperators.includes(operator) && !this.supportedOperators.includes(baseOperator)) {
                errors.push({
                    type: 'condition',
                    message: `Unsupported condition operator: ${operator}`,
                    path: operator,
                    expected: this.supportedOperators.join(', '),
                    received: operator
                });
            }

            // Extract and validate template variables in condition values
            for (const [variable, value] of Object.entries(conditionMap)) {
                // Extract template variables from the condition value
                const templateVars = this.extractTemplateVariables(value);

                // Validate that template variables exist in the schema
                templateVars.forEach(templateVar => {
                    if (!availableVariables.has(templateVar)) {
                        errors.push({
                            type: 'condition',
                            message: `Template variable "$${templateVar}" used in condition does not exist in the referenced schemas`,
                            path: `${operator}.${variable}.template`
                        });
                    }
                });

                // Check if the condition variable itself exists in schema
                if (!availableVariables.has(variable)) {
                    errors.push({
                        type: 'condition',
                        message: `Variable "${variable}" used in condition does not exist in the referenced schemas`,
                        path: `${operator}.${variable}`
                    });
                } else {
                    // Check variable type compatibility with operator
                    // Skip for values containing template variables
                    if (templateVars.length === 0) {
                        this.validateVariableTypeForOperator(variable, baseOperator, drnaPaths, errors);
                    }
                }
            }
        }

        return errors;
    }

    /**
     * Validate that the variable type is compatible with the operator
     */
    private validateVariableTypeForOperator(
        variable: string,
        operator: string,
        drnaPaths: string[],
        errors: LinterError[]
    ): void {
        // Find the variable type from schemas
        let variableType: string | undefined;

        for (const path of drnaPaths) {
            const basePath = path.split(/[&/]/)[0];
            // Skip paths with wildcards
            if (basePath.includes('*')) continue;

            const details = this.getSchemaDetails(basePath);
            if (details?.variables && details.variables[variable]) {
                variableType = details.variables[variable].type;
                break;
            }
        }

        if (!variableType) return;

        // Check type compatibility based on operator prefix
        const operatorPrefix = operator.replace(/Equals|NotEquals|LessThan|GreaterThan|Contains|NotContains|LessThanEquals|GreaterThanEquals|EqualsIgnoreCase|InArray|NotInArray/g, '');

        switch (operatorPrefix) {
            case 'String':
                if (variableType !== 'string') {
                    errors.push({
                        type: 'condition',
                        message: `Operator "${operator}" requires a string variable, but "${variable}" is of type "${variableType}"`,
                        path: `${operator}.${variable}`,
                        expected: 'string',
                        received: variableType
                    });
                }
                break;
            case 'Number':
                if (variableType !== 'number') {
                    errors.push({
                        type: 'condition',
                        message: `Operator "${operator}" requires a number variable, but "${variable}" is of type "${variableType}"`,
                        path: `${operator}.${variable}`,
                        expected: 'number',
                        received: variableType
                    });
                }
                break;
            case 'Date':
                if (variableType !== 'date') {
                    errors.push({
                        type: 'condition',
                        message: `Operator "${operator}" requires a date variable, but "${variable}" is of type "${variableType}"`,
                        path: `${operator}.${variable}`,
                        expected: 'date',
                        received: variableType
                    });
                }
                break;
            case 'Boolean':
                if (variableType !== 'boolean') {
                    errors.push({
                        type: 'condition',
                        message: `Operator "${operator}" requires a boolean variable, but "${variable}" is of type "${variableType}"`,
                        path: `${operator}.${variable}`,
                        expected: 'boolean',
                        received: variableType
                    });
                }
                break;
            case 'Array':
            case 'In':
            case 'NotIn':
                if (!variableType.includes('Array') && variableType !== 'array') {
                    errors.push({
                        type: 'condition',
                        message: `Operator "${operator}" typically works with array variables, but "${variable}" is of type "${variableType}"`,
                        path: `${operator}.${variable}`,
                        expected: 'array',
                        received: variableType
                    });
                }
                break;
        }
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