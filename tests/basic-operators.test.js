const { req, user, context, Dimrill } = require("./index");
/*

    Test all basic operators to return true or false
*/

test("Test for a simple StringEquals statement to return true", () => {
  const Statement = {
    Condition: {
      StringEquals: {
        "${user:id}": "bond", //should match
      },
    },
  };
  expect(Dimrill.validate(Statement, req, user, context)).toEqual({
    hasContext: false,
    context: {},
    valid: true,
  });
});

test("Test for a simple StringNotEquals statement to return true", () => {
  const Statement = {
    Condition: {
      StringNotEquals: {
        "${user:id}": "bound", //should not match
      },
    },
  };
  expect(Dimrill.validate(Statement, req, user, context)).toEqual({
    hasContext: false,
    context: {},
    valid: true,
  });
});

test("Test for a simple NumericEquals statement to return true", () => {
  const Statement = {
    Condition: {
      NumericEquals: {
        "${user:age}": 44, //should match
      },
    },
  };
  expect(Dimrill.validate(Statement, req, user, context)).toEqual({
    hasContext: false,
    context: {},
    valid: true,
  });
});

test("Test for a simple NumericNotEquals statement to return true", () => {
  const Statement = {
    Condition: {
      NumericNotEquals: {
        "${user:age}": 46, //should not match
      },
    },
  };
  expect(Dimrill.validate(Statement, req, user, context)).toEqual({
    hasContext: false,
    context: {},
    valid: true,
  });
});

test("Test for a simple NumericLessThan statement to return false", () => {
  const Statement = {
    Condition: {
      NumericLessThan: {
        "${user:age}": 44, //should not match
      },
    },
  };
  expect(Dimrill.validate(Statement, req, user, context)).toEqual({
    hasContext: false,
    context: {},
    valid: false,
  });
});

test("Test for a simple NumericLessThan statement to return true", () => {
  const Statement = {
    Condition: {
      NumericLessThan: {
        "${user:age}": 45, //should match
      },
    },
  };
  expect(Dimrill.validate(Statement, req, user, context)).toEqual({
    hasContext: false,
    context: {},
    valid: true,
  });
});

test("Test for a simple NumericLessThanEquals statement to return true", () => {
  const Statement = {
    Condition: {
      NumericLessThanEquals: {
        "${user:age}": 44, //should match
      },
    },
  };
  expect(Dimrill.validate(Statement, req, user, context)).toEqual({
    hasContext: false,
    context: {},
    valid: true,
  });
});

test("Test for a simple NumericGreaterThan statement to return false", () => {
  const Statement = {
    Condition: {
      NumericGreaterThan: {
        "${user:age}": 44, //should not match
      },
    },
  };
  expect(Dimrill.validate(Statement, req, user, context)).toEqual({
    hasContext: false,
    context: {},
    valid: false,
  });
});
test("Test for a simple NumericGreaterThan statement to return true", () => {
  const Statement = {
    Condition: {
      NumericGreaterThan: {
        "${user:age}": 40, //should  match
      },
    },
  };
  expect(Dimrill.validate(Statement, req, user, context)).toEqual({
    hasContext: false,
    context: {},
    valid: true,
  });
});
test("Test for a simple NumericGreaterThanEquals statement to return true with a Number as right parameter", () => {
  const Statement = {
    Condition: {
      NumericGreaterThanEquals: {
        "${user:age}": 44, //should match
      },
    },
  };
  expect(Dimrill.validate(Statement, req, user, context)).toEqual({
    hasContext: false,
    context: {},
    valid: true,
  });
});

test("Test for a simple DateEquals statement to return true with a Date object as right parameter", () => {
  const Statement = {
    Condition: {
      DateEquals: {
        "${user:birthdate}": new Date("1988-01-05 08:17:51"), //should match
      },
    },
  };
  expect(Dimrill.validate(Statement, req, user, context)).toEqual({
    hasContext: false,
    context: {},
    valid: true,
  });
});

test("Test for a simple DateEquals statement to return true with a string as right parameter", () => {
  const Statement = {
    Condition: {
      DateEquals: {
        "${user:birthdate_string}": "1988-01-05 08:17:51", //should match
      },
    },
  };
  expect(Dimrill.validate(Statement, req, user, context)).toEqual({
    hasContext: false,
    context: {},
    valid: true,
  });
});

test("Test for a simple DateNotEquals statement to return true with a Date object as right parameter", () => {
  const Statement = {
    Condition: {
      DateNotEquals: {
        "${user:birthdate_string}": new Date().toISOString(), //should match
      },
    },
  };
  expect(Dimrill.validate(Statement, req, user, context)).toEqual({
    hasContext: false,
    context: {},
    valid: true,
  });
});

test("Test for a simple DateLessThan statement to return false with a Date object as right parameter", () => {
  const Statement = {
    Condition: {
      DateLessThan: {
        "${user:birthdate_string}": new Date().toISOString(), //should match 1988-01-05 08:17:51  < NOW
      },
    },
  };
  expect(Dimrill.validate(Statement, req, user, context)).toEqual({
    hasContext: false,
    context: {},
    valid: true,
  });
});

test("Test for a simple DateLessThanEquals statement to return true with a Date object as right parameter", () => {
  const Statement = {
    Condition: {
      DateLessThanEquals: {
        "${user:birthdate_string}": new Date().toISOString(), //should match 1988-01-05 08:17:51  <= NOW
      },
    },
  };
  expect(Dimrill.validate(Statement, req, user, context)).toEqual({
    hasContext: false,
    context: {},
    valid: true,
  });
});

test("Test for a simple DateGreaterThan statement to return false with a Date object as right parameter", () => {
  const Statement = {
    Condition: {
      DateGreaterThan: {
        "${user:birthdate_string}": new Date().toISOString(), //should match
      },
    },
  };
  expect(Dimrill.validate(Statement, req, user, context)).toEqual({
    hasContext: false,
    context: {},
    valid: false,
  });
});

test("Test for a simple DateGreaterThanEquals statement to return false with a Date object as right parameter", () => {
  const Statement = {
    Condition: {
      DateGreaterThanEquals: {
        "${user:birthdate_string}": new Date().toISOString(), //should match
      },
    },
  };
  expect(Dimrill.validate(Statement, req, user, context)).toEqual({
    hasContext: false,
    context: {},
    valid: false,
  });
});

test("Test for a simple Bool statement to return true ", () => {
  const Statement = {
    Condition: {
      Bool: {
        "${user:alive}": true, //should match
      },
    },
  };
  expect(Dimrill.validate(Statement, req, user, context)).toEqual({
    hasContext: false,
    context: {},
    valid: true,
  });
});
test("Test for a simple InArray statement to return true", () => {
  const Statement = {
    Condition: {
      InArray: {
        "${context:organization.affiliated}": "${user:affiliation}", //should match
      },
    },
  };
  expect(Dimrill.validate(Statement, req, user, context)).toEqual({
    hasContext: false,
    context: {},
    valid: true,
  });
});
