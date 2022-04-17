"use strict";
const Adapters = require("./adapters");
const Conditions = require("./conditions");

const getInstructions = (req, user, context, condition) => {
  const instructions = {
    ToContext: false,
    AnyValue: false,
    EveryValue: false,
    condition: "",
  };

  condition.split(":").forEach((e) => {
    if (typeof Conditions[e] === "function") {
      instructions.condition = e;
    } else if (instructions[e] !== undefined) {
      instructions[e] = instructions[e] !== undefined ? true : instructions[e];
    }
  });
  return instructions;
};
const matchVariables = (operands, variables) => {
  return operands.map((value) => {
    const match = value.match(/\$\{(..*?)\}/);
    const variable = variables[match[1].split(":")[0]][match[1].split(":")[0]];
    if (match) {
      const value = match[1]
        .split(":")[1]
        .split(".")
        .reduce((a, b) => a[b], variable);

      return value ?? null;
    } else {
      return null;
    }
  });
};

const verify = (
  instructions,
  conditionOperands,
  adapters = {},
  toContext = false
) => {
  if (toContext) {
    return typeof adapters[instructions.condition] === "function"
      ? adapters[instructions.condition](
          conditionOperands[0],
          conditionOperands[1]
        )
      : false;
  } else {
    return typeof Conditions[instructions.condition] === "function"
      ? Conditions[instructions.condition](
          conditionOperands[0],
          conditionOperands[1]
        )
      : false;
  }
};
const verifyCondition = (
  instructions,
  conditionOperands,
  req = {},
  user = {},
  context = {},
  adapters = {}
) => {
  //check if conditionOperands is an array:
  if (Array.isArray(conditionOperands) && conditionOperands.length > 1) {
    //is Array need to iterate
  } else {
    const OperandsArray = matchVariables(Object.entries(conditionOperands)[0], {
      req,
      user,
      context,
    });
    let validated = verify(
      instructions,
      OperandsArray,
      adapters,
      instructions.ToContext
    );
    console.log(validated);
  }
};

const validateConditions = (
  conditions,
  req,
  user,
  context,
  adapters = undefined
) => {
  if (typeof Array.isArray(conditions) && conditions.length > 1) {
    //iterate and apply "AND" operand
    console.log("must iterate");
    conditions.forEach((condition) => {
      verifyCondition(
        getInstructions(req, user, context, Object.keys(condition)[0]),
        Object.values(conditions)[0],
        req,
        user,
        context,
        adapters
      );
    });
  } else {
    verifyCondition(
      getInstructions(req, user, context, Object.keys(conditions)[0]),
      Object.values(conditions)[0],
      req,
      user,
      context,
      adapters
    );
  }
};

function validate(statement, req, user, context) {
  if (typeof this.adapter !== "object") {
    console.error("Bolt is not initialized");
    return this;
  }
  if (!statement.Condition) {
    //Nothing to validate condition is empty
    this.valid = true;
    this.context = context;
  } else {
    //validate
    validateConditions(statement.Condition, req, user, context, this.adapter);
  }
  return this;
}

function initialize(...args) {
  this.adapter = args[0].options
    ? Adapters[args[0].options.adapter] ?? Adapters.mongo
    : Adapters.mongo;
  return this;
}
module.exports = {
  validate: validate,
  initialize: initialize,
};
