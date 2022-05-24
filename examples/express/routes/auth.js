const express = require("express");
const jwt = require("jsonwebtoken");

const User = require("../models/user.model");

const router = express.Router();
router.route("/generateDummyToken").get((req, res) => {
  let jwtSecretKey = process.env.JWT_SECRET_KEY;
  let data = {
    sub: "007",
    user: {
      agentId: "007",
      affiliation: "MI6",
      birthdate: "1988-01-05 08:17:51",
      firstName: "James",
      lastName: "Bond",
      rights: ["toKill", "toDrink"],
      weapons: {
        gun: "Beretta",
        watch: "Rolex",
      },
    },
    policies: [
      {
        Version: "2022-05-02",
        Statement: [
          {
            Effect: "Allow",
            Action: ["system:targets:createTarget*:organizationId/09092"],
            Ressource: ["system:targets:getTarget*"],
          },
          {
            Effect: "Allow",
            Action: [
              "system:agents:updateAgentInformations:agentId/${req:agentId}",
            ],
            Condition: {
              StringEquals: {
                "${req:agentId}": "${user:agentId}",
              },
              "ToContext:StringEquals": {
                agentId: "${user:agentId}",
              },
            },
          },
        ],
      },
    ],
  };
  const token = jwt.sign(data, jwtSecretKey);
  res.send({ token: token });
});
module.exports = router;
