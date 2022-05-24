const express = require("express");
const dotenv = require("dotenv");
const mongoose = require("mongoose");

const User = require("../models/user.model");

const app = express();
const port = 3000;
const uri = "mongodb://localhost/mongoose-shared-connection";
mongoose
  .connect(uri)
  .then(() => {
    app.get("/public", req, (res) => {
      res.send("Hello World!");
    });
    app.get("/private", authorizeToken(""), req, (res) => {
      res.send("Hello Secret World!");
    });

    app.post("/user/generateToken", (req, res) => {
      // Validate User Here
      // Then generate JWT Token

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
                Action: [
                  "secretsystem:targets:createTarget:*:organizationId/09092",
                ],
                Ressource: ["secretsystem:targets:getTarget*"],
              },
              {
                Effect: "Allow",
                Action: [
                  "secretsystem:agents:updateAgentInformations:agentId/${req:agentId}",
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
      res.send(token);
    });
    /*
    app.post("/user/generateDBToken", async (req, res) => {
      // Validate User Here
      // Then generate JWT Token
      const user = await User.findOne({ username: String(req.body.username) });
      if (user && (await user.isPasswordMatch(password))) {
        let jwtSecretKey = process.env.JWT_SECRET_KEY;
        let data = {
          sub: user.agentId,
        };
        const token = jwt.sign(data, jwtSecretKey);
        res.send({ jwt: token });
      } else {
        res.send({ error: "403" });
      }
    });
    app.get("/privateDB", authorizeToken(""), req, (res) => {
      res.send("Hello Secret World!");
    });*/
    app.listen(port, () => {
      // eslint-disable-next-line no-console
      console.log(`Example app listening on port ${port}`);
    });
  })
  .catch((error) => {
    throw Error(`Connection error ${error}`);
  });
