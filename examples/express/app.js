const express = require("express");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

const User = require("./models/user.model");

const app = express();
const port = 3000;

dotenv.config();
mongoose
  .connect(process.env.URI)
  .then(() => {
    const routes = require("./routes/");
    app.get("/public", (req, res) => {
      res.send("Hello World!");
    });
    app.use(routes);
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
