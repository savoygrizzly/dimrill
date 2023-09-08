const ivm = require("isolated-vm");
//const isolate = new ivm.Isolate({ memoryLimit: 128 });
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
      if (typeof hook !== "function") {
        throw new Error("Hook must be a function");
      }
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
    if (!Array.isArray(policies)) {
      throw new Error("Policies must be an array");
    }
    for (const policy of policies) {
      if (policy.$ref && typeof policy.$ref === "string") {
        //override policy completly
        const overridePolicy = await this.includeRef(policy.$ref, policies);
        if (
          Array.isArray(overridePolicy) ||
          typeof overridePolicy === "object"
        ) {
          if (Array.isArray(overridePolicy)) {
            compiledPolicies = compiledPolicies.concat(overridePolicy);
          } else if (
            typeof overridePolicy === "object" &&
            !Array.isArray(overridePolicy) &&
            overridePolicy !== null
          ) {
            compiledPolicies.push(overridePolicy);
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
          this.hooks.hasOwnProperty(matchHook[1]) &&
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
        const match = ref.match(/#\/id:<(\w+)>/);
        if (!match || !match[1]) {
          resolve({});
        } else {
          resolve({
            ...mountingPoint,
            ...this.fetchPolicyObject(match[1], policies),
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
    return new Promise(async (resolve, reject) => {
      /*let setup = async function () {
        const isolate = new ivm.Isolate();
        const context = await isolate.createContext();
        const jail = context.global;
        jail.setSync("log", console.log);

        jail.setSync("hook", function (...args) {
          return hook.function();
        });
        const fn = "async function execute() { return await hook();}";
        const compiledFn = await isolate.compileScript(fn);
        await compiledFn.run(context);
        const fnReference = await context.global.get("execute", {
          reference: true,
        });
        const result = await fnReference.apply(undefined, [{ a: 20 }], {
          arguments: { copy: true },
          result: { promise: true, copy: true },
        });
        return result;
      };

      setup()
        .then((result) => {
          console.log(result);
        })
        .catch((err) => {
          console.log(err);
        });*/
      const hookResult = await hook.function(regexMatch, hook.context);
      return resolve(hookResult);
    });
  }
};
