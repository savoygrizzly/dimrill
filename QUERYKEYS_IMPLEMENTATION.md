# QueryKeys Validation Implementation

## Overview

This document describes the implementation of QueryKeys validation in Dimrill, a critical security feature that validates query keys used in ToQuery modifiers before building MongoDB queries.

## Security Rationale

The QueryKeys feature prevents unauthorized database fields from being queried, even when passed dynamically through variables. This is crucial because:

1. **Prevents Query Injection**: Malicious actors cannot inject arbitrary fields into MongoDB queries
2. **Field-Level Security**: Restricts which database fields can be accessed per schema endpoint
3. **Defense in Depth**: Validation occurs before the MongoDB parser, providing early security checks
4. **Static Analysis**: The linter can validate policies before runtime

## Implementation Details

### 1. Type Definitions (src/types/custom.ts)

Added `QueryKeys` property to `ConditionSchema`:

```typescript
export interface ConditionSchema {
  Enforce?: ConditionEnforceSchema;
  Operators?: string[];
  QueryOperators?: string[];
  QueryEnforceTypeCast?: Record<string, string>;
  QueryKeys?: string[];  // NEW: Allowed query keys for ToQuery modifiers
  [key: string]: any;
}
```

### 2. Constants (src/constants.ts)

Added `QueryKeys` to `SchemaConditionKeys`:

```typescript
export const SchemaConditionKeys = [
  "Enforce",
  "Operators",
  "QueryOperators",
  "QueryEnforceTypeCast",
  "QueryKeys",  // NEW
] as string[];
```

### 3. Runtime Validation (src/lib/conditions.ts)

Added validation in `processCondition` method BEFORE calling the MongoDB adapter:

```typescript
if (
  modifiers.toQuery &&
  SchemaOperators.includes(mainOperator) &&
  (!schema?.Condition?.QueryOperators ||
    schema?.Condition?.QueryOperators.includes(mainOperator))
) {
  // SECURITY: Validate query keys before building the query
  if (schema?.Condition?.QueryKeys) {
    const queryKeys = Object.keys(values);
    const allowedKeys = schema.Condition.QueryKeys;
    
    for (const key of queryKeys) {
      if (!allowedKeys.includes(key)) {
        throw new Error(
          `Security Error: Query key "${key}" is not allowed. Allowed keys: ${allowedKeys.join(", ")}`
        );
      }
    }
  }
  
  // ... rest of query building logic
}
```

### 4. Linter Integration (src/lib/linter.ts)

#### Added QueryKeys to SchemaDetails interface:

```typescript
interface SchemaDetails {
  variables?: Record<string, VariableSchema>;
  arguments?: Record<string, { type: string }>;
  conditions?: {
    queryEnforceTypeCast?: Record<string, string>;
    operators?: string[];
    queryKeys?: string[];  // NEW
  };
  type?: string[];
}
```

#### Updated getSchemaDetails method:

```typescript
const condition = (current as PathSchema).Condition;
return {
  variables: (current as PathSchema).Variables,
  arguments: (current as PathSchema).Arguments as any,
  conditions: condition ? {
    queryEnforceTypeCast: condition.QueryEnforceTypeCast,
    operators: condition.Operators,
    queryKeys: condition.QueryKeys,  // NEW
  } : undefined,
  type: (current as PathSchema).Type,
};
```

#### Added validateQueryKeys method:

```typescript
private validateQueryKeys(
  operator: string,
  conditionMap: Record<string, unknown>,
  drnaPaths: string[],
  errors: LinterError[]
): void {
  // Get QueryKeys from all schemas referenced in the DRNA paths
  const allowedKeysSet = new Set<string>();
  let hasQueryKeys = false;

  drnaPaths.forEach((path) => {
    const basePath = path.split(/[&/]/)[0];
    if (basePath.includes("*")) return;

    const details = this.getSchemaDetails(basePath);
    if (details?.conditions?.queryKeys) {
      hasQueryKeys = true;
      details.conditions.queryKeys.forEach((key: string) => {
        allowedKeysSet.add(key);
      });
    }
  });

  // If QueryKeys is defined in the schema, validate the condition keys
  if (hasQueryKeys) {
    const conditionKeys = Object.keys(conditionMap);
    const allowedKeys = Array.from(allowedKeysSet);

    conditionKeys.forEach((key) => {
      if (!allowedKeysSet.has(key)) {
        errors.push({
          type: "condition",
          message: `Query key "${key}" is not allowed in ToQuery conditions. Allowed keys: ${allowedKeys.join(", ")}`,
          path: `${operator}.${key}`,
          expected: allowedKeys.join(", "),
          received: key,
        });
      }
    });
  }
}
```

#### Integrated into validateConditions:

```typescript
// Check if this is a ToQuery operator and validate QueryKeys
const isToQuery = operator.includes("ToQuery");
if (isToQuery) {
  // Validate QueryKeys for ToQuery operators
  this.validateQueryKeys(
    operator,
    conditionMap as Record<string, unknown>,
    drnaPaths,
    errors
  );
}
```

## Usage Example

### Schema Definition

```json
{
  "orders": {
    "allowedProductCategories": {
      "Type": ["Action", "Resource"],
      "Variables": {
        "orderCurrency": { "type": "string", "required": true },
        "organizations": { "type": "objectIdArray" },
        "status": { "type": "stringArray" }
      },
      "Condition": {
        "QueryEnforceTypeCast": {
          "organizations": "ToObjectIdArray",
          "categories": "ToObjectIdArray"
        },
        "QueryKeys": ["organizations", "status", "categories", "_id"]
      }
    }
  }
}
```

### Valid Policy (Runtime - Passes)

```javascript
const validPolicy = [{
  Version: "1.0",
  Statement: [{
    Effect: "Allow",
    Resource: ["blackeye:orders:allowedProductCategories"],
    Condition: {
      "InArray:ToQuery": {
        organizations: ["5e9f8f8f8f8f8f8f8f8f8f8f"],
        status: ["active"]
      }
    }
  }]
}];
```

### Invalid Policy (Runtime - Throws Error)

```javascript
const invalidPolicy = [{
  Version: "1.0",
  Statement: [{
    Effect: "Allow",
    Resource: ["blackeye:orders:allowedProductCategories"],
    Condition: {
      "InArray:ToQuery": {
        invalidKey: ["value"]  // ❌ Not in QueryKeys
      }
    }
  }]
}];

// Throws: Security Error: Query key "invalidKey" is not allowed. 
// Allowed keys: organizations, status, categories, _id
```

### Linter Validation (Static Analysis)

```javascript
const dimrill = new Dimrill();
await dimrill.autoload("schemas");

const errors = dimrill.validatePolicy(invalidPolicy);
// Returns: [
//   {
//     type: "condition",
//     message: "Query key \"invalidKey\" is not allowed in ToQuery conditions. Allowed keys: organizations, status, categories, _id",
//     path: "InArray:ToQuery.invalidKey"
//   }
// ]
```

## Test Coverage

### Jest Tests (tests/load.test.ts)

1. ✅ Should validate QueryKeys - allow valid keys
2. ✅ Should validate QueryKeys - reject invalid keys
3. ✅ Should validate QueryKeys with dynamic variables

### Custom Tests (tests/test-dimrill.ts)

1. ✅ Testing QueryKeys validation with valid keys
2. ✅ Testing QueryKeys validation with invalid keys (throws error)
3. ✅ Testing QueryKeys validation with dynamic variables

### Linter Tests (tests/test-policy-linter.ts)

1. ✅ Valid QueryKeys should produce no errors
2. ✅ Should detect invalid query key
3. ✅ Should detect invalid key in mixed conditions
4. ✅ Non-ToQuery conditions should not be validated against QueryKeys

## Security Considerations

1. **Validation Order**: QueryKeys are validated BEFORE the MongoDB parser builds the query, preventing malicious queries from ever reaching the database layer.

2. **Dynamic Variables**: Even when query keys are passed dynamically through variables (e.g., `{{$organizations}}`), they are still validated against the allowed list.

3. **Error Messages**: Clear error messages help developers identify security issues during development.

4. **Linter Integration**: Policies can be validated during development/CI before deployment, catching security issues early.

5. **Backward Compatibility**: If QueryKeys is not defined in a schema, no validation is performed, maintaining backward compatibility with existing schemas.

## Migration Guide

To add QueryKeys validation to an existing schema:

1. Identify which database fields should be queryable via ToQuery modifiers
2. Add the `QueryKeys` array to the `Condition` object in your schema
3. Test existing policies with the linter to identify any violations
4. Update policies to use only allowed keys

Example:

```json
{
  "myEndpoint": {
    "Type": ["Resource"],
    "Variables": {
      "userId": { "type": "string" }
    },
    "Condition": {
      "QueryKeys": ["_id", "userId", "status"]  // Add this
    }
  }
}
```

## Future Enhancements

Potential improvements for future versions:

1. **Wildcard Support**: Allow patterns like `"metadata.*"` to match multiple fields
2. **Nested Field Validation**: Support for validating nested object keys
3. **Per-Operator Keys**: Different allowed keys for different operators
4. **Auto-Generation**: Automatically extract QueryKeys from Variables definitions
5. **Documentation**: Generate schema documentation showing allowed query keys

## Conclusion

The QueryKeys feature provides robust security for RBAC policies by validating query keys before they reach the database layer, with both runtime enforcement and static analysis capabilities. This defense-in-depth approach significantly reduces the attack surface for query injection vulnerabilities.
