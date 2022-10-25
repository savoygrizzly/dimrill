const { VM } = require("vm2");
/**
 * The PoliciesCompiler Class
 */
module.exports = class PoliciesCompiler {
  /**
   *
   * @param  {...any} args - args[0] Contains the schemas to be used by Dimrill.
   */
  constructor(...args) {
    this.hooks = {};
    if (Array.isArray(args[0]) && args[0].length > 0) {
      args[0].forEach((hook) => {
        if (
          Array.isArray(hook) &&
          hook.length > 0 &&
          typeof hook[1] === "function"
        ) {
          this.addHook(hook[1], hook[2] ?? {});
        }
      });
    }
  }
  /**
   *  Add a hook to the instance
   * @param {function} hook - hook function
   * @param {object} context - hook context
   * @return
   */
  addHook(hook, context) {
    if (
      typeof hook === "function" &&
      hook.name &&
      !this.hooks.hasOwnProperty(hook.name)
    ) {
      // eslint-disable-next-line security/detect-object-injection
      this.hooks[hook.name] = {
        function: hook,
        context: typeof context === "object" && context !== null ? context : {},
      };
      //test
      return this.hooks[hook.name];
    } else {
      if (!hook.name) {
        throw new Error("No unnamed hooks");
      }
      return false;
    }
  }
  /**
   * Compile policies by including refs
   * @param {array} policies - The policies to compile
   * @returns {array}
   */
  async compilePolicies(policies) {
    let compiledPolicies = [];
    for (const policy of policies) {
      if (policy.$ref && typeof policy.$ref === "string") {
        //override policy completly
        const overidePolicy = await this.includeRef(policy.$ref, policies);
        if (Array.isArray(overidePolicy)) {
          compiledPolicies = compiledPolicies.concat(overidePolicy);
        } else if (
          typeof overidePolicy === "object" &&
          !Array.isArray(overidePolicy) &&
          overidePolicyt !== null
        ) {
          overidePolicyt.push(policy);
        }
      } else if (
        typeof policy.Statement === "object" &&
        !Array.isArray(policy.Statement) &&
        policy.Statement !== null
      ) {
        policy.Statement = await this.includeRef(
          policy.$ref,
          policies,
          policy.Statement
        );
        if (
          typeof policy.Statement === "object" &&
          !Array.isArray(policy.Statement) &&
          policy.Statement !== null
        ) {
          compiledPolicies.push(policy);
        }

        //will merge statements
      } else {
        compiledPolicies.push(policy);
      }
    }
    return compiledPolicies;
  }
  /**
   *
   * @param {string} ref - The ref from which to extract the policy id
   * @param {array} policies - The user attached policies
   * @param {object} mountingPoint - Optional param, if specified the hook result will be merged with it
   * @returns {any} - Returns either an object or an array of object
   */
  includeRef(ref, policies, mountingPoint = null) {
    return new Promise(async (resolve, reject) => {
      const matchHook = ref.match(/#\/(\w+)\/id:<(\w+)>/);
      if (matchHook) {
        if (
          this.hooks[matchHook[1]] &&
          typeof this.hooks[matchHook[1]].function === "function" &&
          matchHook[2]
        ) {
          const hookResult = await this.runHook(
            matchHook,
            this.hooks[matchHook[1]]
          );
          if (hookResult) {
            if (!mountingPoint) {
              resolve(hookResult);
            } else {
              resolve({
                ...mountingPoint,
                ...hookResult,
              });
            }
          } else {
            resolve(mountingPoint);
          }
          //run hook
        } else {
          throw new Error("Hook not found or not a function.");
        }
      } else {
        const match = ref.match(/#\/id:<(\w+)>/)[1];
        if (!match) {
          resolve({});
        } else {
          resolve({
            ...mountingPoint,
            ...this.fetchPolicyObject(match, policies),
          });
        }
      }
    });
  }
  /**
   *  Fetch policy from user's policies
   * @param {string} id - The id of the policy to fetch
   * @param {array} policies - The policies to fetch it from
   * @returns {object} - The matching policy
   */
  fetchPolicyObject(id, policies) {
    return policies.find((policy) => {
      if (policy.hasOwnProperty("id") && policy.id === id) {
        return policy;
      }
    });
  }
  /**
   * Run the user defined hook
   * @param {array} regexMatch - Array containing the result of the regex match
   * @param {object} hook - the hook function and its context
   * @returns {any} - Returns an object or an array of objects
   */
  async runHook(regexMatch, hook) {
    return new Promise((resolve, reject) => {
      const vm = new VM({
        timeout: 3000,
        console: "inherit",
        sandbox: {
          ...hook.context,
          hook: hook.function,
          regexMatch: regexMatch,
          module: module,
        },
      });
      let SandoboxWithCallback = vm.run(
        `module.exports = function(callback) { hook(regexMatch).then(results => {
          callback(results);
        }).catch(error => callback(results)) }`
      );
      SandoboxWithCallback((results) => {
        resolve(results);
      });
    });
  }
};
