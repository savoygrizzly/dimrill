const Policies = [
  {
    Version: "2022-05-02", //YYYY-MM-DD
    /*
        --------- Dimrill - RNA (DRNA) ---------

        Starts with lowercase servicename 
        The expression must go down the logical path to the targeted function, each step being separated by ":"; Consider the following structure

        service:categoryOne:subCategory:functionTargeted

        each 
    */
    Statement: [
      {
        Effect: "Allow",
        Action: [
          //service:Action
         
          "blackeye:newOrder:createOrder:priceList/distributorPrice:organization/123456789", //service:ActionCategory:Function:[ParameterName/ParameterValue]:
          "blackeye:newOrder:EditDelivery",
        ],
        Ressource: ["blackeye:newOrder:"],
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
      name: "James Bond",
    },
  },
  user = {
    id: "bond",
    affiliation: "MI6",
    name: "James Bond",
    rights: ["toKill", "toDrink", "toDestroy"],
  },
  context = {
    organization: {
      affiliated: ["MI6"],
      id: "test",
      test: true,
      dev: false,
    },
  };

const Bolt = require("./index.js");
Bolt.initialize({ options: { adapter: "mongo" } });

/*

  Page REQ: POST newOrder/create/distributor_price


*/
console.log(Bolt.validate("newOrder:"Statement, req, user, context));

const obj = {
  Condition: {
    InArray: {
      "${context:organization.attached}": "${user:id}",
    },

    "AnyValue:StringEquals": [
      { "${context:organization.id}": "${user:id}" },
      { "${user:name}": "truffee" },
    ],
  },
};

const obj2 = {
  Condition: {
    "EveryValue:StringEquals": [
      { "${context:organization.id}": "test" },
      {
        truffee: "${user:name}",
      },
    ],
    "ToContext:EveryValue:StringEquals": [
      { "organization.id": "test" },
      {
        truffe: "${user:name}",
      },
    ],
  },
};

const t = Bolt.validate(
  Statement,
  { req: "req" },
  {
    user: {
      id: "test",
      test: "truffe3",
      name: "truffee",
    },
  },
  {
    context: {
      organization: {
        attached: ["test"],
        id: "test",
        test: true,
        dev: false,
      },
    },
  }
);

console.log(t);
const t2 = Bolt.validate(
  obj2,
  { req: "req" },
  {
    user: {
      id: "test",
      test: "truffe",
      name: "truffe",
    },
  },
  {
    context: {
      organization: {
        attached: ["test"],
        id: "test",
        test: true,
        dev: false,
      },
    },
  }
);
console.log(t2);
const test = {
  test: {
    sub: {
      subtest: {
        shit: {
          happens: {
            sometimes: {
              in: "here",
            },
          },
        },
      },
    },
  },
};
const keys = "test.sub.subtest.shit.happens.sometimes.in";
const str = keys.split(".").reduce((a, b) => a[b], test);
console.log(str);
