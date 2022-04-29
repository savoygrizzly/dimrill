"use strict";
const Adapters = require("./adapters");
const util = require("util");
const validateConditions = require("./operators/validate-condition");
/*

  TODO:DEV
  import getOperators, matchVariables
*/

function validate(statement, req, user, context) {
  if (typeof this.adapter !== "object") {
    console.error("Bolt is not initialized");
    return this;
  }
  if (!statement.Condition) {
    //Nothing to validate condition is empty
    this.valid = true;
    this.context = context;
  } else {
    //validate
    const condition = validateConditions(
      statement.Condition,
      req,
      user,
      context,
      this.adapter
    );
    this.valid = condition.valid;
    console.log(condition);
  }
  return this;
}

function initialize(...args) {
  this.adapter = args[0].options
    ? Adapters[args[0].options.adapter] ?? Adapters.mongo
    : Adapters.mongo;
  return this;
}
module.exports = {
  validate: validate,
  initialize: initialize,
};
