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
  if (!Array.isArray(operands) || operands.length < 1) {
    return null;
  }
  return operands.map((value) => {
    const match = value.match(/\$\{(..*?)\}/);
    if (match) {
      const variable =
        variables[match[1].split(":")[0]][match[1].split(":")[0]];

      const value = match[1]
        .split(":")[1]
        .split(".")
        .reduce((a, b) => a[b], variable);

      return value ?? null;
    } else {
      //value is a fixed string
      return value;
    }
  });
};

const verifyOperands = (
  instructions,
  conditionOperands,
  adapters = {},
  toContext = false
) => {
  if (!conditionOperands) {
    return false;
  }
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
const verifyConditionSet = (
  instructions,
  conditionOperands,
  req = {},
  user = {},
  context = {},
  adapters = {}
) => {
  //check if conditionOperands is an array:
  //console.log(conditionOperands);
  const verificationState = {
    hasContext: false,
    context: {},
    valid: true,
  };
  conditionOperands =
    Array.isArray(conditionOperands) && conditionOperands.length > 1
      ? conditionOperands
      : Array(conditionOperands);

  conditionOperands.forEach((operand) => {
    const OperandsArray = matchVariables(Object.entries(operand)[0], {
      req,
      user,
      context,
    });
    console.log(OperandsArray);
    let validated = verifyOperands(
      instructions,
      OperandsArray,
      adapters,
      instructions.ToContext
    );
    console.log(instructions, validated);
    if (typeof validated === "boolean") {
      /*
          Verify wether condition matches instructions
        */
      verificationState.valid =
        (validated || verificationState.valid) && instructions.AnyValue
          ? true
          : validated && verificationState.valid;
    } else if (typeof validated === "object" && Object.keys().length >= 1) {
      verificationState.hasContext = true;
      verificationState.context = {
        ...verificationState.hasContext,
        ...validated,
      };
    }
    console.log(verificationState);
  });
  console.log(verificationState);
  /*
  if (Array.isArray(conditionOperands) && conditionOperands.length > 1) {
    
  } else {
    const OperandsArray = matchVariables(Object.entries(conditionOperands)[0], {
      req,
      user,
      context,
    });
    console.log(OperandsArray);
    let validated = verifyOperands(
      instructions,
      OperandsArray,
      adapters,
      instructions.ToContext
    );
    console.log(validated);
  }*/
};

const validateConditions = (
  conditions,
  req,
  user,
  context,
  adapters = undefined
) => {
  conditions =
    Array.isArray(conditions) && conditions.length > 1
      ? conditions
      : Array(conditions);

  conditions.forEach((condition) => {
    if (!Object.keys(condition).length >= 1) {
      //no conditions
    } else {
      verifyConditionSet(
        getInstructions(req, user, context, Object.keys(condition)[0]),
        Object.values(condition)[0],
        req,
        user,
        context,
        adapters
      );
    }
  });
  /*if (Array.isArray(conditions) && conditions.length > 1) {
    //iterate and apply "AND" operand
    console.log("must iterate");
    conditions.forEach((condition) => {
      verifyConditionSet(
        getInstructions(req, user, context, Object.keys(condition)[0]),
        Object.values(condition)[0],
        req,
        user,
        context,
        adapters
      );
    });
  } else {
    verifyConditionSet(
      getInstructions(req, user, context, Object.keys(conditions)[0]),
      Object.values(conditions)[0],
      req,
      user,
      context,
      adapters
    );
  }*/
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
