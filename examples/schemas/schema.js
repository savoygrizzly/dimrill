const agentsSchema = require("./agents.dmrl.js");
const targetsSchema = require("./targets.dmrl.js");
module.exports = { ...targetsSchema, ...agentsSchema };
