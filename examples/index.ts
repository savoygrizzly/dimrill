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
import ivm from "isolated-vm";
import Operators from "./operators";
const gateKeeper = new GateKeeper();
async function run() {
  await gateKeeper.autoload(path.join(__dirname, "schemas"));
  console.log("done");

  gateKeeper.authorize(
    ["Ressource", "files:createOrder"],
    [
      {
        Version: "1.0",
        Statement: [
          {
            Effect: "Allow",
            Action: ["files:createOrder&pricelist/{{req:body:pricelist}}"],
            Ressource: ["files:createOrder"],
          },
        ],
      },
    ],
    {
      req: {
        body: {
          test: ["5e56e254f4d3f1a832358c5c", "5e56e254f4d3f1a832358c5d"],
        },
      },
      user: {
        id: "5e56e254f4d3f1a832358c5c",
      },
    },
    {
      validateData: false,
      pathOnly: true,
    }
  );
}
run();

async function testVm() {
  const isolate = new ivm.Isolate({ memoryLimit: 8 });
  const isolateContext = await isolate.createContext();
  const jail = isolateContext.global;
  await jail.set("global", jail.derefInto());
  /*
    Pass the validated objects to the Isolate
*/

  await jail.set("log", function (...args: any) {
    console.log(...args);
  });
  const operatorsClass = new Operators();
  const code = ``;
  /* const module = await isolate.compileModule(code);
  await module.instantiate(isolateContext, async (specifier, referrer) => {
    if (specifier === "./operators") {
      return await isolate.compileModule(`export default class Operators {
        constructor() {
            this.StringStrictlyEquals = (leftOperator, rightOperator) => {
                return String(leftOperator) === String(rightOperator);
            };
            this.StringEquals = (leftOperator, rightOperator) => {
                return String(leftOperator) === String(rightOperator);
            };
            this.StringStrictlyNotEquals = (leftOperator, rightOperator) => {
                return String(leftOperator) !== String(rightOperator);
            };
            this.StringNotEquals = (leftOperator, rightOperator) => {
                return String(leftOperator) !== String(rightOperator);
            };
            this.NumericEquals = (leftOperator, rightOperator) => {
                return Number(leftOperator) === Number(rightOperator);
            };
            this.NumericNotEquals = (leftOperator, rightOperator) => {
                return Number(leftOperator) !== Number(rightOperator);
            };
            this.NumericLessThan = (leftOperator, rightOperator) => {
                return Number(leftOperator) < Number(rightOperator);
            };
            this.NumericLessThanEquals = (leftOperator, rightOperator) => {
                return Number(leftOperator) <= Number(rightOperator);
            };
            this.NumericGreaterThan = (leftOperator, rightOperator) => {
                return Number(leftOperator) > Number(rightOperator);
            };
            this.NumericGreaterThanEquals = (leftOperator, rightOperator) => {
                return Number(leftOperator) >= Number(rightOperator);
            };
            this.DateEquals = (leftOperator, rightOperator) => {
                if (!(leftOperator instanceof Date)) {
                    leftOperator = new Date(leftOperator);
                }
                if (!(rightOperator instanceof Date)) {
                    rightOperator = new Date(rightOperator);
                }
                return rightOperator !== null && leftOperator !== null
                    ? leftOperator.getTime() === rightOperator.getTime()
                    : false;
            };
            this.DateNotEquals = (leftOperator, rightOperator) => {
                if (!(leftOperator instanceof Date)) {
                    leftOperator = new Date(leftOperator);
                }
                if (!(rightOperator instanceof Date)) {
                    rightOperator = new Date(rightOperator);
                }
                return rightOperator !== null && leftOperator !== null
                    ? leftOperator.getTime() !== rightOperator.getTime()
                    : false;
            };
            this.DateLessThan = (leftOperator, rightOperator) => {
                if (!(leftOperator instanceof Date)) {
                    leftOperator = new Date(leftOperator);
                }
                if (!(rightOperator instanceof Date)) {
                    rightOperator = new Date(rightOperator);
                }
                return rightOperator !== null && leftOperator !== null
                    ? leftOperator.getTime() < rightOperator.getTime()
                    : false;
            };
            this.DateLessThanEquals = (leftOperator, rightOperator) => {
                if (!(leftOperator instanceof Date)) {
                    leftOperator = new Date(leftOperator);
                }
                if (!(rightOperator instanceof Date)) {
                    rightOperator = new Date(rightOperator);
                }
                return rightOperator !== null && leftOperator !== null
                    ? leftOperator.getTime() <= rightOperator.getTime()
                    : false;
            };
            this.DateGreaterThan = (leftOperator, rightOperator) => {
                if (!(leftOperator instanceof Date)) {
                    leftOperator = new Date(leftOperator);
                }
                if (!(rightOperator instanceof Date)) {
                    rightOperator = new Date(rightOperator);
                }
                return rightOperator !== null && leftOperator !== null
                    ? leftOperator.getTime() > rightOperator.getTime()
                    : false;
            };
            this.DateGreaterThanEquals = (leftOperator, rightOperator) => {
                if (!(leftOperator instanceof Date)) {
                    leftOperator = new Date(leftOperator);
                }
                if (!(rightOperator instanceof Date)) {
                    rightOperator = new Date(rightOperator);
                }
                return rightOperator !== null && leftOperator !== null
                    ? leftOperator.getTime() >= rightOperator.getTime()
                    : false;
            };
            this.Bool = (leftOperator, rightOperator) => {
                return Boolean(leftOperator) === Boolean(rightOperator);
            };
            this.InArray = (leftOperator, rightOperator) => {
                return (Array.isArray(leftOperator) ? leftOperator : Array(leftOperator)).includes(rightOperator);
            };
        }
      }`);
    }
    throw new Error(`Module not found: ${specifier}`);
  });
  let result;
  await jail.set(
    "cb",
    new ivm.Callback((value: any) => {
      result = value;
    })
  );
  await module.evaluate();
  */
  await jail.set(
    "__operatorsClass__",
    new ivm.Reference(function (fn: any, a: any, b: any) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      const result = operatorsClass[fn](a, b);
      return new ivm.ExternalCopy(result).copyInto();
    }).deref()
  );
  await jail.set("Operators", operatorsClass, {
    reference: true,
  });

  const script = await isolateContext.eval(`
  ( __operatorsClass__.apply(undefined, ["StringNotEquals", "test","noTest"], {
    arguments: { copy: true },
    result: { promise: true },
  }))
  `);
  console.log(script);
  // await script.run(isolateContext, { reference: true, promise: true });
}
// testVm();
