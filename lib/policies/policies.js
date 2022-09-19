const { skipPartiallyEmittedExpressions } = require("typescript");
const vm = require("vm");
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
    if (typeof args[0] === "object" && Object.keys(args[0]).length > 0) {
      Object.keys(args[0]).forEach((k) =>
        // eslint-disable-next-line security/detect-object-injection
        this.hooks.hasOwnProperty(k) ? null : (this.hooks[k] = args[0][k])
      );
    }
  }
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
  compilePolicies(policies) {
    return policies.map((policy) => {
      if (policy.$ref && typeof policy.$ref === "string") {
        //override policy completly
        return this.includeRef(policy.$ref, policies, policy);
      } else if (
        typeof policy.Statement === "object" &&
        !Array.isArray(policy.Statement) &&
        policy.Statement !== null
      ) {
        policy.Statement = this.includeRef(
          policy.$ref,
          policies,
          policy.Statement
        );
        return policy;
        //will merge statements
      } else {
        return policy;
      }
    });
  }
  includeRef(ref, policies, mountingPoint) {
    const matchHook = ref.match(/#\/(\w+)\/id:<(\w+)>/);
    if (matchHook) {
      if (
        this.hooks[match[1]] &&
        typeof this.hooks[match[1]] === "function" &&
        match[2]
      ) {
        //run hook
        try {
          return { ...mountingPoint, ...runHook(match, this.hooks[match[1]]) };
        } catch (error) {
          throw new Error(error);
        }
      } else {
        throw new Error("Hook not found or not a function.");
      }
    } else {
      const match = ref.match(/#\/id:<(\w+)>/)[1];
      if (!match) {
        return {};
      } else {
        return { ...mountingPoint, ...this.fetchPolicyObject(match, policies) };
      }
    }
  }
  fetchPolicyObject(id, policies) {
    return policies.find((policy) => {
      if (policy.hasOwnProperty("id") && policy.id === id) {
        return policy;
      }
    });
  }
  runHook(searchStr, hook) {
    const context = hook.context;
    context.hook = hook.function;
    context.hookReturn = null;
    context.searchStr = searchStr;
    const vmContext = vm.createContext(context);
    const script = new vm.Script(
      `hookReturn = hook(searchStr);
      `
    );
    try {
      script.runInContext(vmContext, { timeout: 10 }); // milliseconds
    } catch (e) {
      /*
        Possible Attack has been detected, need to notify to take remedial actions
    */
    }
    if (context.hookReturn) {
      return context.hookReturn;
    }
  }
};
