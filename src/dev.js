const util = require("util");
const vm = require("vm");

const Policies = [
  {
    Version: "2022-05-02",
    Statement: [
      {
        Effect: "Allow",
        Action: [
          //service:Action

          //service:ActionCategory:Function:[ParameterName/ParameterValue]:
          "blackeye:newOrder:editDelivery",
          "blackeye:users:getUser:user/${user:id}",
          "blackeye:newOrder:createOrder:createSmthg:pricelist/*:organization/123456789",
          //"blackeye:newOrder:*",
        ],
        Ressource: ["blackeye:newOrder:priceList/distributorPrice"],
        Condition: {
          DateEquals: {
            "${user:birthdate_string}": new Date().toISOString(), //should match
          },
        },
      },
      {
        Effect: "Allow",
        Action: [
          //service:Action

          //service:ActionCategory:Function:[ParameterName/ParameterValue]:
          "blackeye2:newOrder:editDelivery",
          "blackeye2:users:getUser:user/${user:id}",
          "blackeye2:newOrder:createOrder:createSmthg:pricelist/*:organization/123456789",
          //"blackeye:newOrder:*",
        ],
        Ressource: ["blackeye:newOrder:priceList/distributorPrice"],
        Condition: {
          DateEquals: {
            "${user:birthdate_string}": new Date().toISOString(), //should match
          },
        },
      },
    ],
  },
];

/*const results = Policies.map((policy) => {
  const matchedPolicy = policy.Statement.map((statement) => {
    const matchedStatement = statement.Action.find((drna) => {
      const match = elem.match(new RegExp(drna.replace("*", ".*")));
      if (match) {
        return drna;
      }
    });
    return matchedStatement ? statement : null;
  });
  return matchedPolicy ?? null;
});
console.log(results);

const matches = Policies[0].Statement[0].Action.filter((element) => {
  if (element.match(regex)) {
    return element;
  }
});
console.log(matches);*/
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
    name: "James Bond",
    rights: ["toKill", "toDrink", "shit"],
  },
  context = {
    organization: {
      affiliated: ["MI6"],
      id: "test",
      test: true,
      dev: false,
    },
  };

const Dimrill = require("./index.js");
Dimrill.initialize({ options: { adapter: "mongo" } });
const Schema = new Dimrill.Schema(
  {
    newOrder: { createOrder: { createSmthg: ["pricelist", "organization"] } },
  },
  "DEBUG"
);
const match = Schema.matchPolicy(
  "blackeye:newOrder:createOrder:createSmthg:pricelist/distributorPrice:organization/123456789",
  Policies
);
console.log(match);
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
