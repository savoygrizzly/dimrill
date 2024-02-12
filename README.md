# Dimrill

**VERSION 3.0.X**

Release notes:

Wildcards `*` for parameters are now required to be specified as `&*`or`&*/*`. Wildcard for parameters on endpoints specified like so `files:createOrder:*`or`files:createOrder*` **are now invalid**. In order to specify any paramters for an endpoint use`files:createOrder:&*`.

## What is Dimrill, and the philosophy behind it

Dimrill is a policy based authorization platform, it doesnt replace your JWT token, nor does it replace your login logic.
What it does is help you supplement a role based authorization (eg. an `admin` role for a user that can oversee eveyrthing, a `user` that can perform certain actions and then maybe a `manager` sitting in the middle of all that).

It is intended to act as an **authorization middleware** for complex roles handling, and will allow you to define "roles" dynamically based on the ressources and action required.

Dimrill is using something called `DRNA` as in Dynamic Ressource Naming Authority, in a way it helps you define via schemas which _Ressource_ (think `GET`) and _Action_, (think `POST`) you need to authorize, which arguments (think `req.params` or `request.body`) are required to be passed, and helps you define conditions for extra validation.

This is done by declaring a schema that let you define the what and the where:

```json
{
  "files": {
    "createOrder": {
      "Type": ["Ressource", "Action"],
      "Arguments": {
        "pricelist": {
          "type": "string",
          "enum": ["public", "distributor"],
          "dataFrom": "req.body.pricelist"
        },
        "currency": {
          "type": "string",
          "enum": ["EUR", "USD"],
          "dataFrom": "req.body.currency"
        }
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

If we passed `req.body` to Dimrill we could also implement a condition like so:

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
        "{{req.body.pricelist}}": "distributor",
        "{{req.body.currency}}": "USD"
      }
    }
  }
]
```

This assumes `pricelist` and `currency` are within the `req.body` and that the request body content is passed to dimrill.

## Code example

First install dimrill: `npm install dimrill`.

To implement the example above, we just need to follow a few steps.

Saving the schemas, make sure the schema(s) are valid JSON objects, and save them with the `.dmrl` extension

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
  ] /* The DRNA to be matched, composed of a Type of either Action or Ressource, and a string pointing to a schema endpoint. The string will be extended using the parameters defined in the schema using the values passed with {req, user, context } if a value is empty the parameter will be ignored.

      In order to enforce the match of parameters, you can specify them, eg. "files:createOrder&pricelist/distributor" will only match if:
        A policy Statement specifies a wildcard on a higher portion of the path eg: files:*
        A policy Statement specifies a wildcard on parameters eg: files:createOrder&* or files:createOrder&*
        A policy Statement specifies the exact same value on the parameter eg: files:createOrder&pricelist/distributor
        The "dataFrom" key in Arguments portion of the Schema points to an object (req,user or context), holding the same String value
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
    req: {}, //you can pass an object to req, typically your own req object
    user: {}, //the concerned user or object entity
    context: {}, //other properties that might be useful
  },
  {
    validateData: false /* By default this option is set to true, if a valid AJV schema is found under Variable when matching DRNA, the req, user, and context objects (if passed to dimrill); will be validated. Extra properties will be removed and type coerced. */,
    pathOnly: false /* When this option is set to true, dimrill will ignore parameters that aren't hard coded in the DRNA to be matched ("files:createOrder&pricelist/distributor" will require the pricelist param to be equal to distributor;
        "files:createOrder" will validate if a policy Statement specifies anything  with the path "files:createOrder" or a higher wildcard (* or files:*).

        */,
  }
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
If you intend to allow policies to be written by users you have to accept and understand the implications. **Dimrill currently does not provide any features other than Schema Conditions to limit what all users can perform.**
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

Under the hood dimrill uses the awesome `isolated-vm`, to prevent remote code injections, which requires compilation on install.
Please check the [documentation](https://github.com/laverdet/isolated-vm) for more informations.

Dimrill provides an easy solution using [AJV](https://github.com/ajv-validator/ajv) to validate the data objects passed to the autorizer.
It's however strongly recommended to implement your own app validation logic and to validate any user data you might want to pass to Dimrill.
If you know the data passed to Dimrill to be clean, you can disable it globally when creating the instance or case by case via the options on `authorize`.

## Dimrill methods

```
new Dimrill(options?
    {
        validateData:boolean, default true //Validate the data passed to authorizers
        ivmTimeout: number, default 500 //timeout for the ivm in ms
        ivmMemoryLimit: number, default 8, min 8 //max ivm memory in Mb
        schemaPrefix: string, prefix all schemas with provided prefix, default ""
    }
):Dimrill
```

Initialize Dimrill.

`autoload(directoryPath: string):Promise()`:

Autoload and compile all files ending with `.dmrl` in the specified directory as Schemas.
The schema will then be initialized and other files cannot be added.

`loadSchema(string | string[]):Promise()`:

Loads files at the specified paths but does not initialize the Schemas.

`compileSchemas():Promise()`:

Compile schemas loaded with `loadSchema` and initialize the Schemas.

`schemaHasCompiled():boolean`:

Returns true if Schemas have been initialized.

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
The `slice` method will remove the specified value from an endpoint or its sub-property array.
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

`authorize([ "Action"|"Ressource",drna:String ], policies[], { req?:{}, user?:{}, context?:{} }, {validateData?:boolean, pathOnly?:boolean}):Promise({valid: boolean, query:{} })`:

Authorize the request against provided DRNA Type and string, returns a Promise.

`authorizeBulk([ "Action"|"Ressource",drna:String ][], policies[], {ignoreConditions?:true}):Promise(string[])`

**This method is not meant to authorize access**

Authorize an array of DRNA, by default this method **will not validate conditions, drna parameters, nor return generated queries**, it also does not currently accept validation objects (req, user, context).
The goal of this method is to help _define_ what ressources a user _might_ have access to based on drna paths.

This method might come in handy if say, you wanted to generate a menu dynamically, depending on a user or entity's policies.

The method will retuyrn strings in the following format: `"Action | Ressource",drna:stringSupplied`.

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
                    },
                    Variables?:{
                        "type": "object",
                        "properties": {
                            req:{},//AJV Schema, see AJV doc
                            user:{}, //AJV Schema
                            context:{} //AJV Schema
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
```

Each operators accept 2 arguments `(left,right)`

Note that `Equals`, `NotEquals` and `InArray` will not cast the 2 arguments to a specific type, hence the **STRONG** recommendation to validate your data, either in app or using the Variables property in the Schemas. This might otherwise return false for specific cases.

A logical operator, either `AnyValues` or `EveryValues` (think and/or). When such operator is present it will check that either all or at least one of the values passed in the block returns true when validated against the main operator. `EveryValues` being the default behavior.
**These operators are currently not implemented with `ToQuery`**

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

## Dynamic parameters

It is possible to use dynamic parameters directly in the policies statements.
Dynamic parameters can be passed in drna strings as well as in conditions value (right one). Dynamic parameters will only have access to the `req`,`user`, and `context` objects passed to the authorizer. Paths must therefore start with one of these objects name.

In order to specify a dynamic parameter the following syntax has to be used `"{{req:yourparam:subParam}}"`, the value held at the specific path if one exists will be returned, note that characters `* & /` are forbidden in dynamic parameters and if one is found the returned value will be an empty string.

NB.
**Dynamic parameters cannot be used in the authorizer**

Examples:
In a condition:

```
Condition:{
    StringEquals:{
        "distributor":"{{req:body:pricelist}}"
    }
}
```

In a drna string: `files:createOrder&pricelist/{{req:body:pricelist}}`.
