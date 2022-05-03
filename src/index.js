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
function synthetize(str, req, service, paths = undefined) {
  /* 
    This function synthetizes drna from base string by adding parameters from req or the passed object
    possible paths are either defined by passing a paths object or using a config file
  */
}
function Schema(args) {
  if (typeof args !== "object") {
    throw new Error("Dimrill Schema must contain an Object");
  }
  Object.keys(args).forEach((key) => {
    /*
      Check wether key contains spaces or special characters
    */
    if (key.test(/[ `!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~]/)) {
      throw new Error(
        `For key: ${key}; Dimrill Schema properties must be guidelines compliant`
      );
    }
    /*
      Check wether property's value is an Object or an Array
    */
    if(args[key]) 
  });
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
  synthetize: synthetize,
};
