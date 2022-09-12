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
    this.fetchRefs = typeof args[0] === "function" ? args[0] : null;
  }

  compilePolicies(policies) {
    policies.forEach((policy) => {
      if (policy.$ref) {
        //ovveride policy completly
      } else if (
        typeof policy.Statement === "object" &&
        !Array.isArray(policy.Statement) &&
        policy.Statement !== null
      ) {
        //will merge statements
      }
    });
  }
  includeRef(ref, policies, mountingPoint) {
    const match = ref.match(/id:<(\w+)>/)[1];
    if (!match) {
      return {};
    } else {
      fetchPolicyObject(match, policies);
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
