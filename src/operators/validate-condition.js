const { verifyOperator, getOperators } = require("./operators");
module.exports = function validateConditions(
  conditions,
  req,
  user,
  context,
  adapters = undefined,
  silent = false
) {
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
        context: [],
      };
      /*
        If its an array it means a logical OR is present 
        */
      if (Array.isArray(condition) && condition.length > 1) {
        condition.forEach((conditionPart) => {
          /*
              Verify and merge results and context for each or the array's element
            */
          const subSetResults = verifyOperator(
            getOperators(req, user, context, Object.keys(conditionPart)[0]),
            Object.values(conditionPart)[0],
            req,
            user,
            context,
            adapters
          );
          /*
              Merge valid and hasContext states
            */
          setResults.valid = subSetResults.valid || setResults.valid;
          setResults.hasContext =
            subSetResults.hasContext || setResults.hasContext;

          subSetResults.context =
            Object.values(subSetResults.context).length > 1
              ? typeof adapters.operators.explicitAnd === "function"
                ? adapters.operators.explicitAnd(subSetResults.context)
                : adapters.operators.and(subSetResults.context)
              : subSetResults.context;
          setResults.context.push(subSetResults.context);
        });
        /*
            apply the logical OR adapter if there is a context
          */
        setResults.context = adapters.operators.or(setResults.context);
      } else {
        setResults = verifyOperator(
          getOperators(req, user, context, Object.keys(condition)[0]),
          Object.values(condition)[0],
          req,
          user,
          context,
          adapters,
          silent
        );
      }

      /*
            Merge condition result results with others by applying an AND logic 
            (if all conditions are true)
        */
      conditionsResults.valid = setResults.valid && conditionsResults.valid;
      if (
        typeof setResults.context === "object" &&
        !Array.isArray(setResults.context) &&
        setResults.context !== null &&
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
  return conditionsResults;
};
