// Root Schema Interface
export type RootSchema = Record<string, PathSchema>;

// Schema for each path, like 'files:createOrder'
export interface PathSchema {
  [key: string]: any; // Add type annotation to the index signature
  Type: Array<"Action" | "Ressource">;
  Arguments?: ArgumentSchema;
  Condition?: ConditionSchema;
  Variables?: Record<[key: string], VariableSchema>;
}
export interface VariableSchema {
  type:
    | "string"
    | "number"
    | "boolean"
    | "array"
    | "objectId"
    | "objectIdArray"
    | "date";
  required?: boolean;
  description?: string;
}
interface Argument {
  [key: string]: any; // Add type annotation to the index signature
  type: string | number;
  enum?: string[]; // enum is optional and only for string type
  dataFrom?: string;
  value?: string | number;
}

// Modified ArgumentSchema using conditional types
export type ArgumentSchema = Record<
  string,
  Argument &
    (Argument extends { type: "string" }
      ? { enum: string[] }
      : Record<string, unknown>)
>;
// Schema for Arguments

// Schema for Conditions
export interface ConditionSchema {
  [key: string]: string[] | any; // or the appropriate type for your condition values
  // Existing definitions...
  Enforce?: ConditionEnforceSchema; // Adjust the type as needed
  Operators?: string[];
  QueryOperators?: string[];
  QueryEnforceTypeCast?: Record<string, string>;
}

export interface Constants {
  SchemaArgumentKeys: string[];
  SchemaGlobalKeys: string[];
  SchemaConditionKeys: string[];
  SchemaOperators: string[];
}

export type ConditionEnforceSchema = Record<string, Record<string, string>>;

export interface Policy {
  id?: string; // Optional, as it's not present in all policies
  Version: string;
  Statement: Statement[];
}

interface Statement {
  [key: string]: any;
  Effect: "Allow" | "Deny";
  Action?: string[]; // Optional
  Ressource?: string[]; // Optional
  Condition?: StatementCondition;
}

export type StatementCondition = Record<
  string,
  Record<string, string | boolean | number | string[] | boolean[] | number[]>
>;
export interface validatedDataObjects {
  req: object;
  user: object;
  context: object;
  variables: Record<string, unknown>;
}

export type drnaParameters = Record<string, string | number | undefined>;
export interface synthetizedDRNAMatch {
  drnaPaths: string[];
  parameters: drnaParameters;
}
export interface CompilatorReturnFormat {
  valid: boolean;
  message: Record<string, string>;
}
export interface CompilationResults {
  effects: string[];
  drna: CompilatorReturnFormat[];
  conditions: CompilatorReturnFormat[][];
}
