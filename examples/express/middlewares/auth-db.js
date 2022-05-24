const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
function authorizeTokenWithDB(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (token == null) return res.sendStatus(401);

  jwt.verify(token, process.env.TOKEN_SECRET, async (err, jwt_payload) => {
    if (err) {
      console.log(err);
      return res.sendStatus(403);
    }
    const user = await User.findOne({ agentId: String(jwt_payload.sub) });
    const policies = user.policies;
    req.user = user;

    next();
  });
}
