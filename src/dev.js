const req = {
    pricelist: "distributor Price",
    organization: "123456789",
    other: "nothere",
  },
  user = {
    id: "bond",
    affiliation: "MI6",
    birthdate_string: "1988-01-05 08:17:51",
    test: ["1988-01-05 08:17:51"],
    testInj: "shit",
    agency: "Go$*_d guys",
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
          "blackeye:users:getUser:user/${user:agency}-${user:hello.test}",
          "blackeye:newOrder:createOrder:*:other/nothere",
        ],
        Ressource: ["blackeye:newOrder:getSheet:pricelist/*"],
        Condition: {
          StringEquals: {
            "${user:id}": "bond", //should match
          },
        },
      },
    ],
  },
];
/*
 *  Dev Note
 *  The Schema Object should contain a way to differentiate Action and Ressource paths and parameters
 *
 */
const Dimrill = require("./index.js");
const extendedSchema = new Dimrill.Schema(
  {
    blackeye: {
      newOrder: {
        getSheet: {
          Ressource: true,
        },
        createOrder: [
          {
            name: "pricelist",
            Action: true,
          },
          {
            name: "organization",
            Action: true,
          },
          {
            name: "other",
            Ressource: true,
            Action: true,
          },
        ],
      },
      users: {
        createUser: {
          Action: true,
        },
        getUser: {
          Action: true,
          Ressource: true,
        },
        updateUserInformations: {
          Action: true,
        },
      },
    },
  },
  { debug: true }
);
Dimrill.initialize({ options: { adapter: "mongo" }, Schema: extendedSchema });

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
    ["Action", "blackeye:newOrder:createOrder"],
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
