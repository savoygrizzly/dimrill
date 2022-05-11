const req = {
    body: {
      pricelist: "distributorPrice",
      organization: "123456789",
    },
  },
  user = {
    id: "bond",
    affiliation: "MI6",
    birthdate_string: "1988-01-05 08:17:51",
    test: ["1988-01-05 08:17:51"],
    testInj: "shit",
    name: "James John Bond",
    rights: ["toKill", "toDrink", "shit"],
    hello: {
      test: "test",
    },
  },
  context = {
    organization: {
      affiliated: ["MI6"],
      id: "test",
      test: true,
      dev: true,
    },
  };

const Policies = [
  {
    Version: "2022-05-02",
    Statement: [
      {
        Effect: "Allow",
        Action: [
          "blackeye:newOrder:editDelivery",
          "blackeye:users:getUser:user/${user:id}-${user:hello.test}",
          "blackeye:newOrder:createOrder:createSmthg:*",
        ],
        Ressource: ["blackeye:newOrder:priceList/distributorPrice"],
        Condition: {
          StringEquals: {
            "${user:id}": "bond", //should match
          },
        },
      },
      {
        Effect: "Allow",
        Action: [
          "blackeye2:newOrder:editDelivery",
          "blackeye2:users:getUser:user/${user:id}",
          "blackeye2:newOrder:createOrder:createSmthg:pricelist/*:organization/123456789",
        ],
        Ressource: ["blackeye:newOrder:priceList/distributorPrice"],
        Condition: {
          "ToContext:DateEquals": {
            "user.birthdate_string": "${user:birthdate_string}",
          },
        },
      },
    ],
  },
];

const Dimrill = require("./index.js");
const Schema = new Dimrill.Schema(
  {
    blackeye: {
      newOrder: {
        editDelivery: true,
        createOrder: {
          createSmthg: ["pricelist", "organization"],
        },
      },
    },
    blackeye2: {
      newOrder: {
        editDelivery: true,
        createOrder: {
          createSmthg: ["pricelist", "organization"],
        },
      },
    },
  },
  { debug: true, strict: true }
);
Dimrill.initialize({ options: { adapter: "mongo" }, Schema: Schema });

/*const drna = Schema.synthetize(
  "blackeye:newOrder:createOrder:createSmthg", //"blackeye:newOrder:createOrder:createSmthg"
  req
);
console.log(drna);
const matchedPolicy = Schema.matchPolicy(
  "blackeye:newOrder:createOrder:createSmthg:pricelist/distributorPrice:organization/123456789",
  Policies,
  req,
  user,
  context
);
console.log(matchedPolicy);*/

console.log(
  Dimrill.authorize(
    "blackeye:newOrder:createOrder:createSmthg",
    Policies,
    req,
    user,
    context
  )
);
console.log(
  Dimrill.authorize(
    "blackeye2:newOrder:createOrder:createSmthg",
    Policies,
    req,
    user,
    context
  )
);
/*
  Parameters to be matched must be direclty accesible in the passed req object
*/

//Dimrill.validate(cond, req, user, context)
//Dimrill.synthetize("newOrder/createOrder/",req)
/*

  Page REQ: POST newOrder/createOrder/
  POST params
    - priceList : distributorPrice
    - organization : 123456789
  
  Synthetize DRNA from page

  auth(Dimrill.synthetize("newOrder/createOrder/",req)) => 
  "blackeye:newOrder:createOrder:priceList/distributorPrice:organization/123456789"

*/
