const Dimrill = require("../index");

const testSchema = new Dimrill.Schema(
  {
    files: {
      createFile: {
        Action: true,
      },
      getFile: {
        Ressource: true,
      },
      getSingleFile: [
        {
          name: "fileId",
          Ressource: true,
        },
      ],
      geFileUpdate: [
        {
          name: "fileId",
          Ressource: true,
        },
      ],
    },
    inventory: {
      createItem: {
        Action: true,
        Ressource: true,
      },
      fetchItem: {
        Action: true,
      },
    },
  },
  { debug: true, strict: true }
);

Dimrill.initialize({ options: { adapter: "mongo" }, Schema: testSchema });

const TestPolicies = [
  {
    $ref: "#/id:<df4f4>",
  },
  {
    id: "df4f4",
    Version: "2022-05-02",
    Statement: [
      {
        Effect: "Allow",
        Ressource: [
          "files:getSingleFile:fileId/*",
          "files:geFileUpdate",
          "files:newOrder:pricelist/distributor",
        ],
        Condition: {
          "ToContext:StringEquals": {
            creator_id: "${user:id}",
          },
        },
      },
    ],
  },
];
const req = {
    body: {
      name: "James Bond",
      fileId: "97",
    },
  },
  user = {
    id: "123445",
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
console.log(Dimrill.getSitemap(TestPolicies));
console.log(
  Dimrill.createRessourcesMap(
    [
      "files:geFileUpdate",
      "files:getSingleFile",
      "files:newOrder:.*",
      "files:newOrder:pricelist/distributor",
    ],
    TestPolicies
  )
);
const results = {
  true: {},
};

module.exports = {
  req,
  user,
  context,
  Dimrill,
};
