const Conditions = require("./list");
const getOperators = (req, user, context, condition) => {
  const instructions = {
    ToContext: false,
    AnyValue: false,
    EveryValue: false,
    condition: "",
  };

  condition.split(":").forEach((e) => {
    if (typeof Conditions[String(e)] === "function") {
      instructions.condition = e;
    } else if (instructions[String(e)] !== undefined) {
      instructions[String(e)] =
        instructions[String(e)] !== undefined ? true : instructions[String(e)];
    }
  });
  return instructions;
};

const matchVariables = (operands, variables) => {
  if (!Array.isArray(operands) || operands.length < 1) {
    return null;
  }
  return operands.map((value) => {
    if (typeof value === "string") {
      const match = value.match(/\$\{(..*?)\}/);
      if (match) {
        const variable =
          variables[match[1].split(":")[0]][match[1].split(":")[0]];

        const value = match[1]
          .split(":")[1]
          .split(".")
          .reduce((a, b) => a[String(b)], variable);

        return value ?? null;
      } else {
        //value is a fixed string
        return value;
      }
    } else {
      //value is a not a string
      /*
        If a function is returned here it should get cast to supported format by either the validator or the adapter
        However if the user supplies an adapter that does not cast input type, it can lead to a code injection via adapter
      */
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
    /*
        Apply adapter
      */
    return typeof adapters[instructions.condition] === "function"
      ? adapters[instructions.condition](
          conditionOperands[0],
          conditionOperands[1]
        )
      : false;
  } else {
    /*
        validate condition
      */
    return typeof Conditions[instructions.condition] === "function"
      ? Conditions[instructions.condition](
          conditionOperands[0],
          conditionOperands[1]
        )
      : false;
  }
};
const verifyOperator = (
  instructions,
  conditionOperands,
  req = {},
  user = {},
  context = {},
  adapters = {}
) => {
  const verificationState = {
    hasContext: false,
    context: {},
    valid: true,
  };
  //check wether conditionOperands is an array:
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
    let validated = verifyOperands(
      instructions,
      OperandsArray,
      adapters,
      instructions.ToContext
    );
    if (typeof validated === "boolean") {
      /*
            Verify wether condition matches instructions
        */
      verificationState.valid =
        (validated || verificationState.valid) &&
        instructions.AnyValue &&
        instructions.condition
          ? true
          : validated && verificationState.valid;
    } else if (
      typeof validated === "object" &&
      Object.keys(validated).length >= 1
    ) {
      /*
          Add context
  
        */
      verificationState.hasContext = true;
      verificationState.context = {
        ...verificationState.context,
        ...validated,
      };
    }
  });
  /* 
        check wether Context must be wrapped in a logic operator
    */
  if (
    verificationState.hasContext &&
    Object.keys(verificationState.context).length >= 2
  ) {
    /* 
        Context must be applied to a OR logical operator
      */
    if (instructions.AnyValue) {
      verificationState.context = adapters.operators.or(
        verificationState.context
      );
    } else {
      /* 
        Context must be applied to a AND logical operator,
        this line is required to make sure translation to languages other than MongoDB happens
      */
      verificationState.context = adapters.operators.and(
        verificationState.context
      );
    }
  }
  return verificationState;
};
module.exports = {
  getOperators,
  verifyOperator,
};
