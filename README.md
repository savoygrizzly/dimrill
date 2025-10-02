# Dimrill

**VERSION 5.1.X**

> _"Dimrill, like the ancient gate of Nanduhirion, stands resolute, its silent decrees sifting friend from foe in the twilight of access."_

Dimrill is a policy-based authorization framework for Node.js, designed for fine-grained access control. It empowers developers to define permissions based on resources, actions, and dynamic contexts, transcending traditional role-based access control (RBAC).

## **IMPORTANT NOTICE**:

**From version 5.1.X onward**

The spelling mistake for `"Ressource"` has been corrected to `"Resource"`, which means any stored policy, policy example or code will need to be updated to use the corrected syntax.

For anyone out there using this, I am really sorry about what it entails, however i believe it best to be fixed. For codebases it's only a regex replace away.

## Features

- **DRNA (Dynamic Resource Naming Authority):** A flexible string format to identify resources and actions (e.g., `orders:create`, `files:read&ownerId/{{$userId}}`).
- **Schemas:** Define the structure of your authorization endpoints, including resource types, arguments, variables, and conditions.
- **Policies:** Craft rules specifying _who_ can perform _what_, with support for wildcards, dynamic variables, and context-based conditions.
- **Linter:** Validate schemas and variables for robust development and IDE integration.
- **MongoDB Integration:** Generate query fragments for MongoDB-based authorization checks.
- **Extensibility:** Dynamically modify schemas and validate policies against complex requirements.

## Installation

```bash
npm install dimrill
# or
yarn add dimrill
```

## Core Concepts

Dimrill's architecture rests on three pillars:

1. **DRNA (Dynamic Resource Naming Authority):** A string format to uniquely identify resources and actions. Examples:
   - `orders:create` (an action).
   - `files:read&ownerId/{{$userId}}` (a resource with a dynamic variable).
2. **Schemas:** JSON-based definitions that structure your DRNA endpoints, specifying:
   - Types (`Action`, `Resource`).
   - Arguments and their types (e.g., `status` as `string`).
   - Variables for contextual authorization (e.g., `userId`).
   - Conditions and operators (e.g., `NumericGreaterThanEquals`).
3. **Policies:** Arrays of rules defining permissions, with:
   - `Allow` or `Deny` effects.
   - Targeted DRNA strings, supporting wildcards (`*`) and variables.
   - Optional conditions for context-aware logic (e.g., `orderValue >= 100`).

## Quick Start

### 1. Define a Schema

Create `.dmrl` or `.dmrl.json` files to define your authorization endpoints.

_Example (`schemas/orders.dmrl.json`):_

```json
{
  "createOrder": {
    "Type": ["Action"],
    "Description": "Allows creating a new order",
    "Variables": {
      "userId": { "type": "string", "required": true },
      "orderValue": { "type": "number" }
    },
    "Condition": {
      "Operators": ["NumericGreaterThanEquals"]
    }
  }
}
```

### 2. Define Policies

Create policy objects to specify permissions.

_Example:_

```javascript
const managerPolicy = [
  {
    Version: "1.0",
    Statement: [
      {
        Effect: "Allow",
        Action: ["orders:*"], // All order actions
      },
    ],
  },
];

const userPolicy = [
  {
    Version: "1.0",
    Statement: [
      {
        Effect: "Allow",
        Action: ["orders:createOrder"],
        Condition: {
          "NumericGreaterThanEquals:ToQuery": {
            orderValue: 100, // Only allow if orderValue >= 100
          },
        },
      },
    ],
  },
];
```

### 3. Authorize

Use Dimrill to check access and generate queries.

_Example:_

```javascript
import Dimrill from "dimrill";
import path from "path";

async function checkAuth() {
  const dimrill = new Dimrill({ schemaPrefix: "app" });

  // Load schemas from a directory
  await dimrill.autoload(path.join(__dirname, "schemas"), { recursive: true });

  // Or load from a JSON string
  const schemaString = JSON.stringify({
    viewReport: { Type: ["Action"], Description: "View reports" },
  });
  dimrill.loadSchemaFromString(schemaString, "reports/admin.dmrl.json");
  await dimrill.compileSchemas();

  // Authorize a user
  const result = await dimrill.authorize(
    ["Action", "orders:createOrder"],
    userPolicy,
    { variables: { userId: "user-123", orderValue: 150 } }
  );

  if (result.valid) {
    console.log("Access granted!", result.query);
    // Example query: { orderValue: { $gte: 100 } }
  } else {
    console.log("Access denied.");
  }
}

checkAuth();
```

## API Reference

### Constructor

`new Dimrill(options?)`

- `options`:
  - `schemaPrefix: string` (default: `""`): Prefix for schema paths.
  - `unsafeEquals: boolean` (default: `false`): Enables direct object comparisons for `Equals`/`NotEquals` operators. Use cautiously.

### Schema Management

- `autoload(directoryPath: string, { recursive?: boolean }): Promise<void>`: Loads and compiles `.dmrl` or `.dmrl.json` files from a directory. If `recursive: true`, subdirectories create nested prefixes (e.g., `orders.sub:filename`).
- `loadSchema(paths: string | string[]): Promise<void>`: Loads schema files without compiling.
- `loadSchemaFromString(jsonString: string, filePath: string): void`: Loads a schema from a JSON string, using `filePath` for prefixing (e.g., `orders/permissions.dmrl.json` becomes `orders:permissions`).
- `compileSchemas(): Promise<void>`: Compiles loaded schemas.
- `getSchema(): RootSchema | boolean`: Returns the compiled schema or `false` if not compiled.
- `schemaHasCompiled(): boolean`: Checks if schemas are compiled.
- `extendSchema(path: string)`: Modifies a schema at `path`. Returns:
  - `set(value: any)`: Sets a value.
  - `unset(key: string)`: Removes a key.
  - `push(value: any)`: Adds to an array.
  - `remove(element: any)`: Removes from an array.

### Authorization

- `authorize(drna: ["Action" | "Resource", string], policies: Policy[], context: { variables: Record<string, unknown> }, { pathOnly?: boolean }): Promise<{ valid: boolean, query: object }>`: Checks access for a DRNA, returning validity and a MongoDB query fragment.
- `authorizeBulk(drnaArray: string[][], policies: Policy[], { ignoreConditions?: boolean }): Promise<string[]>`: Validates multiple DRNAs, ignoring conditions by default. Ideal for UI permissions.

### Policy Validation

- `compilePolicies(policies: Policy[]): Map<number, _CompilationResults>`: Validates policies against the schema, returning results per policy.

### Linter & Introspection

- `getLinter(): DimrillLinter`: Returns a linter instance (requires compiled schema).
- `validateVariables(path: string, variables: Record<string, unknown>): LinterError[]`: Validates variables for a DRNA path.
- `getSchemaDetails(path: string): SchemaDetails | null`: Retrieves schema details (variables, arguments, conditions).

See `src/types/custom.d.ts` for type definitions.

## Schema Structure

Schemas are nested JSON objects defining authorization endpoints.

_Example:_

```json
{
  "orders": {
    "create": {
      "Type": ["Action"],
      "Variables": {
        "userId": { "type": "string", "required": true }
      },
      "Condition": {
        "Operators": ["StringEquals"],
        "QueryEnforceTypeCast": { "userId": "ToObjectId" }
      }
    }
  }
}
```

## Policy Structure

Policies are arrays of objects with `Version` and `Statement` arrays.

_Example:_

```json
[
  {
    "Version": "1.0",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": ["orders:create"],
        "Condition": {
          "StringEquals": { "userRole": "admin" }
        }
      }
    ]
  }
]
```

## Variables

Variables, defined in schemas under the `Variables` key, provide contextual data for authorization, guarding the paths of access with precision. They are passed to the `authorize` method and strictly validated against their defined types. Type mismatches throw errors, ensuring robust security and preventing invalid data from compromising the system.

### Supported Types

Based on the `VariableSchema` type, variables can be:

- `string`: Text values (e.g., user IDs).
- `number`: Numeric values (e.g., order amounts).
- `boolean`: True/false values (e.g., isActive).
- `array`: Generic arrays (e.g., list of permissions).
- `stringArray`: Arrays of strings (e.g., role names).
- `numberArray`: Arrays of numbers (e.g., department IDs).
- `anyArray`: Arrays of mixed types.
- `objectId`: MongoDB ObjectId strings (e.g., database IDs).
- `objectIdArray`: Arrays of MongoDB ObjectId strings.
- `date`: Date strings or objects (e.g., creation date).

### Properties

- `type`: Required. Specifies the variable's data type.
- `required`: Optional. If `true`, the variable must be provided during authorization.
- `description`: Optional. Documents the variable's purpose.

### Example

```json
{
  "orders": {
    "create": {
      "Type": ["Action"],
      "Variables": {
        "userId": {
          "type": "string",
          "required": true,
          "description": "User's unique ID"
        },
        "orderValue": { "type": "number", "description": "Total order amount" },
        "departmentIds": { "type": "objectIdArray", "required": true }
      }
    }
  }
}
```

### Validation

The linter enforces strict type checking via `validateVariables`. If a variable's type does not match its schema definition, an error is thrown, halting authorization.

_Example:_

```javascript
const dimrill = new Dimrill();
await dimrill.autoload("schemas");

try {
  const errors = dimrill.validateVariables("orders:create", {
    userId: 123, // Invalid: should be string
    orderValue: 150,
    departmentIds: ["507f1f77bcf86cd799439011"], // Valid ObjectId
  });
} catch (error) {
  console.error(error.message); // "Type mismatch: userId must be string, received number"
}
```

### Usage in Authorization

Variables are passed to `authorize` and used in conditions or DRNA parameters, with strict typing ensuring data integrity.

_Example:_

```javascript
const result = await dimrill.authorize(
  ["Action", "orders:create"],
  userPolicy,
  {
    variables: {
      userId: "user-123",
      orderValue: 150,
      departmentIds: ["507f1f77bcf86cd799439011"],
    },
  }
);
```

## Conditions

Conditions define rules for authorization, either in schemas (to enforce allowed operators and type casting) or in policies (to apply context-based logic). They wield operators to compare variables or DRNA parameters, forging queries for MongoDB or enforcing precise access control.

### Schema Conditions

In schemas, the `Condition` key specifies:

- `Operators`: Allowed comparison operators (e.g., `StringEquals`, `NumericGreaterThan`).
- `QueryOperators`: Operators that generate MongoDB queries (e.g., `InArray`).
- `QueryEnforceTypeCast`: Forces type casting for query values (e.g., `ToObjectId`).
- `Enforce`: Mandatory conditions applied to all policies (e.g., `isActive: true`).

_Example:_

```json
{
  "orders": {
    "create": {
      "Type": ["Action"],
      "Condition": {
        "Operators": ["StringEquals", "NumericGreaterThanEquals"],
        "QueryOperators": ["InArray"],
        "QueryEnforceTypeCast": { "userId": "ToObjectId" },
        "Enforce": { "Bool": { "isActive": true } }
      }
    }
  }
}
```

### Policy Conditions

In policies, conditions are defined under the `Condition` key using the format: `MainOperator[:LogicalOperator][:QueryOperator][:TypeCast]`

- **Main Operators**: Compare values (e.g., `StringEquals`, `NumericGreaterThan`, `InArray`, `ArraysIntersect`).
- **Logical Operators**: `AnyValues` (OR logic) or `EveryValues` (AND logic, default).
- **Query Operator**: `ToQuery` generates a MongoDB query fragment instead of evaluating directly.
- **Type Caster**: Forces right-hand side values to a type (e.g., `ToString`, `ToObjectId`, `ToDate`).

_Example:_

```json
{
  "Version": "1.0",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["orders:create"],
      "Condition": {
        "StringEquals": { "userRole": "admin" },
        "NumericGreaterThanEquals:ToQuery": { "orderValue": 100 },
        "InArray:AnyValues:ToObjectIdArray": {
          "{{$userDepartments}}": ["dept1", "dept2"]
        }
      }
    }
  ]
}
```

### Supported Operators

Common operators include:

- `StringEquals`, `NotEquals`: Compare strings.
- `NumericGreaterThan`, `NumericGreaterThanEquals`: Compare numbers.
- `InArray`: Check if a value is in an array.
- `ArraysIntersect`: Check if arrays share common elements.
- `Bool`: Evaluate boolean conditions.

See `src/lib/operators` for the full list.

### Query Generation

Conditions with `ToQuery` generate MongoDB queries. For example:

```json
"NumericGreaterThanEquals:ToQuery": { "orderValue": 100 }
```

Produces: `{ orderValue: { $gte: 100 } }`

### Example

Combine schema and policy conditions for robust authorization.

_Schema:_

```json
{
  "orders": {
    "create": {
      "Type": ["Action"],
      "Variables": { "userId": { "type": "string", "required": true } },
      "Condition": {
        "Operators": ["StringEquals"],
        "QueryEnforceTypeCast": { "userId": "ToObjectId" }
      }
    }
  }
}
```

_Policy:_

```json
[
  {
    "Version": "1.0",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": ["orders:create"],
        "Condition": { "StringEquals:ToQuery": { "userId": "{{$userId}}" } }
      }
    ]
  }
]
```

_Authorization:_

```javascript
const result = await dimrill.authorize(["Action", "orders:create"], policies, {
  variables: { userId: "507f1f77bcf86cd799439011" },
});
// Result: { valid: true, query: { userId: ObjectId("507f1f77bcf86cd799439011") } }
```

## Security Notes

- Validate all inputs to `authorize` to prevent injection.
- Avoid `unsafeEquals: true` unless necessary.
- Use specific DRNA paths over wildcards (`*`).
- Leverage schema `Enforce` conditions for mandatory rules.

## Linter

Dimrill's linter provides robust validation tools for schemas, policies, statements, conditions, and variables during development, enhancing security and ensuring consistency before runtime.

### Capabilities

- **Schema Validation**: Verify schema structure and relationships.
- **Policy Validation**: Analyze complete policies against schemas.
- **Statement Validation**: Check individual statements for correctness.
- **Variable Validation**: Ensure variables match their declared types.
- **Condition Validation**: Verify condition operators and variable compatibility.
- **Template Variable Detection**: Support for `{{$variableName}}` syntax in conditions.
- **Parameterized Path Validation**: Handle DRNA paths with parameters (`resource&param/value`).
- **Wildcard Support**: Properly validate paths with wildcards (`*`).
- **Complex Operator Validation**: Support compound operators (`InArray:ToQuery:AnyValues`).
- **IDE Integration**: Format errors for editor integration.

### Usage Examples

#### Validating Variables

Check if variables match their schema definition:

```javascript
const dimrill = new Dimrill();
await dimrill.autoload("schemas");

const errors = dimrill.validateVariables("orders:create", {
  userId: 123, // Invalid: should be string
  orderValue: 150,
});
console.log(errors);
// [{ type: "variable", message: "userId must be string", path: "userId", expected: "string", received: "number" }]
```

#### Validating an Entire Policy

Validate a policy against your schema:

```javascript
const policy = {
  Version: "1.0",
  Statement: [
    {
      Effect: "Allow",
      Action: ["orders:create"],
      Condition: {
        StringEquals: { userRole: "admin" },
        "NumericGreaterThanEquals:ToQuery": { orderValue: 100 },
      },
    },
  ],
};

const policyErrors = dimrill.validatePolicy(policy);
if (policyErrors.length === 0) {
  console.log("Policy is valid!");
} else {
  console.error("Policy has issues:", policyErrors);
}
```

#### Validating Policies with Template Variables

The linter recognizes template variables in the format `{{$varName}}`:

```javascript
const templatePolicy = {
  Version: "1.0",
  Statement: [
    {
      Effect: "Allow",
      Resource: ["orders:view&ownerId/{{$userId}}"],
      Condition: {
        "InArray:ToQuery:AnyValues": {
          status: ["{{$status}}", "active"],
        },
      },
    },
  ],
};

const templateErrors = dimrill.validatePolicy(templatePolicy);
// Validates if $userId and $status variables exist in the schema
```

#### Inspecting Schema Details

Retrieve detailed information about a schema:

```javascript
const details = dimrill.getSchemaDetails("orders:create");
console.log(details.variables); // { userId: { type: "string", required: true }, ... }
console.log(details.arguments); // Arguments defined for this path
console.log(details.conditions); // Available conditions and operators
```

### IDE Integration

The linter can format errors for integration with code editors:

```javascript
const errors = dimrill.validatePolicy(policy);
const formattedErrors = dimrill.getLinter().formatForIDE(errors);
// Returns markers and annotations for editor integration
```

By leveraging the linter for policy creations, you can catch authorization issues early between the schema, your policy and your integrations, and ensure your policies align perfectly with your defined schemas.
