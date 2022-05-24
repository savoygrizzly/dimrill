const { req, user, context, Dimrill } = require("../index");

test("Test for a simple StringEquals context statement to return true ", () => {
  const Policies = [
    {
      Version: "2022-05-02",
      Statement: [
        {
          Effect: "Allow",
          Action: ["files:createFile"],
          Condition: {
            "ToContext:StringEquals": {
              "user.name": "${user:name}",
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
    query: { "user.name": "James Bond" },
    valid: true,
  });
});
test("Test for a simple InArray statement to return false with a StringEquals context", () => {
  const Policies = [
    {
      Version: "2022-05-02",
      Statement: [
        {
          Effect: "Allow",
          Action: ["files:createFile"],
          Condition: [
            {
              InArray: {
                "${context:organization.affiliated_error}":
                  "${user:affiliation}", //should not match
              },
            },
            {
              "ToContext:StringEquals": {
                "user.name": "${user:name}",
              },
            },
          ],
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
    query: { "user.name": "James Bond" },
    valid: false,
  });
});
test("Test for a simple InArray statement to return true with a StringEquals context", () => {
  const Policies = [
    {
      Version: "2022-05-02",
      Statement: [
        {
          Effect: "Allow",
          Action: ["files:createFile"],
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
    query: { "user.name": "James Bond" },
    valid: true,
  });
});
test("Test for array of array in Conditions to context", () => {
  const Policies = [
    {
      Version: "2022-05-02",
      Statement: [
        {
          Effect: "Allow",
          Action: ["files:createFile"],
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
    query: {
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
