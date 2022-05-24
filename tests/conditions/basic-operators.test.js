const { req, user, context, Dimrill } = require("../index");
/*

    Test all basic operators to return true or false
*/

test("Test for a simple StringEquals statement to return true", () => {
  const Policies = [
    {
      Version: "2022-05-02",
      Statement: [
        {
          Effect: "Allow",
          Action: ["files:createFile"],
          Condition: {
            StringEquals: {
              "${user:id}": "123445", //should match
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

test("Test for a simple StringNotEquals statement to return true", () => {
  const Policies = [
    {
      Version: "2022-05-02",
      Statement: [
        {
          Effect: "Allow",
          Action: ["files:createFile"],
          Condition: {
            StringNotEquals: {
              "${user:id}": "bound", //should not match
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

test("Test for a simple NumericEquals statement to return true", () => {
  const Policies = [
    {
      Version: "2022-05-02",
      Statement: [
        {
          Effect: "Allow",
          Action: ["files:createFile"],
          Condition: {
            NumericEquals: {
              "${user:age}": 44, //should match
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

test("Test for a simple NumericNotEquals statement to return true", () => {
  const Policies = [
    {
      Version: "2022-05-02",
      Statement: [
        {
          Effect: "Allow",
          Action: ["files:createFile"],
          Condition: {
            NumericNotEquals: {
              "${user:age}": 46, //should not match
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

test("Test for a simple NumericLessThan statement to return false", () => {
  const Policies = [
    {
      Version: "2022-05-02",
      Statement: [
        {
          Effect: "Allow",
          Action: ["files:createFile"],
          Condition: {
            NumericLessThan: {
              "${user:age}": 44, //should not match
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

test("Test for a simple NumericLessThan statement to return true", () => {
  const Policies = [
    {
      Version: "2022-05-02",
      Statement: [
        {
          Effect: "Allow",
          Action: ["files:createFile"],
          Condition: {
            NumericLessThan: {
              "${user:age}": 45, //should match
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

test("Test for a simple NumericLessThanEquals statement to return true", () => {
  const Policies = [
    {
      Version: "2022-05-02",
      Statement: [
        {
          Effect: "Allow",
          Action: ["files:createFile"],
          Condition: {
            NumericLessThanEquals: {
              "${user:age}": 44, //should match
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

test("Test for a simple NumericGreaterThan statement to return false", () => {
  const Policies = [
    {
      Version: "2022-05-02",
      Statement: [
        {
          Effect: "Allow",
          Action: ["files:createFile"],
          Condition: {
            NumericGreaterThan: {
              "${user:age}": 44, //should not match
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
test("Test for a simple NumericGreaterThan statement to return true", () => {
  const Policies = [
    {
      Version: "2022-05-02",
      Statement: [
        {
          Effect: "Allow",
          Action: ["files:createFile"],
          Condition: {
            NumericGreaterThan: {
              "${user:age}": 40, //should  match
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
test("Test for a simple NumericGreaterThanEquals statement to return true with a Number as right parameter", () => {
  const Policies = [
    {
      Version: "2022-05-02",
      Statement: [
        {
          Effect: "Allow",
          Action: ["files:createFile"],
          Condition: {
            NumericGreaterThanEquals: {
              "${user:age}": 44, //should match
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

test("Test for a simple DateEquals statement to return true with a Date object as right parameter", () => {
  const Policies = [
    {
      Version: "2022-05-02",
      Statement: [
        {
          Effect: "Allow",
          Action: ["files:createFile"],
          Condition: {
            DateEquals: {
              "${user:birthdate}": new Date("1988-01-05 08:17:51"), //should match
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

test("Test for a simple DateEquals statement to return true with a string as right parameter", () => {
  const Policies = [
    {
      Version: "2022-05-02",
      Statement: [
        {
          Effect: "Allow",
          Action: ["files:createFile"],
          Condition: {
            DateEquals: {
              "${user:birthdate_string}": "1988-01-05 08:17:51", //should match
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

test("Test for a simple DateNotEquals statement to return true with a Date object as right parameter", () => {
  const Policies = [
    {
      Version: "2022-05-02",
      Statement: [
        {
          Effect: "Allow",
          Action: ["files:createFile"],
          Condition: {
            DateNotEquals: {
              "${user:birthdate_string}": new Date().toISOString(), //should match
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

test("Test for a simple DateLessThan statement to return false with a Date object as right parameter", () => {
  const Policies = [
    {
      Version: "2022-05-02",
      Statement: [
        {
          Effect: "Allow",
          Action: ["files:createFile"],
          Condition: {
            DateLessThan: {
              "${user:birthdate_string}": new Date().toISOString(), //should match 1988-01-05 08:17:51  < NOW
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

test("Test for a simple DateLessThanEquals statement to return true with a Date object as right parameter", () => {
  const Policies = [
    {
      Version: "2022-05-02",
      Statement: [
        {
          Effect: "Allow",
          Action: ["files:createFile"],
          Condition: {
            DateLessThanEquals: {
              "${user:birthdate_string}": new Date().toISOString(), //should match 1988-01-05 08:17:51  <= NOW
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

test("Test for a simple DateGreaterThan statement to return false with a Date object as right parameter", () => {
  const Policies = [
    {
      Version: "2022-05-02",
      Statement: [
        {
          Effect: "Allow",
          Action: ["files:createFile"],
          Condition: {
            DateGreaterThan: {
              "${user:birthdate_string}": new Date().toISOString(), //should match
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

test("Test for a simple DateGreaterThanEquals statement to return false with a Date object as right parameter", () => {
  const Policies = [
    {
      Version: "2022-05-02",
      Statement: [
        {
          Effect: "Allow",
          Action: ["files:createFile"],
          Condition: {
            DateGreaterThanEquals: {
              "${user:birthdate_string}": new Date().toISOString(), //should match
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

test("Test for a simple Bool statement to return true ", () => {
  const Policies = [
    {
      Version: "2022-05-02",
      Statement: [
        {
          Effect: "Allow",
          Action: ["files:createFile"],
          Condition: {
            Bool: {
              "${user:alive}": true, //should match
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
test("Test for a simple InArray statement to return true", () => {
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
