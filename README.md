# Dimrill Authorization system

## Dimrill RNA (DRNA)

### What the heck is Dimrill ?

Dimrill is a policy based authorization module for JS backends, in short it is designed to decide wether or not a certain user has the rights to access ressources or to perfom action in an Authorization flow.
It is meant to be added after the authentification of the request has taken place, (after you checked for a valid JWT for example).

By being policy based rather than role based, Dimrill offers a much finer granular and custom control over authorization, what's more it doesn't enforce a way to apply policies, giving you complete freedom.

### Quickstart

First of all, add Dimrill to your prject using your favorite package manager.

`yarn add dimrill`

or

`npm install dimrill`

- We will use a simple expressJS example even though Dimrill isn't specifically as an express middleware, so you can use it with the framework or even deployment method of your choice.

```Javascript
//app.js
const express = require('express')
const app = express()
const port = 3000

app.get('/', authorizeToken(),req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
```

```Javascript
//authorization middleware
const jwt = require('jsonwebtoken');

function authorizeToken(req, res, next) {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (token == null) return res.sendStatus(401)

  jwt.verify(token, process.env.TOKEN_SECRET as string, (err: any, user: any) => {
    console.log(err)

    if (err) return res.sendStatus(403)

    req.user = user

    next()
  })
}
```

###

### General Expression

Starts with `servicename` in lowercase.
The expression must go down the logical path to the targeted function, each step being separated by `:`, considering the following structure:

`service:categoryOne:subCategory:functionTargeted`

Each step must start with a lowercase letter should be written in `camelCase` styled syntax for increased readability, although no style is enforced. There is no limitation on the number of steps.

### Schemas

A Schema is a way to describe the possible paths and parameters for a policy expression.
At the end of each paths the object must contain either a child object with either or both of the keys `Action` or `Ressource` with a Boolean value. If the path takes parameters, the possible parameters must be supplied as an array of object with the key `name`containing the name of the parameter and either or both of the keys `Action` or `Ressource` with a Boolean value.

Schemas have to be generated using the Dimrill.Schema class.

```Javascript
new Dimrill.Schema(
  {
    secretsystem: {
      targets: {
        getTarget: {
          Ressource: true,
        },
        createTarget: [
          {
            name: "targetName",
            Action: true,
          },
          {
            name: "organization",
            Action: true,
          },
          {
            name: "id",
            Ressource: true,
            Action: true,
          },
        ],
      },
      agents: {
        createAgent: {
          Action: true,
        },
        getAgent: {
          Action: true,
          Ressource: true,
        },
        updateAgentInformations: {
          Action: true,
        },
      },
    },
  }
);
```

When using complex authorization structures it is best practice to separate the Schema objects into separate files and to compile them all at the end.

```Javascript
//schemas/new-target.dmrl.js
const newTargetSchema = {
  targets: {
    getTarget: {
      Ressource: true,
    },
    createTarget: [
      {
        name: "targetName",
        Action: true,
      },
      {
        name: "organizationId",
        Action: true,
        Ressource: true,
      },
    ],
  },
};
module.exports = newTargetSchema;
```

```Javascript
//schemas/agents.dmrl.js
const agentsSchema = {
  agents: {
    createAgent: {
      Action: true,
    },
    getAgent: {
      Action: true,
      Ressource: true,
    },
    updateAgentInformations: {
      Action: true,
    },
  },
};
module.exports = agentsSchema;
```

```Javascript
//schemas/schema.js
const agentsSchema = require("./agents.dmrl.js");
const targetsSchema = require("./targets.dmrl.js");
module.exports = { ...targetsSchema, ...agentsSchema };
```

You can then use the object from `schemas/schema.js` where you choose to implement Dimrill:

```Javascript
//middleware/some-middleware.js
const Dimrill = require("../index"); //need to replace by "dimrill" when package is published

const Schema = require("./schemas/schema");

const compiledSchema = new Dimrill.Schema(
  {
    secretsystem: Schema,
  }
);
```

Let's see this schema implemented with the following example.

To keep this example simple we'll set Policies, req, user and context manually inside the middleware. In practice this will never be the case.
Keep in mind that:

- The request (req) will have to be passed to the middleware by express or the framework of your choosing.
- The user object (user) will have to be extracted from a DB, JWT, or whatever you are implementing to the middleware.
- The context object (context) will have to be supplied from DB or whatever you want it to be.

```Javascript
//some-middleware.js

const Dimrill = require("../index");

const Schema = require("./schemas/schema");

const extendedSchema = new Dimrill.Schema({
  secretsystem: Schema,
});
/*
    Let's set them.
*/
const req = {
    /*
        Note that here, to keep this example reaaaally basic, req parameters are already extracted from req.body/req.query or whatever the case may be.
    */
    agentId: "007",
    targetName: "Renard",
    organizationId: "09092",
  },
  user = {
    agentId: "007",
    affiliation: "MI6",
    birthdate: "1988-01-05 08:17:51",
    name: "James John Bond",
    rights: ["toKill", "toDrink"],
    weapons: {
      gun: "Beretta",
      watch: "Rolex",
    },
  },
  context = {
    target: {
      name: "Renard",
      nationality: {
        name: "Russian",
        country_code: "RU",
      },
    },
  };
```

And then let's set the policies. Usually you would fetch those from a user profile in a DB, or from a file depending on your use case. Altough you could fetch those from a JWT it is **NOT** recommended due to the size multiple policies might add up to.

Policies will have to be supplied to Dimrill for every request you wish to authorize.

```Javascript
//some-middleware.js
//...
const Policies = [
  {
    Version: "2022-05-02",
    Statement: [
      {
        Effect: "Allow",
        /*
            We'll allow Bond to create any new target as long as the organization parameter is the one from Renard's (09092)
            We'll also allow him to see any targets in the system
        */
        Action: ["secretsystem:targets:createTarget:*:organizationId/09092"],
        Ressource: ["secretsystem:targets:getTarget*"],
      },
      {
        Effect: "Allow",
        /*
            Here we'll allow Bond to update the agent informations in the system.
            We only allow it if the agentId passed to the request is his
        */
        Action: [
          "secretsystem:agents:updateAgentInformations:agentId/${user:agentId}",
        ],
        /*
            To make sure he doesnt cheat we will add some conditions to that policy's statement.
        */
        Condition: {
          /*
            First let's check that the agentId specified in the request matches the ones in bond's user object.
          */
          StringEquals: {
            "${req:agentId}": "${user:agentId}",
          },
          /*
            We could also add this line to the returned query.
            That way we could add the returned context to the DB call that will update the informations
          */
          "ToContext:StringEquals": {
            "agentId": "${user:agentId}", //will return {user.id:"bond"}
          },
          /*
            In mongoose we could implement that by doing:

            agents.updateOne(authorizer.query,{newInfos}) which would read -> agents.updateOne({user.id:"bond"},{newInfos})

          */
        },
      },
    ],
  },
];
```

Then we can perform the initialization of Dimrill's module.

```Javascript
//some-middleware.js
//...

Dimrill.initialize({ options: { adapter: "mongo" }, Schema: extendedSchema });

```

Finally let's authorize some requests !

```Javascript
//some-middleware.js
//...
let authorizer = Dimrill.authorize(
  ["Action", "secretsystem:targets:createTarget"],
  Policies,
  req,
  user,
  context
);
console.log(authorizer); // { valid: true, query: {} }

authorizer = Dimrill.authorize(
  ["Action", "secretsystem:agents:updateAgentInformations"],
  Policies,
  req,
  user,
  context
);
console.log(authorizer); //{ valid: true, query: { 'agentId': '007' } }

```

### Parameters

Parameters are expressed as follow `:parameterName/parameterValue/parameterSubValue`.

Parameters can be written following `camelCase` syntax or not, it is recommended to keep consistency. There is no limitation on the number of expressed parameters.

The use of wildcards `*` is permitted, a wildcard will represent any combination of characters where it is placed.
For example, the wildcard in the following statement: `service:categoryOne:subCategory:*`
Allows access to any of the subsequent steps of `categoryOne:subCategory`

If a wildcard is used as a `parameterValue` or sub-value, it will represent any subsequent value or sub-values for that parameter.
For instance: `:parameterName/*` will include all the following:

```

:parameterName/parameterValue/parameterSubValue
:parameterName/parameterValue/parameterSubValue2/parameterSubSubValue
:parameterName/parameterValue/parameterSubValue2/parameterSubSubValue1
:parameterName/parameterValue/parameterSubValue3/parameterSubSubValue1
:parameterName/parameterValue/parameterSubValue3/parameterSubSubValue2
:parameterName/parameterValue/parameterSubValue3/parameterSubSubValue3
:parameterName/parameterValue/parameterSubValue4/parameterSubSubValue1/somethingElse

```

### Using variables

In Dimrill the 3 following variables are accesible in a policy scope:

`req` Which should contain the request sent to the server.
`user` Which should contain the data related to the user for which a resource acces is to be authentified.
`context` Thru which the implementation can pass along some context to help authentify the request, context can be anything from a DB document to a custom object.

All variables passed to Dimrill **MUST BE JS objects** with named and accesible properties.

Variables can then be accessed in a statement using the following syntax, similarly to ES6 templates string:

`${variable:property}`

Sub-properties can be accesed using the standard dot notation.

Consider the following example:

```Javascript

const context = {
    animalName:"Truffier",
    age:2,
    race:"Wild Board",
    abilities:[
        "fast_running",
        "truffles_finding",
        "giving_cuddles"
    ],
    body:{
        eyes:"blue",
        colors:{
            main:"brown",
            stripes:"black"
        }
    }
};

/*
    With the following context object is passed to Dimrill,

    ${context:animalName} -> Truffier
    ${context:age} -> 2
    ${context:body.eyes} -> blue
    ${context:body.colors.main} -> brown
    ${context:body.colors.stripes} -> black
*/

```

There is no depth limitation on objects. However considering our example and as of **version:1.0.0**, it is currently not possible to access array elements in variables.

```Javascript
/*
    The following will NOT work
    ${context:abilities.0} -> Error
    ${context:abilities[0]} -> Error
*/
```

Variables can be included in DRNA statements, using our above example the following statement:

`service:categoryOne:subCategory:functionTargeted:name/${context:animalName}`  
will translate to:

`service:categoryOne:subCategory:functionTargeted:name/Truffier`

It is possible to use multiple variables in the same expression:

`service:categoryOne:subCategory:functionTargeted:nameAndRace/${context:animalName}-${context:race}`

will yield:

`service:categoryOne:subCategory:functionTargeted:name/Truffier-WildBoar`

Variables expressed in `Ressource` or `Action` expressions will have all non-alphanumerical characters replaced by `""`.
