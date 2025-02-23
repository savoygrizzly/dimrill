// Core types that users will need
export interface Policy {
  id?: string;
  Version: string;
  Statement: Statement[];
}

export interface Statement {
  Effect: "Allow" | "Deny";
  Action?: string[];
  Ressource?: string[];
  Condition?: StatementCondition;
  [key: string]: string[] | StatementCondition | "Allow" | "Deny" | undefined;
}

// Variable types for schema definition
export interface VariableSchema {
  type: "string" | "number" | "boolean" | "array" | "objectId" | "objectIdArray" | "date";
  required?: boolean;
  description?: string;
}

// Schema types
export interface PathSchema {
  Type: Array<"Action" | "Ressource">;
  Arguments?: ArgumentSchema;
  Condition?: ConditionSchema;
  Variables?: Record<string, VariableSchema>;
  AJVSchema?: Record<string, any>;
  [key: string]: any;
}

export type RootSchema = Record<string, PathSchema>;

// Argument types
export interface Argument {
  type: string | number;
  enum?: string[];
  dataFrom?: string;
  value?: string | number;
  [key: string]: any;
}

export type ArgumentSchema = Record<
  string,
  Argument & (Argument extends { type: "string" } ? { enum: string[] } : Record<string, unknown>)
>;

// Condition types
export interface ConditionSchema {
  Enforce?: ConditionEnforceSchema;
  Operators?: string[];
  QueryOperators?: string[];
  QueryEnforceTypeCast?: Record<string, string>;
  [key: string]: any;
}

export type ConditionEnforceSchema = Record<string, Record<string, string>>;
export type StatementCondition = Record<
  string,
  Record<string, string | boolean | number | string[] | boolean[] | number[]>
>;

// Input/Output types
export interface ValidatedDataObjects {
  req: object;
  user: object;
  context: object;
  variables: Record<string, unknown>;
}

export interface AuthorizationResult {
  valid: boolean;
  query: Record<string, any>;
}

// Internal types (prefixed with underscore to indicate they're internal)
export interface _Constants {
  SchemaArgumentKeys: string[];
  SchemaGlobalKeys: string[];
  SchemaConditionKeys: string[];
  SchemaOperators: string[];
}

export interface _CompilatorReturnFormat {
  valid: boolean;
  message: Record<string, string>;
}

export interface _CompilationResults {
  effects: string[];
  drna: _CompilatorReturnFormat[];
  conditions: _CompilatorReturnFormat[][];
}

export type _DrnaParameters = Record<string, string | number | undefined>;

export interface _SynthetizedDRNAMatch {
  drnaPaths: string[];
  parameters: _DrnaParameters;
}
