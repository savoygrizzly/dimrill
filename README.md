# Dimrill

**VERSION 4.X.X**

Release notes:

- Added `$or` operator to conditions
- Removed `req`, `user`, `context` from the authorizer
- Added `ArraysIntersect` and `ArraysNoIntersect` operators
- Added `NotInArray` operator to `ToQuery` operators
- Linter in progress

## What is Dimrill?
Dimrill is a policy-based authorization framework for NodeJS that helps you implement fine-grained access control. Rather than using traditional role-based authorization with fixed roles like "admin" or "user", Dimrill allows you to define dynamic permissions based on:

- What resource is being accessed (e.g. files, orders)
- What action is being performed (e.g. read, create, update) 
- The specific context of the request (e.g. parameters, user attributes)

At its core, Dimrill uses DRNA (Dynamic Resource Naming Authority) to define authorization rules through:

1. **Schemas** - Define the structure of your resources and actions:
   - What resources and actions exist in your system
   - What parameters are required/allowed for each
   - What conditions need to be validated

2. **Policies** - Define who can access what:
   - Grant or deny permissions to users/entities
   - Specify allowed resources and actions
   - Set conditions and constraints

Here's how it works - first you define a schema that specifies your authorization model:

```json
{
  "files": {
    "createOrder": {
      "Type": ["Ressource", "Action"],
      "Arguments": {
        "pricelist": {
          "type": "string",
          "enum": ["public", "distributor"],
        },
        "currency": {
          "type": "string",
          "enum": ["EUR", "USD"],
        }
      },
      "Variables": {
        "pricelist": {
          "type": "string",
          "required": true,
        },
        "currency": {
          "type": "string",

        }
    }
  }
}
```

And a policy that lets you define who:

```json
[
  {
    "Version": "1.0",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": ["files:createOrder&pricelist/*"]
      }
    ]
  }
]
```

A user or entity with this policy attached will be allowed to create an order with whatever pricelist (note the wildcard after the parameter name `*`), and since no other parameters are defined, all values will be allowed (same as doing `files:createOrder&*`).

If we wanted to restrict our user or entity to only create orders with a pricelist of distributor and in USD we could change that policy to:

```json
[
  {
    "Version": "1.0",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": ["files:createOrder&pricelist/distributor&currency/USD"]
      }
    ]
  }
]
```

We can also access the dynamic parameters from the variables object:

```json
[
  {
    "Version": "1.0",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": ["files:createOrder&pricelist/distributor&currency/USD"]
      }
    ],
    "Condition": {
      "StringEquals": {
        "{{$pricelist}}": "distributor",
        "{{$currency}}": "USD"
      }
    }
  }
]
```

This assumes `pricelist` and `currency` are passed to dimrill as variables. If they are not and not marked as required an empty string will be used instead.

## Code example

First install dimrill: `npm install dimrill`.

To implement the example above, we just need to follow a few steps.

Saving the schemas to a file, make sure the schema(s) are valid JSON objects, and save them in a file with either one of the `.dmrl` or `.dmrl.json` extensions.

Initialize Dimrill and autoload the schemas:

```javascript
const Dimrill = require("dimrill").default;
const path = require("path");
const DimrillAuthorizer = new Dimrill();

await DimrillAuthorizer.autoload(path.join(__dirname, "schemas")); // or a string pointing to the directory where schemas are saved
/*
    Dimrill will now iterate the directory and read all files ending with the .dmrl extension.
    Files will then be compiled and the schema will be initialized
*/

const valid = await DimrillAuthorizer.authorize(
  [
    "Action",
    "files:createOrder",
  ] /* The DRNA to be matched, composed of a Type of either Action or Ressource, and a string pointing to a schema endpoint. The string will be extended using the parameters defined in the schema using the values passed with {variables} if a value is empty the parameter will be ignored.

      In order to enforce the match of parameters, you can specify them, eg. "files:createOrder&pricelist/distributor" will only match if:
        A policy Statement specifies a wildcard on a higher portion of the path eg: files:*
        A policy Statement specifies a wildcard on parameters eg: files:createOrder&* or files:createOrder&*
        A policy Statement specifies the exact same value on the parameter eg: files:createOrder&pricelist/distributor
      */,
  /*

        The policies array of the user, entity. Most likely fetched when authentifying the request.
    */
  [
    {
      Version: "1.0",
      Statement: [
        {
          Effect: "Allow",
          Action: ["files:*"],
        },
      ],
    },
  ],
  {
    variables: {
       // [key: string]: any
    }, //the variables passed to the authorizer
  },
  {
    pathOnly: false /* When this option is set to true, dimrill will ignore parameters that aren't hard coded in the DRNA to be matched ("files:createOrder&pricelist/distributor" will require the pricelist param to be equal to distributor;
        "files:createOrder" will validate if a policy Statement specifies anything  with the path "files:createOrder" or a higher wildcard (* or files:*).

        */,
  },
);
/*
Will return a value in the following format.
{
    valid: boolean
    query: object
}
*/
```

All policies passed to `authorize` will be iterated, if a single one is matched and has conditions argument (that pass), `valid` will be true.

The `query` operator will be populated by the conditions with a `ToQuery` modifier, adapted to the specified DB lamguage platform (currently only mongodb is supported). The query will hold a merge of all policy matched.

Should a condition argument for a matched policy Statement, with all conditions containing the `ToQuery` modifier, valid will be true as the condition only contains a query that needs to be translated.

## Security considerations

When usign Dimrill your authorization process will rely on the policies passed to the authorizer to define whether a user/entity is allowed to access a ressource or perform an action. It is therefore **imperative** to ensure that policies originate from a trusted source and cannot be corrupted or modified.
If you intend to allow policies to be written by users you have to accept and understand the implications. **Dimrill currently does not provide any features other than Schema Conditions and hard coded paths to limit what all users can perform.**
Considering that if a user is given a wildcard policy, he will be able to access all paths specified, on the Drna Type on which this wildcard applies, for example:
This policy will give a user/entity access to every available Action and Ressource.

```json
[
  {
    "Version": "1.0",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": ["*"],
        "Ressource": ["*"]
      }
    ]
  }
]
```

And the following allows a user to access all schema portions for files, both for Action and Ressource.

```json
[
  {
    "Version": "1.0",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": ["files:*"],
        "Ressource": ["files:*"]
      }
    ]
  }
]
```

The only cases in which this might not return true is where a Condition Enforce is defined in a schema and the user/entity does not meet the condition requirement, or is limited by the query returned by the adapter (if the enforced condition has a `ToQuery` modifier).


It's  strongly recommended to implement your own app validation logic and to validate any user data you might want to pass to Dimrill matches the expected types beforehand
If you know the data passed to Dimrill to be clean, you can disable it globally when creating the instance or case by case via the options on `authorize`.

Because Dimrill can generate queries, it is important to ensure that the user input is validated before being passed to Dimrill. Currently with the only "out of the box" adapter supported being MongoDB, the major injection risk resides if you pass unvalidated and unsanitized input to `Equals` or `NotEquals` operators without an `EnforceTypeCast` in the schema (and if your policy also doesn't specify one). If you are using the `ToQuery` modifier and have enabled `unsafeEquals` via Dimrill constructor, you should ensure that the input is validated and sanitized before being passed to Dimrill even if given the generated query's structure injection risks are low.

## Dimrill methods

```
new Dimrill(options?
    {
        schemaPrefix: string, prefix all schemas with provided prefix, default "",
        unsafeEquals:boolean, default false //notEquals and Equals without catsing objects to string for comparison
    }
):Dimrill
```

### Options details


`schemaPrefix`:
Prefixes all schemas with the specified value.



### Methods


`autoload(directoryPath: string):Promise<void>`:

Autoload and compile all files ending with `.dmrl` in the specified directory as Schemas.
The schema will then be initialized and other files cannot be added.

`loadSchema(string | string[]):Promise<void>`:

Loads files at the specified paths but does not initialize the Schemas.

`compileSchemas():Promise<void>`:

Compile schemas loaded with `loadSchema` and initialize the Schemas.

`schemaHasCompiled():boolean`:

Returns true if Schemas have been initialized.

`getSchema():RootSchema`:

Returns the compiled schemas.

`extendSchema(path:string)`:

Where path is a dot notation object path, eg: "files.createOrder".
Has to be chained with one of the following methods:

```
.set(value: object)
.push(value: array | string | number)
.slice(value: string)
.unset(value: string)
```

The `set` method will modify an endpoint (specified in) or its sub-properties.
The `push` method will modify an endpoint or its sub-property array.
The `remove` method will remove the specified value from an endpoint or its sub-property array.
The `unset` method will remove the specified value from an endpoint or its sub-property object.

All methods will trigger a re-validation of the modified portion of the Schema and throw an error should the validation fail.

`compilePolicies([policies]):Map(number, CompilationResults)`:

Validates all policies passed in array, the results will be mapped with the index of the policy in the passed array.
Returned object have the following structure:

```
{
  effects: [string],
  drna: [
    {
        valid: boolean,
         message: {
            [drnaString]:Error message
         }
    }
  ],
  conditions: [
        [
            {
                valid: boolean,
                message: {
                    [operators]:Error message
                 };
            }
        ]
  ],
}
```

```
authorize(
  [ "Action"|"Ressource",drna:String ], policies[], { req?:{}, user?:{}, context?:{},variables?:{} },
  {validateData?:boolean, pathOnly?:boolean}
  ):Promise<{valid: boolean, query:{} }>
```

Authorize the request against provided DRNA Type and string, returns a Promise.

`authorizeBulk([ "Action"|"Ressource",drna:String ][], policies[], {ignoreConditions?:true}):Promise<string[]>`

**This method is not meant to authorize access**

Authorize an array of DRNA, by default this method **will not validate conditions, drna parameters, nor return generated queries**, it also does not currently accept validation objects (req, user, context).
The goal of this method is to help _define_ what ressources a user _might_ have access to based on drna paths.

This method might come in handy if say, you wanted to generate a menu dynamically, depending on a user or entity's policies.

The method will return strings in the following format: `"Action | Ressource",drna:stringSupplied`.

## Schemas

Schemas have to be designed using the following system:

```
topPortion
    subPortion
            ...
            this is an endpoint
                {
                    Type:["Action" | "Ressource" | "Action","Ressource"]
                    //Optional
                    Arguments?:{
                        argumentName:{
                            type:"string" | "number" //the type of the argument value, note that as of now all args are cast as string.
                            enum?:[string] //(optional) allowed values
                            dataFrom?:string //The path of the value to retrieve inside of the objects passed to authorize (in dot notation), eg "req.body.pricelist"
                            value?:string | number //the value to use, if present, will override dataFrom
                        }
                    },
                    Variables?:{
                      variableName:{
                        type:
                          | "string"
                          | "number"
                          | "boolean"
                          | "array"
                          | "objectId"
                          | "objectIdArray"
                          | "date"; //the type of the argument value.
                        required?:boolean //(optional) whether the variable is required or not
                    },
                    Condition?:{
                        Enforce?:{
                            //The conditions to enforce, will be added to each authorize regardless of the policy matched
                        },
                        Operators?:[
                            string,
                            //the Operators allowed to be run by the authorize process
                        ],
                        QueryOperators?:[
                            string,
                            //the Operators allowed to be used in query generation by the authorize process
                        ],
                        "QueryEnforceTypeCast": {
                        /*
                            If specified each keys matched in a Condition with ToQuery (also applies to Enforced ones) will be cast to the specified type, this will override other specified casting types provided in a condition statement.
                        */
                             [key: string]: "Type" //See type casters list in Conditions for valid types
                        }
                    }
                }
    anotherSubPortion:
        {
            //this is another simpler endpoint
            Type:["Action"]
        }

```

## Conditions

Conditions are defined as follow:

`operator:operator:operator:castToType`

Conditions key accept a maximum of 4 operators, case sensitive, with a limit to 1 of each type:

Main-operator, define what operation to match, think of `==`, `!=`, `array.includes(...)`.
The allowed main-operators are:

```
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
"ArraysIntersect", // not allowed with ToQuery
"ArraysNoIntersect", // not allowed with ToQuery
```

Each operators accept 2 arguments `(left,right)`

Note that by default `InArray` will cast the value to string if the right value is an object in order to prevent possible injections into mongodb.

By default with the option `unsafeEquals` set to false, `Equals` and `NotEquals` will cast the right value to `String` if the value is an object in order to prevent possible injections. This behavior can be overriden by setting `unsafeEquals` to true in the Dimrill constructor.

A logical operator, either `AnyValues` or `EveryValues` (think and/or). When such operator is present it will check that either all or at least one of the values passed in the block returns true when validated against the main operator. `EveryValues` being the default behavior.

When `AnyValues` is used in `ToQuery` mode, it will be translated to `$or` in mongodb.

A `ToQuery` Operator, if this operator is present the condition will not be verified but instead adapted in the specified DB query language (currently only mongodb is supported). The query will be returned in the `query` property of `authorize` response.

A type caster operator, which will cast all the right side values in the block to the type specified by the operator.
Allowed casting operators currently are:

```
"ToString",
"ToNumber",
"ToObjectId",
"ToObjectIdArray",
"ToArray",
"ToDate",
```

## Policies

Policies are valid JSON arrays of objects.

```
[
    {
        Version:string,
        Statement:[
            {
                //One statement
                Effect:"Allow" | "Deny",
                Ressource?:[
                    string //drna strings
                ],
                Action?:[string], //drna strings
                Condition?:{
                    "StringEquals":{
                        ...
                    },
                    ...
                }
            },
            {
                //Another statement
            },
        ]
    }
]
```

For a Statement to be matched, it should hold a DRNA Type definition (Ressource or Action) with the same one as required by `authorize` and at least one of the drna strings it contains must match the DRNA required by `authorize`.
If a statement has a Condition containing blocks without the operator `ToQuery`, the Condition should be valid for the Statement to be considered true.

## Linter

The linter is a tool that helps validate schemas, variables, and provides schema information for IDE integration. It can be used to:

1. Get schema details for a DRNA path:
```typescript
const dimrill = new Dimrill();
await dimrill.autoload("path/to/schemas");

const details = dimrill.getSchemaDetails("blackeye:files:orders:allowedProductCategories");
// Returns:
{
  variables: {
    pricelist: { type: "string" },
    orderCurrency: { type: "string", required: true },
    // ...
  },
  arguments: { ... },
  conditions: { ... },
  type: ["Action", "Ressource"]
}
```

2. Validate variables against a schema:
```typescript
const errors = dimrill.validateVariables("blackeye:files:orders:allowedProductCategories", {
  orderCurrency: 123, // wrong type
  // missing required variables
});
// Returns:
[
  {
    type: 'variable',
    message: 'Variable "orderCurrency" must be a string',
    path: 'orderCurrency',
    expected: 'string',
    received: 'number'
  }
]
```

3. Format errors for IDE integration:
```typescript
const linter = dimrill.getLinter();
const formattedErrors = linter.formatForIDE(errors);
// Returns format compatible with code editors:
{
  markers: [{
    startRow: 0,
    startCol: 0,
    endRow: 0,
    endCol: 1,
    className: 'dimrill-error-variable',
    type: 'text',
    text: 'Variable "orderCurrency" must be a string'
  }],
  annotations: [...]
}
```

The linter supports validation for all variable types defined in the schema:
- string
- number
- boolean
- array
- date
- objectId
- objectIdArray

It can be used both programmatically and for IDE integration to provide real-time validation feedback.
