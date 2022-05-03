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

const matchVariables = (operands, variables, sanitize = true) => {
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
          .reduce(
            (a, b) =>
              sanitize
                ? a[String(b)]
                    .replace(/:/, "")
                    .replace(/\//, "")
                    .replace(/\*/, "")
                : a[String(b)],
            variable
          );
        return (typeof value !== "function" ? value : null) ?? null;
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
  toContext = false,
  silent = false
) => {
  if (!conditionOperands) {
    return false;
  }
  if (toContext) {
    /*
        Apply adapter
      */
    try {
      return typeof adapters[instructions.condition] === "function"
        ? adapters[instructions.condition](
            conditionOperands[0],
            conditionOperands[1]
          )
        : false;
    } catch (error) {
      /*
        If adapter operator fails throws an error unless silent parameter is passed in the options in which case it returns false
      */
      if (silent) {
        return false;
      }
      throw new Error(`Invalid context operator: ${error}`);
    }
  } else {
    /*
        validate condition
      */
    try {
      return typeof Conditions[instructions.condition] === "function"
        ? Conditions[instructions.condition](
            conditionOperands[0],
            conditionOperands[1]
          )
        : false;
    } catch (error) {
      /*
        If operator fails throws an error unless silent parameter is passed in the options in which case it returns false
      */
      if (silent) {
        return false;
      }
      throw new Error(`Invalid operator: ${error}`);
    }
  }
};
const verifyOperator = (
  instructions,
  conditionOperands,
  req = {},
  user = {},
  context = {},
  adapters = {},
  silent = false
) => {
  const verificationState = {
    hasContext: false,
    context: {},
    valid: undefined,
  };
  //check wether conditionOperands is an array:
  conditionOperands =
    Array.isArray(conditionOperands) && conditionOperands.length > 1
      ? conditionOperands
      : Object.entries(conditionOperands).length > 1
      ? Object.entries(conditionOperands).map((m) => ({ [m[0]]: m[1] }))
      : Array(conditionOperands);

  conditionOperands.forEach((operand, k, arr) => {
    const OperandsArray = matchVariables(
      Object.entries(operand)[0],
      {
        req,
        user,
        context,
      },
      false
    );
    let validated = verifyOperands(
      instructions,
      OperandsArray,
      adapters,
      instructions.ToContext,
      silent
    );
    if (typeof validated === "boolean") {
      /*
            Verify wether condition matches instructions
        */
      verificationState.valid =
        (validated || verificationState.valid === true) &&
        instructions.AnyValue &&
        instructions.condition
          ? true
          : validated &&
            (verificationState.valid === true ||
              verificationState.valid === undefined);
    } else if (
      typeof validated === "object" &&
      Object.keys(validated).length >= 1
    ) {
      /*
          Add context
          Mark as Valid
        */
      verificationState.valid =
        Object.is(arr.length - 1, k) && verificationState.valid === undefined
          ? true
          : verificationState.valid;
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
