const express = require("express");
const router = express.Router();
const authorizeToken = require("../middlewares/auth");
router
  .route("/createTarget")
  .post(
    authorizeToken(["Action", "system:targets:createTarget"]),
    (req, res) => {
      res.send("Target created");
    }
  );

router
  .route("/getTarget")
  .get(
    authorizeToken(["Ressource", "system:targets:getTarget"]),
    (req, res) => {
      res.send("Hello Target!");
    }
  );
module.exports = router;
