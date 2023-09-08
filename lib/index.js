"use strict";
const util = require("util");

const Adapters = require("./adapters");
const validateConditions = require("./operators/validate-condition");
const Schema = require("./schema/schema");
const PoliciesCompiler = require("./policies/policies");

function initialize(
  initialState = {
    options: { adapter: "mongo" },
    Schema: {},
    hooks: [],
    hooksOptions: {},
  }
) {
  if (this.initialized) {
    return; //prevent double init
  } else {
    this.initialized = false;
  }
  this.adapter =
    (initialState.options?.adapter && Adapters[initialState.options.adapter]) ??
    Adapters.mongo;
  if (!["String", "Object"].includes(this.adapter.returnAs)) {
    throw new Error(
      `Adapter.returnAs property must be set to either "String" or "Object" (case sensitive); Value currently is "${this.adapter.returnAs}"`
    );
  }
  this.schema = initialState.schema ?? initialState.Schema;
  if (this.schema instanceof Schema !== true) {
    throw new Error("Schema must be an instance of Dimrill.Schema");
  }
  this.PoliciesCompiler = new PoliciesCompiler(initialState.hooks);
  this.initialized = true;
  return this;
}

/**
 *
 * @param {function} hook - the hook
 * @param {object} hookContext  - hook params
 * @returns
 */
function addHook(hook, hookContext) {
  return this.PoliciesCompiler.addHook(hook, hookContext);
}
/**
 *
 * @param {object} statement - Object containing a Condition key with the condition to be validated.
 * @param {object} req - The req object passed from the server.
 * @param {object} user - The data associated to the user attempting to authorize.
 * @param {object} context - An object containing additional informations to be used during the authorization process.
 * @returns {validateConditions}
 */
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
      query: {},
      valid: true,
    };
  } else {
    //validate
    return validateConditions(
      statement.Condition,
      req,
      user,
      context,
      this.adapter
    );
  }
}
/**
 *
 * @param {array} extractProps - The properties to extract from the req object.
 * @param {object} req - The request passed from the server.
 * @param {boolean} keep - Wether or not to maintain req structure.
 * @returns {object} - Cleaned request.
 */
function reqExtractor(extractProps, req, keep) {
  let obj = {};

  if (Array.isArray(extractProps) && extractProps.length >= 1) {
    extractProps.forEach((key) => {
      if (req.hasOwnProperty(key)) {
        if (keep === true) {
          // eslint-disable-next-line security/detect-object-injection
          obj[key] = req[key];
        } else {
          // eslint-disable-next-line security/detect-object-injection
          obj = { ...obj, ...req[key] };
        }
      }
    });
    return obj;
  } else if (typeof extractProps === "string") {
    if (req.hasOwnProperty(extractProps)) {
      // eslint-disable-next-line security/detect-object-injection
      return req[extractProps];
    } else {
      return req;
    }
  } else {
    return req;
  }
}
/**
 * @param {array} drna - Array containing for index 0 the type (Action/Ressource) and index 1 the drna string to be matched.
 * @param {array} policies - Array containing all policies.
 * @param {object} req - The req object passed from the server.
 * @param {object} user - The data associated to the user attempting to authorize.
 * @param {object} context - An object containing additional informations to be used during the authorization process.
 * @returns {object} - Object with keys valid (Boolean), query (Object)/(String).
 */
async function authorize(drna, policies, req, user, context) {
  /*
    If the passed req matches the format [{String}/{Array},{Object}, {Boolean} (Optional)] extract the properties specified in the first element.
    Otherwise pass the req object.
  */
  return new Promise((resolve, reject) => {
    req =
      Array.isArray(req) &&
      (typeof req[0] === "string" ||
        (Array.isArray(req[0]) && req[0].length >= 1)) &&
      typeof req[1] === "object"
        ? reqExtractor(req[0], req[1], req[2] ?? false)
        : req;
    const authorization = {
      valid: false,
      query: this.adapter.returnAs === "String" ? "" : {},
    };

    this.PoliciesCompiler.compilePolicies(policies)
      .then((compiledPolicies) => {
        const statement = this.schema.matchPolicy(
          this.schema.synthetize(drna, req),
          compiledPolicies,
          req,
          user,
          context
        )[0];
        if (statement) {
          const condition = verifyCondition.call(
            this,
            statement,
            req,
            user,
            context
          ); //pass down this to function
          if (condition.valid && statement.Effect == "Allow") {
            authorization.valid = true;
            authorization.query = condition.query;
          } else {
            authorization.valid = false;
            authorization.query = condition.query;
          }
        } else {
          authorization.valid = false;
          authorization.query = {};
        }
        resolve(authorization);
      })
      .catch((compilerError, details) => {
        console.log(compilerError);
        throw new Error(compilerError);
      });
  });
}

/**
 * Create an array of all possible ressources accessible,
 * @param {array} pages - ressource list
 * @param {array} policies - - Array containing all policies.
 * @returns {array}
 */
async function createRessourcesMap(pages, policies) {
  return new Promise(async (resolve, reject) => {
    const mappedRessources = [],
      compiledPolicies = await this.PoliciesCompiler.compilePolicies(policies);
    pages.forEach((pageDrna) => {
      const statement = this.schema.matchForRessourceAccess(
        this.schema.synthetizeForRessourcesAccess(pageDrna),
        compiledPolicies,
        {},
        {},
        {}
      )[0];
      if (statement) {
        if (statement.Effect == "Allow") {
          mappedRessources.push(pageDrna);
        }
      }
    });
    resolve(mappedRessources);
  });
}
/**
 *
 * @param {array} policies - The user's policies
 * @returns {array} - The compiled policies
 */
async function generateCompiledPolicies(policies) {
  return await this.PoliciesCompiler.compilePolicies(policies);
}
function ConditionEquals(condition, req, user, context = {}) {
  if (typeof condition === "string" && condition.split("=").length === 2) {
    //transform to object
    const conditionArguments = condition.split("=")[1].split(",");
    const object = conditionArguments.reduce((object, keyPair) => {
      return {
        [keyPair.split(";")[0]]: keyPair.split(";")[1],
      };
    }, {});
  }
  //const results = verifyCondition.call(this, condition, req, user, context);
  return condition;
}

module.exports = {
  authorize: authorize,
  initialize: initialize,
  generateCompiledPolicies: generateCompiledPolicies,
  addHook: addHook,
  createRessourcesMap: createRessourcesMap,
  Schema: Schema,
  ConditionEquals: ConditionEquals,
};
