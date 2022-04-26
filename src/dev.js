const obj1 = {
  Condition: [
    {
      "ToContext:AnyValue:StringEquals": [
        { "${context.organization.attached}": "${user.id}" },
        { "${context.organization.attached}": "${user.id}" },
        { "${context.organization.attached}": "${user.id}" },
      ],
    },
    {
      "EveryValue:InArray": {
        "${context.organization.attached}": "${user.id}",
      },
    },
  ],
};

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

const Bolt = require("./index.js");
Bolt.initialize({ options: { adapter: "mongo" } });

const obj2 = {
  Condition: [
    [
      {
        "ToContext:EveryValue:StringEquals": [
          { "${context:organization.id}": "shit" },
          {
            truffee: "${user:name}",
          },
        ],
      },
      {
        "ToContext:EveryValue:Bool": [
          {
            "context:organization.test": true,
          },
          { "context:organization.dev": false },
        ],
      },
    ],
  ],
};

const t = Bolt.validate(
  obj2,
  { req: "req" },
  {
    user: {
      id: "test",
      test: "truffe3",
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

console.log(t);

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
