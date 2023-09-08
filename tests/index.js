const Dimrill = require("../index");
const testSchema = new Dimrill.Schema(
  {
    files: {
      createFile: {
        Action: true,
      },
      createOrder: [
        {
          name: "pricelist",
          Action: true,
        },
        {
          name: "currency",
          Action: true,
        },
      ],
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
  {
    debug: true,
    strict: true,
  }
);
Dimrill.initialize({
  Schema: testSchema,
});

/*
  Now let's add our hook
*/
const findPolicy = require("./test");
Dimrill.addHook(findPolicy, {});

const TestPolicies = [
  {
    id: "1",
    Version: "2022-05-02",
    Statement: [
      {
        Effect: "Allow",
        Action: ["files:createOrder&*pricelist/distributor*"],
        Ressource: ["files:createOrder&currency/*"],
      },
    ],
  },
  {
    $ref: "#/findPolicy/id:<123>",
  },
];
const req = {
    params: {
      pricelist: "distributor",
      currency: "chf",
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
//
async function checkAuth() {
  const check = await Dimrill.authorize(
    ["Action", "files:createOrder"],
    TestPolicies,
    req,
    user,
    context
  );
  console.log(check);
}
checkAuth();
/*
Returns
  [
    'files:geFileUpdate',
    'files:getSingleFile',
    'files:newOrder:pricelist/distributor'
]
*/
const results = {
  true: {},
};

module.exports = {
  req,
  user,
  context,
  Dimrill,
};
