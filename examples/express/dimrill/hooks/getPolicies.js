const PoliciesModel = require("../../models/policies.model"); //mongoose policies model

const findPolicyById = async (regexMatch) => {
  const policy = await PoliciesModel.findOne({ policy_id: regexMatch[2] });
  return policy ? policy.policies : {};
};

module.exports = {
  findPolicyById,
  context: {
    PoliciesModel: PoliciesModel,
    console: console,
  },
};
