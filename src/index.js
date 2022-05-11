"use strict";

const Adapters = require("./adapters");
const validateConditions = require("./operators/validate-condition");
const Schema = require("./schema/");

/*

  TODO:DEV
  import getOperators, matchVariables
*/

function validate(statement, req, user, context) {
  if (typeof this.adapter !== "object") {
    throw new Error("Bolt is not initialized");
  }
  /* serialize req, user and context params to be later access via object properties */
  req = { req };
  user = { user };
  context = { context };

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

function initialize(...args) {
  this.adapter = args[0].options
    ? Adapters[args[0].options.adapter] ?? Adapters.mongo
    : Adapters.mongo;
  this.synthetizer;
  return this;
}
module.exports = {
  validate: validate,
  initialize: initialize,
  Schema: Schema,
};
