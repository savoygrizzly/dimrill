const { group } = require("console");
const vm = require("vm");

module.exports = class Schema {
  constructor(...args) {
    this.debug = false;
    this.strictMode = false;
    this.schema = args[0];

    if (typeof args[0] !== "object") {
      throw new Error("Dimrill Schema must contain an Object");
    }
    if (typeof args[1] === "object" && !Array.isArray(args[1])) {
      if (args[1].mode == "strict" && !args[1].hasOwnProperty("strict")) {
        this.strictMode = true;
      }
      if (!args[1].hasOwnProperty("mode") && args[1].strict) {
        this.strictMode = true;
      }
      if (args[1].debug == true || args[1].debug == "debug") {
        this.debug = true;
      }
    }
    if (args[1] == "DEBUG" || args[2] == "DEBUG") {
      this.debug = true;
    }
    if (this.debug) {
      this.compile(args[0]);
    }
  }
  compile(schema) {
    function iterate(object) {
      for (const property in object) {
        if (property.match(/[ `!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~]/)) {
          throw new Error(
            `For key: ${property}; Dimrill Schema properties must be guidelines compliant`
          );
        }
        if (
          // eslint-disable-next-line security/detect-object-injection
          typeof object[property] === "object" &&
          // eslint-disable-next-line security/detect-object-injection
          !Array.isArray(object[property]) &&
          // eslint-disable-next-line security/detect-object-injection
          object[property] !== null
        ) {
          // eslint-disable-next-line security/detect-object-injection
          iterate(object[property]);
        } else {
          // eslint-disable-next-line security/detect-object-injection
          if (
            // eslint-disable-next-line security/detect-object-injection
            Array.isArray(object[property]) &&
            // eslint-disable-next-line security/detect-object-injection
            object[property].length > 1
          ) {
            // eslint-disable-next-line security/detect-object-injection
            object[property].forEach((n) => {
              if (n.match(/[ `!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~]/)) {
                throw new Error(
                  `For property "${property}" value "${n}"; Dimrill Schema values must be guidelines compliant`
                );
              }
            });
          }
          // eslint-disable-next-line security/detect-object-injection
          else if (typeof object[property] !== "boolean") {
            /*
                If property is a boolean it either validate or invalidate a path
            */
            throw new Error(
              // eslint-disable-next-line security/detect-object-injection
              `For property "${property}" value "${object[property]}" must be either of type Array or Boolean; Dimrill Schema must be guidelines compliant`
            );
          } else {
          }
        }
      }
    }
    iterate(schema);
  }
  *compileExpression(expr) {}
  matchExpressionVariable(expression, variables) {
    const matches = expression.matchAll(/\$\{(..*?)\}/g);
    if (matches) {
      for (const match of matches) {
        const variable =
          variables[match[1].split(":")[0]][match[1].split(":")[0]];
        let value = match[1]
          .split(":")[1]
          .split(".")
          .reduce((a, b) => {
            if (a && a.hasOwnProperty(b)) {
              // eslint-disable-next-line security/detect-object-injection
              return a[b];
            }
          }, variable);
        value = value ? String(value).replace(/[\W_]+/g, "") : "";
        expression = expression.replace(match[0], value);
      }

      return expression;
    } else {
      //value is a fixed string
      return expression;
    }
  }
  matchPolicy(drna, Policies, req, user, context) {
    if (!drna) {
      return false;
    }
    /*
        Cast drna param to string to prevent injections
    */
    req = { req };
    user = { user };
    context = { context };
    drna = String(drna);

    const results = Policies.map((policy) => {
      const matchedPolicy = policy.Statement.reduce((results, statement) => {
        const matchedStatement = statement.Action.find((elem) => {
          /*
              Wrap regex match in a VM to prevent ReDOS
            */
          const sandbox = {
              result: null,
              target: drna,
              str: this.matchExpressionVariable(elem, { req, user, context }),
            },
            vmContext = vm.createContext(sandbox);
          const script = new vm.Script(
            `result = String(target).match(
                new RegExp(String(str).replace("*", ".*"))
              );`
          );

          try {
            script.runInContext(vmContext, { timeout: 10 }); // milliseconds
          } catch (e) {
            /*
                Attack has been detected, need to notify to take remedial actions
              */
          }
          if (sandbox.result) {
            return drna;
          }
        });
        if (matchedStatement) {
          results.push(statement);
        }
        return results;
      }, []);
      return matchedPolicy ?? false;
    });
    return results.flat();
  }
  synthetize(...args) {
    /* 
        Match provided args (path, req) with the associated schema
      */
    let localPath = args[0].replace(/\./g, "-").replace(/\s/g, "-").split(":");
    const localSchema = this.schema,
      /*
          Iterate over the Schema to try and match a path to properties if they exist
        */
      parameters = localPath.reduce((a, b) => {
        if (a && a.hasOwnProperty(b)) {
          // eslint-disable-next-line security/detect-object-injection
          return a[b];
        }
      }, localSchema);
    const paramsMatched =
      Array.isArray(parameters) && parameters.length >= 1
        ? [...this.paramsMatcher(parameters, args[1])]
        : [];

    /*
           If Parameters is an empty array or undefined or false in strict mode the path must be rejected as it doesnt match schema

    */
    if (this.strictMode && !Array.isArray(parameters) && parameters !== true) {
      localPath = [];
    }

    return [...localPath, ...paramsMatched].join(":");
  }

  *paramsMatcher(params, req) {
    let reqValues = req;
    if (req.body) {
      reqValues = { ...req, ...req.body };
    }
    if (req.query) {
      reqValues = { ...req, ...req.query };
    }
    for (const paramName of params) {
      // eslint-disable-next-line security/detect-object-injection
      if (reqValues[paramName]) {
        // eslint-disable-next-line security/detect-object-injection
        yield `${String(paramName)}/${String(reqValues[paramName]).replace(
          /[\W_]+/,
          ""
        )}`;
      }
    }
  }
};
