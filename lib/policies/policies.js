const { skipPartiallyEmittedExpressions } = require("typescript");

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
  addHook(hookName, hook) {
    if (typeof hook === "function" && !this.hooks.hasOwnProperty(hookName)) {
      // eslint-disable-next-line security/detect-object-injection
      this.hooks[hookName] = hook;
      return hook;
    } else {
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
        this.hooks[match[2]]
      ) {
        //run hook
        return { ...mountingPoint, ...this.fetchPolicyObject(match) };
      } else {
        //error
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
};
