/* const SchemaClass = require("./lib/schema");
const schema = new SchemaClass();

const fs = require("fs");

const path = require("path");

const schemaPath = path.join(__dirname, "../tests/schemas/dimrill.dmrl");
const schemaString: string = fs.readFileSync(schemaPath, "utf-8");
const schemaObject: object = JSON.parse(schemaString);

schema.validateSchema(schemaObject); */

import GateKeeper from "../src/lib/gateKeeper";
import path from "path";
const gateKeeper = new GateKeeper();

async function run() {
  await gateKeeper.autoload(path.join(__dirname, "schemas"));
  console.log("done");
  gateKeeper.authorize(
    ["Action", "files:createOrder&pricelist/distributor"],
    [
      {
        Version: "1.0",
        Statement: [
          {
            Effect: "Allow",
            Action: ["files:createOrder&*"],
            Resource: ["files:createOrder&pricelist/distributor"],
          },
        ],
      },
    ],
    {},
    {
      validateData: false,
    }
  );
}
run();
