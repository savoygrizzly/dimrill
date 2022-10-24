const Dimrill = require("../../../lib");

const { context, findPolicyById } = require("./hooks/getPolicies");
/*
  Let's import all our schemas
*/
const agentsSchema = require("./schemas/agents.dmrl.js");
const targetsSchema = require("./schemas/targets.dmrl.js");

/*
  We'll combine all the schemas into a single object so we can pass it to initialze Dimrill
*/
const Schema = new Dimrill.Schema(
  /*
    We are adding them to the "system" property, that will prefix all of our paths with "system".
    However we could use multiple properties to have different prefixes if need be.
    
    Remeber that Schemas are meant to describe the logic of your app's authorization flow.
    It's therefore worth taking a minute to think about the way you want to describe it. Keep it simple and consistent.

  */
  { system: { ...targetsSchema, ...agentsSchema } },
  /*
    Here we will pass the options
  */
  {
    debug: true,
    strict: true,
  }
);
/*
  Now We initialize Dimrill, passing it our Schema as well as choosing mongo for our DB adapter
*/
Dimrill.initialize({
  options: { adapter: "mongo" },
  Schema: Schema,
});
Dimrill.addHook(findPolicyById, context);
/*
  And finally we export it so we can use it
*/
module.exports = Dimrill;
