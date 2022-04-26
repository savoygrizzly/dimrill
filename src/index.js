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
const verifyConditionSet = (
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

const validateConditions = (
  conditions,
  req,
  user,
  context,
  adapters = undefined
) => {
  const conditionsResults = {
    hasContext: false,
    context: {},
    valid: true,
  };
  /* 
    Transform conditions into an array if it isn't
  */
  conditions =
    Array.isArray(conditions) && conditions.length >= 1
      ? conditions
      : Object.keys(conditions).length > 1
      ? Object.entries(conditions).map((m) => ({ [m[0]]: m[1] }))
      : Array(conditions);
  /*
    Iterate over the condition block keys
  */
  conditions.forEach((condition) => {
    /*
      if is not an object but an array
    */
    if (Object.keys(condition).length >= 1) {
      /*
        Extract instructions from the key of the object
      */

      let setResults = {
        valid: false,
        hasContext: false,
        context: {},
      };
      /*
      If its an array it means a logical OR is present 
      */
      if (Array.isArray(condition) && condition.length > 1) {
        condition.forEach((conditionPart) => {
          /*
            Verify and merge results and context for each or the array's element
          */
          const subSetResults = verifyConditionSet(
            getInstructions(req, user, context, Object.keys(conditionPart)[0]),
            Object.values(conditionPart)[0],
            req,
            user,
            context,
            adapters
          );
          //console.log(subSetResults);
          /*
            Merge valid and hasContext states
          */
          setResults.valid = subSetResults.valid || setResults.valid;
          setResults.hasContext =
            subSetResults.hasContext || setResults.hasContext;

          setResults.context = {
            ...setResults.context,
            ...subSetResults.context,
          };
        });
        /*
          apply the logical OR adapter if there is a context
        */
        setResults.context = adapters.operators.or(setResults.context);
        console.log(setResults.context);
      } else {
        setResults = verifyConditionSet(
          getInstructions(req, user, context, Object.keys(condition)[0]),
          Object.values(condition)[0],
          req,
          user,
          context,
          adapters
        );
      }

      /*
          Merge condition result results with others by applying an AND logic 
          (if all conditions are true)
      */
      conditionsResults.valid = setResults.valid && conditionsResults.valid;
      if (
        typeof setResults.context === "object" &&
        Object.keys(setResults.context).length >= 1
      ) {
        /*
          Merge condition context results with others
        */
        conditionsResults.hasContext = true;
        conditionsResults.context = {
          ...conditionsResults.context,
          ...setResults.context,
        };
      }
    }
  });
  console.log(conditionsResults);
  return conditionsResults;
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
