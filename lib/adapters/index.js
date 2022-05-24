/*
  Export all adapters to be accessible using their namekey.
*/
module.exports = {
  mongo: require("./mongo/mongo"),
  sql: require("./sql/sql"),
};
