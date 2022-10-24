const mongoose = require("mongoose");

const { toJSON } = require("./plugins");
const policiesSchema = mongoose.Schema(
  {
    policy_id: {
      type: String,
      required: true,
    },
    policies: {
      type: Array,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);
// add plugin that converts mongoose to json
policiesSchema.plugin(toJSON);

/**
 * @typedef Policies
 */
const Policies = mongoose.connection
  .useDb("policies")
  .model("Policies", policiesSchema);

module.exports = Policies;
