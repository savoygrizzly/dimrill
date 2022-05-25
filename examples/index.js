const Dimrill = require("../index");

const Schema = {
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
};

const extendedSchema = new Dimrill.Schema(Schema);
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

const Policies = [
  {
    Version: "2022-05-02",
    Statement: [
      {
        Effect: "Allow",
        Action: ["files:createFile:*fileName/Mission-Report"],
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

Dimrill.initialize({
  Schema: extendedSchema,
});

let authorizer = Dimrill.authorize(
  ["Action", "files:createFile"],
  Policies,
  req,
  user,
  context
);
console.log(authorizer);

authorizer = Dimrill.authorize(
  ["Ressource", "files:getFile"],
  Policies,
  req,
  user,
  context
);
console.log(authorizer);
