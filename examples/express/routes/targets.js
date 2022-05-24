const express = require("express");
const router = express.Router();
const authorizeToken = require("../middlewares/auth");
router
  .route("/createTarget")
  .get(
    authorizeToken(["Action", "secretsystem:targets:createTarget"]),
    (req, res) => {
      res.send("Hello Secret World!");
    }
  );
module.exports = router;
