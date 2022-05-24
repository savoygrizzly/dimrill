const jwt = require("jsonwebtoken");

function authorizeToken(req, res, next) {
  const authHeader = req.headers["authorization"];

  const token = authHeader || authHeader.split(" ")[1];

  if (token == null) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET_KEY, (err, jwt_payload) => {
    if (err) {
      console.log(err);
      return res.sendStatus(403);
    }
    const policies = jwt_payload.policies,
      user = jwt_payload.user;

    req.user = jwt_payload;

    next();
  });
}
module.exports = authorizeToken;
