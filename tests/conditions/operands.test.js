const { req, user, context, Dimrill } = require("../index");

test("Test for a implicit AND operands on multiple InArray statements to return true", () => {
  const Policies = [
    {
      Version: "2022-05-02",
      Statement: [
        {
          Effect: "Allow",
          Action: ["files:createFile"],
          Condition: {
            InArray: {
              "${context:organization.affiliated}": "${user:affiliation}", //should match
              "${user:rights}": "toKill", //should match
            },
          },
        },
      ],
    },
  ];
  expect(
    Dimrill.authorize(
      ["Action", "files:createFile"],
      Policies,
      req,
      user,
      context
    )
  ).toEqual({
    query: {},
    valid: true,
  });
});

test("Test for an explicit AND operands on multiple InArray statements to return false for at least one statement", () => {
  const Policies = [
    {
      Version: "2022-05-02",
      Statement: [
        {
          Effect: "Allow",
          Action: ["files:createFile"],
          Condition: {
            "EveryValue:InArray": {
              "${context:organization.affiliated_err0r}": "${user:affiliation}", //should not match
              "${user:rights}": "toKill", //should match
            },
          },
        },
      ],
    },
  ];
  expect(
    Dimrill.authorize(
      ["Action", "files:createFile"],
      Policies,
      req,
      user,
      context
    )
  ).toEqual({
    query: {},
    valid: false,
  });
});
test("Test for an explicit AND operands on multiple InArray statements to return false for every statements", () => {
  const Policies = [
    {
      Version: "2022-05-02",
      Statement: [
        {
          Effect: "Allow",
          Action: ["files:createFile"],
          Condition: {
            "EveryValue:InArray": {
              "${context:organization.affiliated_err0r}": "${user:affiliation}", //should not match
              "${user:rights}": "toLove", //should match
            },
          },
        },
      ],
    },
  ];
  expect(
    Dimrill.authorize(
      ["Action", "files:createFile"],
      Policies,
      req,
      user,
      context
    )
  ).toEqual({
    query: {},
    valid: false,
  });
});
test("Test for an explicit AND operands on multiple InArray statements to return true to all statements", () => {
  const Policies = [
    {
      Version: "2022-05-02",
      Statement: [
        {
          Effect: "Allow",
          Action: ["files:createFile"],
          Condition: {
            "EveryValue:InArray": {
              "${context:organization.affiliated}": "${user:affiliation}", //should match
              "${user:rights}": "toKill", //should match
            },
          },
        },
      ],
    },
  ];
  expect(
    Dimrill.authorize(
      ["Action", "files:createFile"],
      Policies,
      req,
      user,
      context
    )
  ).toEqual({
    query: {},
    valid: true,
  });
});
test("Test for an explicit OR operands on multiple InArray statements to return false", () => {
  const Policies = [
    {
      Version: "2022-05-02",
      Statement: [
        {
          Effect: "Allow",
          Action: ["files:createFile"],
          Condition: {
            "AnyValue:InArray": {
              "${context:organization.affiliated_err0r}": "${user:affiliation}", //should not match
              "${user:rights}": "toLove", //no match
            },
          },
        },
      ],
    },
  ];
  expect(
    Dimrill.authorize(
      ["Action", "files:createFile"],
      Policies,
      req,
      user,
      context
    )
  ).toEqual({
    query: {},
    valid: false,
  });
});
