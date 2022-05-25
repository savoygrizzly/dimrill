const express = require("express");
const dotenv = require("dotenv");
const mongoose = require("mongoose");

const app = express();
const port = 3000;

dotenv.config();
mongoose
  .connect(process.env.URI)
  .then(() => {
    const routes = require("./routes/");
    app.use(express.json());
    app.get("/public", (req, res) => {
      res.send("Hello World!");
    });
    app.use(routes);

    app.listen(port, () => {
      // eslint-disable-next-line no-console
      console.log(`Example app listening on port ${port}`);
    });
  })
  .catch((error) => {
    throw Error(`Connection error ${error}`);
  });
