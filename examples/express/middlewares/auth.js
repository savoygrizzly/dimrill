const jwt = require("jsonwebtoken");

const Dimrill = require("../../../lib/");

const Schema = new Dimrill.Schema(require("../schema/schema"), {
  debug: true,
  strict: true,
});

Dimrill.initialize({ options: { adapter: "mongo" }, Schema: Schema });

const authorizeToken = (drna_array) => {
  return (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader || authHeader.split(" ")[1];

    if (token == null) return res.sendStatus(401);
    console.log(drna_array);
    jwt.verify(token, process.env.JWT_SECRET_KEY, (err, jwt_payload) => {
      if (err) {
        return res.sendStatus(403);
      }
      const policies = jwt_payload.policies,
        user = jwt_payload.user;
      console.log(policies[0].Statement);
      const authorize = Dimrill.authorize(
        drna_array,
        policies,
        req.body,
        user,
        {}
      );
      console.log(authorize);
      if (authorize.valid !== true) {
        return res.sendStatus(403);
      }
      next();
    });
  };
};

module.exports = authorizeToken;
