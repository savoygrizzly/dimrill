const fs = require("fs");

const policies = JSON.parse(fs.readFileSync("fake_policies.json", "utf8"));

policies.push("files:orders:createOrder&pricelist/distributor");
const TRIES = 100;

console.log("Benchmarking split");
console.time("Split");
for (let i = 0; i < TRIES; i++) {
  function removeZeroWidthCharacters(str) {
    // return str ? str.replace(/[\s\u200B-\u200D\uFEFF]/g, "") : "";
    if (!str) return str;
    const zeroWidthChars = {
      "\u200B": true, // Zero Width Space
      "\u200C": true, // Zero Width Non-Joiner
      "\u200D": true, // Zero Width Joiner
      "\uFEFF": true, // Zero Width No-Break Space
    };

    let result = "";

    for (const char of str) {
      if (!zeroWidthChars[char]) {
        result += char;
      }
    }

    return result;
  }

  function processAndCheckAccess(path, parameters, policyPath, policyParams) {
    // Sanitize path
    const sanitizedPath = path.map((segment) =>
      removeZeroWidthCharacters(segment)
    );

    // Sanitize parameters (both keys and values)
    const sanitizedParameters = {};
    for (const key in parameters) {
      const sanitizedKey = removeZeroWidthCharacters(key);
      sanitizedParameters[sanitizedKey] = removeZeroWidthCharacters(
        parameters[key]
      );
    }

    const sanitizedPolicyPath = removeZeroWidthCharacters(policyPath);
    // Sanitize policy parameters (both keys and values)
    const sanitizedPolicyParams = policyParams;

    // Call the original checkAccess with sanitized inputs
    return checkAccess(
      sanitizedPath,
      sanitizedParameters,
      sanitizedPolicyPath,
      sanitizedPolicyParams
    );
  }

  function checkAccess(path, parameters, policyPath, policyParams) {
    const pathStr = path.join(":");
    // Check if the policy path matches the input path or has a wildcard
    if (policyPathMatches(policyPath, pathStr)) {
      // Return true immediately if the policy path ends with a wildcard
      if (policyPath.endsWith("*")) {
        return true;
      }

      // If policy has no parameters, match only if parameters are also empty
      if (policyParams.length === 0) {
        return Object.keys(parameters).length === 0;
      }

      for (const param of policyParams) {
        const splitParam = param.split("/");

        if (splitParam.length !== 2) {
          return false;
        }

        const [key, value] = splitParam;
        if (
          key === "*" ||
          (parameters[key] !== undefined &&
            (value === "*" || parameters[key] === value))
        ) {
          continue;
        }

        return false; // Parameter not matched or not present
      }

      return true;
    }

    return false;
  }

  function policyPathMatches(policyPath, inputPath) {
    // Handle global wildcard
    if (policyPath === "*") {
      return true;
    }

    // Check for incorrect wildcard usage (like "files*")
    if (
      policyPath.endsWith("*") &&
      inputPath.charAt(policyPath.length - 1) === ":"
    ) {
      return false;
    }

    // Handle wildcard at the end of the policy path
    if (policyPath.endsWith("*")) {
      // Check that the base path (excluding the wildcard) is a prefix of the input path
      const basePolicyPath = policyPath.slice(0, -1); // Remove the wildcard

      if (inputPath.startsWith(basePolicyPath)) {
        // Ensure that the wildcard does not lead to a partial match of a path segment
        if (
          basePolicyPath.endsWith(":") ||
          inputPath.charAt(basePolicyPath.length) === ":"
        ) {
          return true;
        }
      }
      return false;
    }

    // Exact match
    return policyPath === inputPath;
  }

  // Example usage
  const path = ["files", "orders", "createOrder"];
  const parameters = {
    pricelist: "distributor",
    currency: "USD",
    type: "draft",
  };

  for (const policy of policies) {
    const [policyPath, ...policyParams] = policy.split("&");
    if (checkAccess(path, parameters, policyPath, policyParams)) {
      console.log(`Access granted for policy: ${policy}`);
    }
  }
}
console.timeEnd("Split");
