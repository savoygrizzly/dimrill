# Dimrill Authorization system

**2.0.0 UPDATE**

Parameters syntax changed. Now defined as follow `service:subService&paramter1/value&parameter2/*&param3/something`.

Params are now self reordering to match any other params if a wild card is defined: `service:subService&paramter1/forcedValue&*` or `service:subService*&paramter1/forcedValue`, fixing many issues that could disregard policies and are now fully usable.

Added `Dimrill.generateCompiledPolicies([Array: policies])`

`Dimrill.createRessourcesMap([Array: pages],[Array: policies])` has been added to create a partial match against rdna paths. Thus making is easy to create a sitemap of accessible ressources for given policies.

## Introduction

Dimrill is a policy based authorization module designed to be quickly used inside a JS backend middleware (express, fastify) , in short it is designed to decide whether or not a certain user has the rights to access ressources or to perfom action in an Authorization flow.
It is meant to be added after the authentification of the request has taken place, (after you checked for a valid JWT for example).

By being policy based rather than role based, Dimrill offers a more granular and custom control over your authorization process. What's more, it doesn't enforce a way for you to apply policies, giving you complete freedom.

Please see the [wiki](https://github.com/sosickstudio/dimrill/wiki/Home/) for more informations.

## Quickstart

First of all, add Dimrill to your project using your favorite package manager.

`yarn add dimrill`

or

`npm install dimrill`

From there on you only need to follow 3 more steps to have dimrill implemented:

- Describe your authorization flow in a Schema
- Create a Policy
- Implement the Dimrill method

Let's get it started.

```Javascript
const Dimrill = require("dimrill");

/*
  Let's create a simple Schema to describe our authorization flow.
*/
const Schema = new Dimrill.Schema({
  files: {
    getFile: {
      Ressource: true,
    },
    createFile: [
      {
        name: "fileName",
        Action: true,
      },
    ],
  },
});

/*
  Now let's make a simple Policy for that Schema
*/
const Policies = [
  {
    Version: "2022-05-02",
    Statement: [
      {
        Effect: "Allow",
        Action: ["files:createFile&fileName/Mission-Report"],
        Ressource: ["files:getFile"],
        Condition: {
          StringEquals: {
            "${user:agentId}": "007",
          },
        },
      },
    ],
  },
];

/*
    For this example and to simplify we'll set Policies, req, user and context manually.
    Keep in mind that:
        - The request (req) will have to be passed to the middleware by express or the framework of your choosing.
        - The user object (user) will have to be extracted from a DB, JWT, or whatever you are implementing to the middleware.
        - The context object (context) will have to be supplied from DB or whatever you want it to be, or be an empty object.
    And finally, the Policies (Altough it is recommended that those are associated in DB to your user), will have to be supplied to Dimrill for every request you wish to authorize
*/
const req = {
    /*
        Note that here, to keep this example basic, req parameters are already extracted from req.body/req.query or whatever the case may be.
    */
    fileName: "Mission Report",
  },
  user = {
    agentId: "007",
    affiliation: "MI6",
    birthdate: "1988-01-05 08:17:51",
    firstName: "James",
    lastName: "Bond",
    rights: ["toKill", "toDrink"],
    weapons: {
      gun: "Beretta",
      watch: "Rolex",
    },
  },
  context = {};

/*
  Finally we'll initialize Dimrill
*/
Dimrill.initialize({
  Schema: Schema
});
/*
  Voilà ! We can now use Dimrill as follow
*/
async function authorize() {
  let authorizer = await Dimrill.authorize(
    ["Action", "files:createFile"],
    Policies,
    req,
    user,
    context
    );
  return authorizer;
}

console.log(authorize()); //{valid:true, query:{}}

```

Even though that exemple isn't really how you would implement Dimrill in real case scenario that gives you a rough idea of how quick and simple it would be to setup.
