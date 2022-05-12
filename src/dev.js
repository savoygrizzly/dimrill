const req = {
  body: {
    pricelist: "distributorPrice",
    organization: "123456789",
    other: "not_here",
  },
},
user = {
  id: "bond",
  affiliation: "MI6",
  birthdate_string: "1988-01-05 08:17:51",
  test: ["1988-01-05 08:17:51"],
  name: "James John Bond",
  rights: ["toKill", "toDrink", "shit"],
  weapons: {
    gun: "Beretta",
    watch: "Rolex",
  },
},
context = {
    target: {
        
    }
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
const Schema = new Dimrill.Schema(
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
    ["Action", "blackeye:newOrder:createOrder:createSmthg"],
    Policies,
    req,
    user,
    context
  )
);
console.log(
  Dimrill.authorize(
    ["Ressource", "blackeye:newOrder:getSheet"],
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
