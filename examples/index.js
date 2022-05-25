const Dimrill = require("../index");

const Schema = require("./schemas/schema");

const extendedSchema = new Dimrill.Schema({
  secretsystem: Schema,
});
/*
    For this example and to simplify we'll set Policies, req, user and context manually.
    Keep in mind that:
        - The request (req) will have to be passed to the middleware by express or the framework of your choosing.
        - The user object (user) will have to be extracted from a DB, JWT, or whatever you are implementing to the middleware.
        - The context object (context) will have to be supplied from DB or whatever you want it to be.
    And finally, that the Policies (Altough it is recommended that those are associated in DB to your user), will have to be supplied to Dimrill for every request you wish to authorize
*/
const req = {
    /*
        Note that here, to keep this example reaaaally basic, req parameters are already extracted from req.body/req.query or whatever the case may be.
    */
    body: {
      agentId: "007",
      targetName: "Renard",
      organizationId: "caseSensitive",
    },
    query: {
      agentId: "007",
    },
    params: {},
    method: "POST",
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
  context = {
    target: {
      name: "Renard",
      nationality: {
        name: "Russian",
        country_code: "RU",
      },
    },
  };

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
        Action: [
          "secretsystem:targets:createTarget:*:organizationId/caseSensitive",
        ],
        Ressource: ["secretsystem:targets:getTarget*"],
      },
      {
        Effect: "Allow",
        /*
            Here we'll allow Bond to update the agent informations in the system.
            We only allow it if the agentId passed to the request is his
        */
        Action: [
          "secretsystem:agents:updateAgentInformations:agentId/${req:agentId}",
        ],
        Ressource: ["secretsystem:agents:getAgentDetails"],
        /* 
            To make sure he doesnt cheat we will add some conditions to that policy's statement.
        */
        Condition: {
          /*
            First let's check that the agentId specified in the request matches the ones in bond's user object.
          */
          StringEquals: {
            "${req:query.agentId}": "${user:agentId}",
          },
          /*
            We could also add this line to the returned query. 
            That way we could add the returned context to the DB call that will update the informations
          */
          "ToContext:StringEquals": {
            agentId: "${user:agentId}", //will return {user.id:"bond"}
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

Dimrill.initialize({
  options: { adapter: "mongo" },
  Schema: extendedSchema,
  req: [],
});

let authorizer = Dimrill.authorize(
  ["Action", "secretsystem:targets:createTarget"],
  Policies,
  req,
  user,
  context
);
console.log(authorizer);

authorizer = Dimrill.authorize(
  ["Ressource", "secretsystem:agents:getAgentDetails"],
  Policies,
  req,
  user,
  context
);
console.log(authorizer);
