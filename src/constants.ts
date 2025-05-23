export const SchemaArgumentKeys = ["type", "required", "default"] as string[];
export const SchemaGlobalKeys = [
  "Arguments",
  "Condition",
  "Variables",
  "Description",
  "Type",
] as string[];
export const SchemaConditionKeys = [
  "Enforce",
  "Operators",
  "QueryOperators",
  "QueryEnforceTypeCast",
] as string[];
export const SchemaOperators = [
  "Equals",
  "NotEquals",
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
  "NotInArray",
] as string[];
export const SchemaConditionsOnlyOperators = [
  "ArraysIntersect",
  "ArraysNoIntersect",
] as string[];
export const SchemaOperands = ["AnyValues", "EveryValues"] as string[];
export const SchemaCastTypes = [
  "ToString",
  "ToNumber",
  "ToObjectId",
  "ToObjectIdArray",
  "ToArray",
  "ToDate",
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
  ...SchemaConditionsOnlyOperators,
] as string[];

export const fileExtensionName = [".dmrl", ".dmrl.json"];
