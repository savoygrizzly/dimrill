const jwt = require("jsonwebtoken");

const Dimrill = require("../../../lib/");

const Schema = new Dimrill.Schema(require("../schema/schema"), {
  debug: true,
  strict: true,
});

Dimrill.initialize({ options: { adapter: "mongo" }, Schema: Schema });

const authorizeToken = (drna_array) => {
  return (req, res, next) => {
    console.log(req.params);
    const authHeader = req.headers["authorization"];

    const token = authHeader || authHeader.split(" ")[1];

    if (token == null) return res.sendStatus(401);

    jwt.verify(token, process.env.JWT_SECRET_KEY, (err, jwt_payload) => {
      if (err) {
        return res.sendStatus(403);
      }
      const policies = jwt_payload.policies,
        user = jwt_payload.user;
      console.log(policies, user, req);
      const authorize = Dimrill.authorize(drna_array, policies, req, user, {});
      console.log(authorize);
      next();
    });
  };
};

module.exports = authorizeToken;
