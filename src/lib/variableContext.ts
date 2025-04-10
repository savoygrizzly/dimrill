import { ObjectId } from "bson";
import Operators from "./operators/operators";
import MongoDbOperators from "./operators/adapters/mongodb";

interface GroupedContext {
    variables: Record<string, unknown>;
}

export class VariableContext {
    private groupedContext: GroupedContext;
    private operators: Operators;
    private adapter: MongoDbOperators;
    private options: { unsafeEquals: boolean };

    constructor(
        variables: Record<string, unknown>,
        operators: Operators,
        adapter: MongoDbOperators,
        options: { unsafeEquals: boolean } = { unsafeEquals: false }
    ) {
        // Serialize variables similarly to how ivmSandbox did
        const serializedVariables = Object.entries(variables).reduce(
            (acc, [key, value]) => {
                if (value instanceof ObjectId) {
                    acc[key] = value.toString();
                } else if (
                    Array.isArray(value) &&
                    value.every((v) => v instanceof ObjectId)
                ) {
                    acc[key] = value.map((v) => v.toString());
                } else {
                    acc[key] = value;
                }
                return acc;
            },
            {} as Record<string, unknown>
        );

        this.groupedContext = { variables: serializedVariables };
        this.operators = operators;
        this.adapter = adapter;
        this.options = options;
    }

    private accessProperty(path: string): unknown {
        // Handle variable access (now wrapped in {{$variableName}})
        if (path.startsWith("$")) {
            const variableName = path.slice(1);
            // Clean special characters from variable values
            if (["&", "/", "*"].includes(variableName)) {
                return "";
            }
            return this.groupedContext.variables[variableName];
        }
        // Any non-variable path should return empty string
        return "";
    }

    public formatValue(value: any): any {
        let parsedValue = value;

        // Helper to process a single value
        const processValue = (val: any): any => {
            if (typeof val === "string") {
                if (val.startsWith("{{") && val.endsWith("}}")) {
                    const innerValue = val.slice(2, -2);
                    if (innerValue.startsWith("$")) {
                        return this.accessProperty(innerValue);
                    }
                    return "";
                }
                if (["&", "/", "*"].includes(val)) {
                    return "";
                }
                return val;
            }
            return val;
        };

        // Flatten and process arrays
        const flattenAndProcess = (val: any): any => {
            if (Array.isArray(val)) {
                return val.reduce((acc, curr) => {
                    if (Array.isArray(curr)) {
                        return [...acc, ...flattenAndProcess(curr)];
                    }
                    const processed = processValue(curr);
                    return Array.isArray(processed)
                        ? [...acc, ...processed]
                        : [...acc, processed];
                }, []);
            }
            return processValue(val);
        };

        return flattenAndProcess(parsedValue);
    }

    // Mimics the __operatorsClass__ call
    public runOperatorCondition(fn: string, a: any, b: any): any {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error - We assume fn exists on operators
        const result = this.operators[fn](a, b);
        return result; // No need for ExternalCopy
    }

    // Mimics the __adapterClass__ call
    public runAdapterOperator(
        fn: string,
        castType: string | undefined, // Keep track if castType was explicitly provided
        a: string,
        b: any
    ): any {
        // Adjust the unsafeEquals check based on whether castType was provided (like in the original ivmSandbox wrapper)
        const checkUnsafe = castType === undefined || castType === 'undefined';
        if (
            !this.options.unsafeEquals &&
            ["Equals", "NotEquals"].includes(fn) &&
            checkUnsafe &&
            typeof b === "object" &&
            b !== null &&
            !Array.isArray(b)
        ) {
            b = String(b); // Ensure string comparison for objects if unsafeEquals is false and no explicit cast type was given
        }
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error - We assume fn exists on adapter
        const result = this.adapter[fn](a, b);
        return result; // No need for ExternalCopy
    }
} 