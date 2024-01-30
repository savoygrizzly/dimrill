const SchemaClass = require("./lib/schema");
const schema = new SchemaClass();

const fs = require("fs");

const path = require("path");

const schemaPath = path.join(__dirname, "../tests/schemas/dimrill.dmrl");
const schemaString: string = fs.readFileSync(schemaPath, "utf-8");
const schemaObject: object = JSON.parse(schemaString);

schema.validateSchema(schemaObject);
