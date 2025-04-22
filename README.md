# Dimrill

**VERSION 5.X.X**

> _Like the Dimrill Gate guarding Khazad-dûm, Dimrill stands sentinel for your application's access rules._

Dimrill is a flexible, policy-based authorization framework for NodeJS applications. It enables fine-grained access control beyond traditional roles, allowing you to define permissions based on resources, actions, and dynamic context.

## Core Concepts

Dimrill utilizes three main components:

1.  **DRNA (Dynamic Resource Naming Authority):** A string format used to uniquely identify resources and actions within your system (e.g., `orders:create`, `files:read&ownerId/{{$userId}}`).
2.  **Schemas:** Define the structure of your DRNA endpoints. Schemas specify:
    *   The types of resources and actions (`Action`, `Ressource`).
    *   Expected arguments and their types.
    *   Variables that can be passed in during authorization (`Variables`).
    *   Conditions and operators allowed or enforced (`Condition`).
3.  **Policies:** Define *who* can do *what*. Policies contain statements that:
    *   Specify `Allow` or `Deny` effects.
    *   Target specific DRNA strings (Actions or Resources), potentially using wildcards (`*`) or dynamic parameters.
    *   Include optional `Condition` blocks to enforce context-based rules using various operators.

## Installation

```bash
npm install dimrill
# or
yarn add dimrill
```

## Quick Start

1.  **Define a Schema:** Create `.dmrl` or `.dmrl.json` files defining your resources and actions.

    *Example (`schemas/orders.dmrl.json`):*
    ```json
    {
      "createOrder": {
        "Type": ["Action"],
        "Description": "Allows creating a new order.",
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

2.  **Define Policies:** Create policy objects.

    *Example:* 
    ```javascript
    const managerPolicy = [
      {
        "Version": "1.0",
        "Statement": [
          {
            "Effect": "Allow",
            "Action": ["orders:*"] // Allow all order actions
          }
        ]
      }
    ];

    const userPolicy = [
      {
        "Version": "1.0",
        "Statement": [
          {
            "Effect": "Allow",
            "Action": ["orders:createOrder"],
            "Condition": {
              "NumericGreaterThanEquals:ToQuery": {
                "orderValue": 100 // Only allow if orderValue >= 100 (generates query)
              }
            }
          }
        ]
      }
    ];
    ```

3.  **Initialize and Authorize:**

    ```javascript
    import Dimrill from 'dimrill';
    import path from 'path';

    async function checkAuth() {
      const dimrill = new Dimrill();

      // Load schemas from a directory
      await dimrill.autoload(path.join(__dirname, 'schemas'));

      // Or load from strings
      // const schemaString = '{"viewReport": {"Type": ["Action"]}}';
      // dimrill.loadSchemaFromString(schemaString, "reports/admin.dmrl.json");
      // await dimrill.compileSchemas();

      // --- Authorization Check --- 
      const userVariables = {
        userId: 'user-123',
        orderValue: 150
      };

      const result = await dimrill.authorize(
        ['Action', 'orders:createOrder'], // DRNA to check
        userPolicy,                     // Policies associated with the user/entity
        { variables: userVariables }     // Contextual variables
      );

      if (result.valid) {
        console.log("Authorization successful!");
        // If conditions included ToQuery, result.query will contain the DB query part
        console.log("Generated Query Fragment:", result.query);
        // Example Query: { orderValue: { '$gte': 100 } }
      } else {
        console.log("Authorization denied.");
      }
    }

    checkAuth();
    ```

## API Reference

### Constructor

`new Dimrill(options?)`

-   `options`: (Optional)
    -   `schemaPrefix: string`: Prefix applied to all loaded schema paths (default: `""`).
    -   `unsafeEquals: boolean`: If `true`, allows `Equals` and `NotEquals` operators to perform direct object comparisons without string casting (default: `false`). Use with caution.

### Schema Loading

-   `autoload(directoryPath: string, options?: { recursive?: boolean }): Promise<void>`:
    Recursively loads and compiles all `.dmrl` or `.dmrl.json` files from a directory.
    If `recursive` is true, subdirectories create nested prefixes (e.g., `folder.subfolder:filename`).
-   `loadSchema(paths: string | string[]): Promise<void>`:
    Loads schema files from specified paths without immediate compilation.
-   `loadSchemaFromString(jsonString: string, filePath: string): void`:
    Loads a schema from a JSON string. The `filePath` determines the prefix (e.g., `orders/permissions.dmrl.json` becomes `orders:permissions`).
-   `compileSchemas(): Promise<void>`:
    Compiles all schemas loaded via `loadSchema` or `loadSchemaFromString`.
-   `schemaHasCompiled(): boolean`: Returns `true` if schemas are loaded and compiled.
-   `getSchema(): RootSchema | boolean`: Returns the compiled schema object or `false` if not compiled.
-   `extendSchema(path: string)`: Allows dynamic modification of a compiled schema at a specific `path`. Returns an object with methods:
    -   `set(value: any)`: Sets/overwrites a value.
    -   `unset(keyToRemove: string)`: Removes a key from an object.
    -   `push(value: any)`: Adds value(s) to an array.
    -   `remove(elementName: any)`: Removes an element from an array.
    *Note: Modifications trigger schema re-validation.* 

### Authorization

-   `authorize(drna: ["Action" | "Ressource", string], policies: Policy[], context: { variables: Record<string, unknown> }, options?: { pathOnly?: boolean }): Promise<{ valid: boolean, query: object }>`:
    Checks if the provided `policies` grant access to the specified `drna` based on the `variables`. 
    -   `options.pathOnly`: If `true`, ignores dynamic parameters in DRNA matching and focuses only on the base path and hardcoded parameters.
    -   Returns `{ valid: boolean, query: object }`. `query` contains merged database query fragments generated by `ToQuery` conditions.
-   `authorizeBulk(drnaArray: string[][], policies: Policy[], options?: { ignoreConditions?: boolean }): Promise<string[]>`:
    Checks path access for multiple DRNAs. **Does not evaluate conditions by default** (`ignoreConditions: true`). Useful for UI generation (e.g., menus) based on potential access, not for strict access control.
    Returns an array of allowed DRNA strings (e.g., `"Action,orders:createOrder"`).

### Policy Compilation & Validation

-   `compilePolicies(policies: Policy[]): Map<number, _CompilationResults>`:
    Validates an array of policies against the loaded schema. Returns a Map with validation results per policy index.

### Linter & Schema Introspection

-   `getLinter(): DimrillLinter`: Returns the linter instance (requires schema to be compiled).
-   `validateVariables(path: string, variables: Record<string, unknown>): LinterError[]`:
    Validates provided `variables` against the schema definition at the given DRNA `path`.
-   `getSchemaDetails(path: string): SchemaDetails | null`:
    Retrieves detailed schema information (Variables, Arguments, Conditions, Type) for a specific DRNA `path`.

*(See `src/types/custom.d.ts` for `_CompilationResults`, `LinterError`, and `SchemaDetails` types)*

## Schemas In Detail

Schemas define the structure of your authorization endpoints using a nested object format. Each endpoint must have a `Type` property.

```json
{
  "topLevel": {
    "subLevel": {
      "endpointName": {
        "Type": ["Action", "Ressource"], // Can be Action, Ressource, or both
        "Description": "Optional description for the endpoint.",
        "Arguments": { // Defines expected parameters in the DRNA string
          "argName": {
            "type": "string" | "number",
            "enum": ["allowed", "values"] // Optional: Restrict values
          }
        },
        "Variables": { // Defines variables expected in the authorize() context
          "varName": {
            "type": "string" | "number" | "boolean" | "array" | "objectId" | "objectIdArray" | "date",
            "required": true // Optional: Fails authorization if missing
          }
        },
        "Condition": { // Defines rules for conditions used in policies
          "Operators": ["StringEquals", "NumericGreaterThan"], // Allowed operators
          "QueryOperators": ["InArray"], // Allowed operators for DB query generation
          "QueryEnforceTypeCast": { // Force type casting for specific keys in DB queries
            "userId": "ToObjectId"
          },
          "Enforce": { // Conditions always applied, regardless of policy
            "Bool": { "isActive": true }
          }
        }
      }
    }
  }
}
```

## Policies In Detail

Policies are arrays of objects, each containing a `Version` and an array of `Statement` objects.

```json
[
  {
    "Version": "1.0",
    "Description": "Optional description for the entire policy.",
    "Statement": [
      {
        "Effect": "Allow", // or "Deny"
        "Description": "Optional description for this specific statement.",
        "Action": [ // Target Action DRNAs
          "orders:createOrder", 
          "orders:updateOrder&status/pending"
        ],
        "Ressource": [ // Target Ressource DRNAs
          "files:read&ownerId/{{$userId}}", // Use {{var}} for dynamic params
          "reports:*" // Wildcard matching
        ],
        "Condition": { // Optional conditions
          "Operator[:Modifier][:Modifier][:TypeCast]": {
            "schemaVariableOrPath": "valueOrVariable",
            "anotherKey": ["array", "of", "values"]
          }
        }
      }
      // ... more statements
    ]
  }
  // ... more policies
]
```

-   `Effect`: Determines if the statement grants (`Allow`) or revokes (`Deny`) permission. `Deny` takes precedence.
-   `Action`/`Ressource`: Arrays of DRNA strings this statement applies to. Wildcards (`*`) can match segments. Variables (`{{$varName}}`) are substituted from the `authorize` context.
-   `Condition`: An object where keys define conditional logic using operators.

## Conditions In Detail

Condition keys follow the format: `MainOperator[:LogicalOperator][:QueryOperator][:TypeCast]`

-   **Main Operators:** Perform the core comparison (e.g., `Equals`, `NotEquals`, `NumericGreaterThan`, `InArray`, `ArraysIntersect`).
-   **Logical Operators:** (Optional) `AnyValues` (OR logic) or `EveryValues` (AND logic, default).
-   **Query Operator:** (Optional) `ToQuery`. If present, the condition isn't evaluated directly but translated into a database query fragment (currently MongoDB only).
-   **Type Caster:** (Optional) Forces the *right-hand side* value(s) to a specific type before comparison (e.g., `ToString`, `ToNumber`, `ToObjectId`, `ToDate`, `ToArray`, `ToObjectIdArray`).

*Example Condition Block:*

```json
"Condition": {
  // Checks if accountStatus is 'active'
  "StringEquals": {
    "accountStatus": "active"
  },
  // Generates a MongoDB query fragment checking if role is in ['admin', 'editor']
  "InArray:ToQuery:ToString": {
    "userRole": ["admin", "editor"]
  },
  // Checks if *any* of the department IDs are present in the user's departments array (requires objectId casting)
  "InArray:AnyValues:ToObjectIdArray": {
     "{{$userDepartments}}": ["deptId1", "deptId2"]
  }
}
```

*(See the full list of operators in the code or previous README versions)*

## Security Considerations

-   **Policy Integrity:** Ensure policies originate from a trusted source and cannot be tampered with. User-defined policies require careful validation and potentially restrictive schemas.
-   **Wildcards:** Be cautious with wildcard policies (`*`) as they grant broad access. Use specific DRNA paths whenever possible.
-   **Input Validation:** Always validate and sanitize user input *before* passing it to `authorize` as `variables`, especially if using conditions or dynamic DRNA parameters.
-   **`unsafeEquals`:** Avoid enabling `unsafeEquals` unless you fully understand the risks and have robust input validation, as it bypasses type casting designed to prevent potential injection vectors in query generation.
-   **Schema Conditions:** Utilize `Enforce` blocks within schema `Condition` definitions for rules that must always apply, regardless of the policy.

## Linter Usage

The built-in linter helps validate schemas and variables, useful for development and IDE integration.

```typescript
const dimrill = new Dimrill();
// ... load schemas ...

// 1. Get Schema Details for a Path
const details = dimrill.getSchemaDetails("orders:createOrder");
console.log(details?.variables);

// 2. Validate Variables
const errors = dimrill.validateVariables("orders:createOrder", {
  userId: 'user-456', 
  orderValue: 'not-a-number' // Invalid type
});
if (errors.length > 0) {
  console.error("Validation Errors:", errors);
}

// 3. Format Errors for IDEs (Example)
const linter = dimrill.getLinter();
const ideErrors = linter.formatForIDE(errors);
// 'ideErrors' can be used with language servers or editor plugins
```

The linter validates against all defined variable types (`string`, `number`, `boolean`, `array`, `date`, `objectId`, `objectIdArray`) and checks for required fields.
