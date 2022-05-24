const Dimrill = require("../index");
Dimrill.initialize({ options: { adapter: "mongo" } });

const req = {
    body: {
      name: "James Bond",
    },
  },
  user = {
    id: "bond",
    age: 44,
    birthdate: new Date("1988-01-05 08:17:51"),
    birthdate_string: "1988-01-05 08:17:51",
    affiliation: "MI6",
    name: "James Bond",
    rights: ["toKill", "toDrink", "toDestroy"],
    alive: true,
  },
  context = {
    organization: {
      affiliated: ["MI6"],
      id: "test",
      test: true,
      dev: false,
    },
  };

const results = {
  true: {},
};
module.exports = {
  req,
  user,
  context,
  Dimrill,
};
