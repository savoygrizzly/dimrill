const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/user.model");

const router = express.Router();
router.route("/createUser").post(async (req, res) => {
  const body = req.body;
  const user = await User.create(body);
  if (user) {
    res.send({ user: user });
  } else {
    res.send({ error: "An error occured" });
  }
});
router.route("/generateDummyToken").post(async (req, res) => {
  const body = req.body;
  if (!body.usernam || body.password) {
    return res.send({ error: "Missing username or password" });
  }

  let jwtSecretKey = process.env.JWT_SECRET_KEY;
  const user = await User.findOne({ username: body.username });
  if (!user || !(await user.isPasswordMatch(body.password))) {
    return res.sendStatus(403);
  }
  const userdetails = user;
  delete user.policies;

  let data = {
    sub: "007",
    user: userdetails,
    policies: user.policies,
  };
  const token = jwt.sign(data, jwtSecretKey);
  res.send({ token: token });
});
module.exports = router;
