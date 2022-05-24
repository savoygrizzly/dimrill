const { req, user, context, Dimrill } = require("./index");

test("Test for a implicit AND operands on multiple InArray statements to return true", () => {
  const Statement = {
    Condition: {
      InArray: {
        "${context:organization.affiliated}": "${user:affiliation}", //should match
        "${user:rights}": "toKill", //should match
      },
    },
  };
  expect(Dimrill.validate(Statement, req, user, context)).toEqual({
    hasContext: false,
    context: {},
    valid: true,
  });
});

test("Test for an explicit AND operands on multiple InArray statements to return false for at least one statement", () => {
  const Statement = {
    Condition: {
      "EveryValue:InArray": {
        "${context:organization.affiliated_err0r}": "${user:affiliation}", //should not match
        "${user:rights}": "toKill", //should match
      },
    },
  };
  expect(Dimrill.validate(Statement, req, user, context)).toEqual({
    hasContext: false,
    context: {},
    valid: false,
  });
});
test("Test for an explicit AND operands on multiple InArray statements to return false for every statements", () => {
  const Statement = {
    Condition: {
      "EveryValue:InArray": {
        "${context:organization.affiliated_err0r}": "${user:affiliation}", //should not match
        "${user:rights}": "toLove", //should match
      },
    },
  };
  expect(Dimrill.validate(Statement, req, user, context)).toEqual({
    hasContext: false,
    context: {},
    valid: false,
  });
});
test("Test for an explicit AND operands on multiple InArray statements to return true to all statements", () => {
  const Statement = {
    Condition: {
      "EveryValue:InArray": {
        "${context:organization.affiliated}": "${user:affiliation}", //should match
        "${user:rights}": "toKill", //should match
      },
    },
  };
  expect(Dimrill.validate(Statement, req, user, context)).toEqual({
    hasContext: false,
    context: {},
    valid: true,
  });
});
test("Test for an explicit OR operands on multiple InArray statements to return false", () => {
  const Statement = {
    Condition: {
      "AnyValue:InArray": {
        "${context:organization.affiliated_err0r}": "${user:affiliation}", //should not match
        "${user:rights}": "toLove", //no match
      },
    },
  };
  expect(Dimrill.validate(Statement, req, user, context)).toEqual({
    hasContext: false,
    context: {},
    valid: false,
  });
});
