const agentsSchema = require("./agents.dmrl.js");
const targetsSchema = require("./targets.dmrl.js");
module.exports = { system: { ...targetsSchema, ...agentsSchema } };
