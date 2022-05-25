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
        We might not need to pass the full req object to Dimrill, we will only pass the body if it's a post request,
        otherwise we'll pass the query params.
        */
      const formattedReq = req.method == "POST" ? req.body : req.query;
      const authorizer = Dimrill.authorize(
        drna_array,
        policies,
        formattedReq,
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
