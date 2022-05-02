const { req, user, context, Dimrill } = require("./index");

test("Test for a simple StringEquals context statement to return true ", () => {
  const Statement = {
    Condition: {
      "ToContext:StringEquals": {
        "user.name": "${user:name}",
      },
    },
  };
  expect(Dimrill.validate(Statement, req, user, context)).toEqual({
    hasContext: true,
    context: { "user.name": "James Bond" },
    valid: true,
  });
});
test("Test for a simple InArray statement to return false with a StringEquals context", () => {
  const Statement = {
    Condition: [
      {
        InArray: {
          "${context:organization.affiliated_error}": "${user:affiliation}", //should not match
        },
      },
      {
        "ToContext:StringEquals": {
          "user.name": "${user:name}",
        },
      },
    ],
  };
  expect(Dimrill.validate(Statement, req, user, context)).toEqual({
    hasContext: true,
    context: { "user.name": "James Bond" },
    valid: false,
  });
});
test("Test for a simple InArray statement to return true with a StringEquals context", () => {
  const Statement = {
    Condition: [
      {
        InArray: {
          "${context:organization.affiliated}": "${user:affiliation}", //should match
        },
      },
      {
        "ToContext:StringEquals": {
          "user.name": "${user:name}",
        },
      },
    ],
  };
  expect(Dimrill.validate(Statement, req, user, context)).toEqual({
    hasContext: true,
    context: { "user.name": "James Bond" },
    valid: true,
  });
});
test("Test for array of array in Conditions to context", () => {
  const Statement = {
    Condition: [
      [
        {
          "ToContext:EveryValue:StringEquals": [
            { organization_id: "${context:organization.id}" },
            {
              "${user:name}": "${req:body.name}",
            },
          ],
        },
        {
          "ToContext:AnyValue:Bool": [
            {
              "organization.test": true,
            },
            { "organization.dev": false },
          ],
        },
      ],
    ],
  };
  expect(Dimrill.validate(Statement, req, user, context)).toEqual({
    hasContext: true,
    context: {
      $or: [
        {
          $and: [
            {
              organization_id: "test",
            },
            {
              "James Bond": "James Bond",
            },
          ],
        },
        {
          $or: [
            {
              "organization.test": true,
            },
            {
              "organization.dev": false,
            },
          ],
        },
      ],
    },
    valid: true,
  });
});
