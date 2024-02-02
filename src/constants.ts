export const SchemaArgumentKeys = ["type", "required", "default"] as string[];
export const SchemaGlobalKeys = [
  "Arguments",
  "Condition",
  "Variables",
  "Type",
] as string[];
export const SchemaConditionKeys = [
  "Enforce",
  "Operators",
  "ContextOperators",
] as string[];
export const SchemaOperators = [
  "StringStrictlyEquals",
  "StringEquals",
  "StringNotEquals",
  "NumericEquals",
  "NumericNotEquals",
  "NumericLessThan",
  "NumericLessThanEquals",
  "NumericGreaterThan",
  "NumericGreaterThanEquals",
  "DateEquals",
  "DateNotEquals",
  "DateLessThan",
  "DateLessThanEquals",
  "DateGreaterThan",
  "DateGreaterThanEquals",
  "Bool",
  "InArray",
] as string[];
export const SchemaOperands = ["AnyValues", "EveryValues"] as string[];
export const SchemaCastTypes = [
  "toString",
  "toNumber",
  "toObjectId",
  "toObjectIdArray",
  "toArray",
  "toDate",
] as string[];
export const SchemaModifiers = [
  ...SchemaOperands,
  ...SchemaCastTypes,
  "ToQuery",
] as string[];
export const SchemaConditionValues = [
  "ToQuery",
  ...SchemaOperators,
  ...SchemaOperands,
] as string[];
