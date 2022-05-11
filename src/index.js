"use strict";
const util = require("util");
const vm = require("vm");

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
  matchPolicy(drna, Policies) {
    /*
      Wrap this function in a VM to prevent ReDOS
    */
    const results = Policies.map((policy) => {
      const matchedPolicy = policy.Statement.map((statement) => {
        const matchedStatement = statement.Action.find((elem) => {
          const sandbox = {
              result: null,
              matching: drna,
              str: elem,
            },
            context = vm.createContext(sandbox);
          const script = new vm.Script(
            `result = String(matching).match(
              new RegExp(String(str).replace("*", ".*"))
            );`
          );

          try {
            // One could argue if a RegExp hasn't processed in a given time.
            // then, its likely it will take exponential time.
            script.runInContext(context, { timeout: 100 }); // milliseconds
          } catch (e) {
            console.log(e); // Take some remedial action here...
          }
          if (sandbox.result) {
            return drna;
          }
        });
        return matchedStatement ? statement : null;
      });
      return matchedPolicy ?? null;
    });
    return results.flat();
  }
  synthetize(...args) {
    /* 
      Match provided args (path, req) with the associated schema
    */
    const localPath = args[0].split(":"),
      localSchema = this.schema,
      parameters = localPath.reduce((a, b) => a[String(b)], localSchema);
    const paramsMatched = [...this.paramsMatcher(parameters, args[1])];

    return [...localPath, ...paramsMatched].join(":");
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
  Schema: Schema,
};
