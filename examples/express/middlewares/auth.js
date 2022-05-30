const jwt = require("jsonwebtoken");

const Dimrill = require("../dimrill");

const authorizeToken = (drna_array) => {
  return (req, res, next) => {
    const authHeader = req.headers["bearer"];
    const token = authHeader || authHeader.split(" ")[1];

    if (token == null) return res.sendStatus(401);
    jwt.verify(token, process.env.JWT_SECRET_KEY, (err, jwt_payload) => {
      if (err) {
        return res.sendStatus(403);
      }
      const policies = jwt_payload.policies,
        user = jwt_payload.user;
      /*
        We might not need to pass the full req object to Dimrill.
        We can use the authorize Parameter extractor to achieve that.
        We'll pass req as an array and give an array of parameters to extract from the req,
        N.B by default those params and their values will be merged into a single object, if your request contains both a body 
        and a query with properties sharing names and you wish to use both in policies, add an optional param set to true to keep the req body and query, properties.

        See more on the Dimrill's wiki. https://github.com/sosickstudio/dimrill/wiki/Syntax#req
        */
      const authorizer = Dimrill.authorize(
        drna_array,
        policies,
        [["query"], req],
        user,
        {}
      );
      if (authorizer.valid !== true) {
        return res.sendStatus(403);
      }
      /*
        If authorizer returns valid check if it has a query and attach it to res.locals to be used subsequently
      */
      if (
        typeof authorizer.query === "string" ||
        (typeof authorizer.query === "object" &&
          Object.keys(authorizer.query).length >= 1)
      ) {
        /*
          Let's create a property "dimrillQuery" so we can access it later
        */

        res.locals.dimrill_query = authorizer.query;
      }
      next();
    });
  };
};

module.exports = authorizeToken;
