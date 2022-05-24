const { req, user, context, Dimrill } = require("./index");

test("Test for a simple StringEquals policy match to return true", () => {
  const Policies = [
    {
      Version: "2022-05-02",
      Statement: [
        {
          Effect: "Allow",
          Action: ["files:createFile"],
          Condition: {
            "ToContext:StringEquals": {
              creator_id: "${user:id}",
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
    hasContext: true,
    context: {
      creator_id: "123445",
    },
    valid: true,
  });
});

test("Test for a simple StringEquals policy match to return false", () => {
  const Policies = [
    {
      Version: "2022-05-02",
      Statement: [
        {
          Effect: "Allow",
          Ressource: ["files:getSingleFile:fileId/97"],
          Condition: {
            "ToContext:StringEquals": {
              creator_id: "${user:id}",
            },
          },
        },
      ],
    },
  ];
  expect(
    Dimrill.authorize(
      ["Action", "files:getSingleFile"],
      Policies,
      {
        query: {
          fileId: "*",
        },
      },
      user,
      context
    )
  ).toEqual({
    hasContext: false,
    context: {},
    valid: false,
  });
});

test("Test for a simple StringEquals policy match to return true", () => {
  const Policies = [
    {
      Version: "2022-05-02",
      Statement: [
        {
          Effect: "Allow",
          Ressource: ["files:getSingleFile:fileId/97"],
          Condition: {
            "ToContext:StringEquals": {
              creator_id: "${user:id}",
            },
          },
        },
      ],
    },
  ];
  expect(
    Dimrill.authorize(
      ["Action", "files:getSingleFile"],
      Policies,
      req,
      user,
      context
    )
  ).toEqual({
    hasContext: false,
    context: {},
    valid: false,
  });
});
