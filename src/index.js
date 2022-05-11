"use strict";

const Adapters = require("./adapters");
const validateConditions = require("./operators/validate-condition");
const Schema = require("./schema/schema");

function initialize(...args) {
  this.adapter = args[0].options
    ? Adapters[args[0].options.adapter] ?? Adapters.mongo
    : Adapters.mongo;
  this.Schema = args[0].Schema;
  return this;
}

function verifyCondition(statement, req, user, context) {
  if (typeof this.adapter !== "object") {
    throw new Error("Bolt is not initialized");
  }
  /* serialize req, user and context params to be later access via object properties */
  req = { req };
  user = { user };
  context = { context };
  if (!statement) {
    return {
      hasContext: false,
      context: {},
      valid: true,
    };
  }
  if (!statement.Condition) {
    //Nothing to validate condition is empty
    return {
      hasContext: false,
      context: {},
      valid: true,
    };
  } else {
    //validate
    const condition = validateConditions(
      statement.Condition,
      req,
      user,
      context,
      this.adapter
    );
    return condition;
  }
}
function authorize(drna, policies, req, user, context) {
  const authorization = {
    valid: false,
    context: {},
  };
  const statement = this.Schema.matchPolicy(
    this.Schema.synthetize(drna, req),
    policies,
    req,
    user,
    context
  )[0];
  if (statement) {
    const condition = verifyCondition.call(this, statement, req, user, context); //pass down this to function
    if (condition.valid && statement.Effect == "Allow") {
      authorization.valid = true;
      authorization.context = condition.context;
    } else {
      authorization.valid = false;
      authorization.context = condition.context;
    }
  } else {
    authorization.valid = false;
    authorization.context = {};
  }
  return authorization;
}

module.exports = {
  authorize: authorize,
  initialize: initialize,
  Schema: Schema,
};
