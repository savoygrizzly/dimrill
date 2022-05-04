const Policies = [
  {
    Version: "2022-05-02",
    Statement: [
      {
        Effect: "Allow",
        Action: [
          //service:Action
          "blackeye:newOrder:*",
          "blackeye:newOrder:createOrder:priceList/distributorPrice:organization/123456789", //service:ActionCategory:Function:[ParameterName/ParameterValue]:
          "blackeye:newOrder:editDelivery",
          "blackeye:users:getUser:user/${user:id}",
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
/*
  Parameters to be matched must be direclty accesible in the passed req object
*/
const drna = Schema.synthetize("newOrder:createOrder:createSmthg", req);
console.log(drna);
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
