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
  Condition: [
    {
      "ToContext:AnyValue:StringEquals": {
        "${context.organization.attached}": "${user.id}",
      },
    },
    {
      "EveryValue:InArray": {
        "${context.organization.attached}": "${user.id}",
      },
    },
  ],
};

const obj2 = {
  Condition: {
    "ToContext:AnyValue:StringEquals": {
      "${context:organization.attached}": "${user:id}",
    },
  },
};

const Bolt = require("./index.js");
Bolt.initialize({ options: { adapter: "mongo" } });

const t = Bolt.validate(
  obj2,
  { req: "req" },
  { user: "tes" },
  {
    context: {
      organization: {
        attached: "test",
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
