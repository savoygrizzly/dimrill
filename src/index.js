"use strict";
const Adapters = require("./adapters");
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
class Schema {
  constructor(...args) {
    if (typeof args[0] !== "object") {
      throw new Error("Dimrill Schema must contain an Object");
    }
    if (args[1] === "DEBUG") {
      function iterate(object) {
        for (const property in object) {
          if (property.match(/[ `!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~]/)) {
            throw new Error(
              `For key: ${property}; Dimrill Schema properties must be guidelines compliant`
            );
          }
          if (
            // eslint-disable-next-line security/detect-object-injection
            typeof object[property] === "object" &&
            // eslint-disable-next-line security/detect-object-injection
            !Array.isArray(object[property]) &&
            // eslint-disable-next-line security/detect-object-injection
            object[property] !== null
          ) {
            // eslint-disable-next-line security/detect-object-injection
            iterate(object[property]);
          } else {
            // eslint-disable-next-line security/detect-object-injection
            if (
              // eslint-disable-next-line security/detect-object-injection
              Array.isArray(object[property]) &&
              // eslint-disable-next-line security/detect-object-injection
              object[property].length > 1
            ) {
              // eslint-disable-next-line security/detect-object-injection
              object[property].forEach((n) => {
                if (n.match(/[ `!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~]/)) {
                  throw new Error(
                    `For property "${property}" value "${n}"; Dimrill Schema values must be guidelines compliant`
                  );
                }
              });
            } else {
              throw new Error(
                `For property "${property}" value "${n}" must be an array; Dimrill Schema must be guidelines compliant`
              );
            }
          }
        }
      }
      iterate(args[0]);
    }
    this.schema = args[0];
  }

  synthetize(...args) {
    /* 
      Match provided args (path, req) with the associated schema
    */

    /* 
            DEV GOAL
      Match "blackeye:newOrder:createOrder:pricelist/distributorPrice:organization/123456789"
      In passed Schema.
    */
    const localPath = args[0].split(":"),
      localSchema = this.schema,
      parameters = localPath.reduce((a, b) => a[String(b)], localSchema);
    let matched = [...this.paramsMatcher(parameters, args[1])];
    /* 
      Create potential wildcards for every items in local path,
    */
    const wildcards = [...this.argumentsWildcard(localPath)];
    return [...wildcards, [...localPath, ...matched].join(":")];
  }
  *argumentsWildcard(array) {
    for (let i in array) {
      // eslint-disable-next-line security/detect-object-injection
      yield `${i > 0 ? array.slice(0, i).join(":") + ":" : ""}${array[i]}:*`;
    }
  }
  *paramsMatcher(params, req) {
    let reqValues = req;
    if (req.body) {
      reqValues = { ...req, ...req.body };
    }
    if (req.query) {
      reqValues = { ...req, ...req.query };
    }
    for (const paramName of params) {
      /* 
        If param is wildcard 
        Need to stop match
      */
      if (paramName === "*") {
      }
      // eslint-disable-next-line security/detect-object-injection
      if (reqValues[paramName]) {
        // eslint-disable-next-line security/detect-object-injection
        yield `${String(paramName)}/${String(reqValues[paramName]).replace(
          /[\W_]+/,
          ""
        )}`;
      }
    }
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
  synthetize: synthetize,
  Schema: Schema,
};
