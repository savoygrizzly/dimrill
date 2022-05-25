const express = require("express");
const router = express.Router();
const authorizeToken = require("../middlewares/auth");
router
  .route("/updateAgentInformations")
  .post(
    authorizeToken(["Action", "system:agents:updateAgentInformations"]),
    (req, res) => {
      res.send("Agent updated");
    }
  );

router
  .route("/getAgentDetails")
  .get(
    authorizeToken(["Ressource", "system:agents:getAgentDetails"]),
    (req, res) => {
      console.log(res.locals);
      res.send("Hello Agent!");
    }
  );
module.exports = router;
