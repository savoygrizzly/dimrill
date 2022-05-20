const mongoAdapter = require("./mongo/mongo");
const sqlAdapter = require("./sql/sql");
module.exports = {
  mongo: mongoAdapter,
  sql: sqlAdapter,
};
