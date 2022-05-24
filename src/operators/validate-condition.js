const { verifyOperator, getOperators } = require("./operators");
/**
 *
 * @param {object} conditions - An object with the condition to be validated.
 * @param {object} req - The req object passed from the server.
 * @param {object} user - The data associated to the user attempting to authorize.
 * @param {object} context - An object containing additional informations to be used during the authorization process.
 * @param {object} adapters - An object containings the functions for each operators to convert condition to DB query language, as well as a returnAs key to describe the type of data returend by {conditionsResults}.
 * @param {boolean} silent - If set to true errors will not throw an exception.
 * @returns {object} - Object with keys: valid (Boolean), hasQuery (Boolean), query (Object)/(String).
 */
module.exports = function validateConditions(
  conditions,
  req,
  user,
  context,
  adapters = undefined,
  silent = false
) {
  const conditionsResults = {
    hasQuery: false,
    query: adapters.returnAs == "String" ? "" : {},
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
        hasQuery: false,
        query: adapters.returnAs == "String" ? [] : [],
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
              Merge valid and hasQuery states
            */
          setResults.valid = subSetResults.valid || setResults.valid;
          setResults.hasQuery = subSetResults.hasQuery || setResults.hasQuery;

          /*

            For Obkect type queries
            */
          if (
            adapters.returnAs === "Object" &&
            typeof subSetResults.query === "object"
          ) {
            subSetResults.query =
              Object.values(subSetResults.query).length > 1
                ? typeof adapters.operators.explicitAnd === "function"
                  ? adapters.operators.explicitAnd(subSetResults.query)
                  : adapters.operators.and(subSetResults.query)
                : subSetResults.query;
            setResults.query.push(subSetResults.query);
          } else if (
            adapters.returnAs === "String" &&
            typeof subSetResults.query === "string"
          ) {
            setResults.query.push(`(${subSetResults.query})`);
          }
        });
        /*
            apply the logical OR adapter if there is a query
          */
        setResults.query = adapters.operators.or(setResults.query);
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
        adapters.returnAs === "Object" &&
        typeof setResults.query === "object" &&
        !Array.isArray(setResults.query) &&
        setResults.query !== null &&
        Object.keys(setResults.query).length >= 1
      ) {
        /*
            Merge condition context results with others
          */
        conditionsResults.hasQuery = true;
        conditionsResults.query = {
          ...conditionsResults.query,
          ...setResults.query,
        };
      } else if (
        adapters.returnAs === "String" &&
        typeof setResults.query === "string"
      ) {
        conditionsResults.hasQuery = true;
        if (conditionsResults.query != "") {
          conditionsResults.query = `(${conditionsResults.query}) AND (${setResults.query})`;
        } else {
          conditionsResults.query = setResults.query;
        }
      }
    }
  });
  return conditionsResults;
};
