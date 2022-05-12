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
          if (property == "Action" || property == "Ressource") {
            throw new Error(
              `For property "${property}"; "${property}" is a reserved name. Dimrill Schema values must be guidelines compliant.`
            );
          } else {
            // eslint-disable-next-line security/detect-object-injection
            iterate(object[property]);
          }
        } else {
          // eslint-disable-next-line security/detect-object-injection
          if (
            // eslint-disable-next-line security/detect-object-injection
            Array.isArray(object[property]) &&
            // eslint-disable-next-line security/detect-object-injection
            object[property].length > 1
          ) {
            // eslint-disable-next-line security/detect-object-injection
            object[property].forEach((n, index) => {
              if (typeof n === "object" && Object.keys(n).length >= 2) {
                if (
                  (n.hasOwnProperty("Action") &&
                    typeof n.Action === "boolean") ||
                  (n.hasOwnProperty("Ressource") &&
                    typeof n.Ressource === "boolean")
                ) {
                  if (n.name && typeof n.name === "string") {
                    if (
                      n.name.match(/[ `!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~]/)
                    ) {
                      throw new Error(
                        `For property "${property}" at index:${index} parameter "name"; Dimrill Schema values must be guidelines compliant.`
                      );
                    }
                  } else {
                    throw new Error(
                      `For property "${property}" at index:${index} parameter "name"; Dimrill Schema parameters must have a name of String type.`
                    );
                  }
                } else {
                  throw new Error(
                    `For property "${property}" at index:${index}; Dimrill Schema parameters must have either an "Action" or "Ressource" key.`
                  );
                }
              } else {
                if (n.match(/[ `!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~]/)) {
                  throw new Error(
                    `For property "${property}" value "${n}"; Dimrill Schema values must be guidelines compliant.`
                  );
                }
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
        value = value
          ? String(value)
              .replace(/\s/g, "-")
              .replace(/[^\w\-\_]*/g, "")
          : "";
        expression = expression.replace(match[0], value);
      }
      return expression;
    } else {
      //value is a fixed string
      return expression;
    }
  }
  matchPolicy(drna, Policies, req, user, context) {
    console.log(drna);
    if (!drna) {
      return false;
    }
    /*
        Cast drna param to string to prevent injections
    */
    req = { req };
    user = { user };
    context = { context };

    const results = Policies.map((policy) => {
      const matchedPolicy = policy.Statement.reduce((results, statement) => {
        const matchedStatement = statement[drna[0]].find((elem) => {
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
  synthetize(drna, req) {
    /* 
        Check if drna is an array, and has both required parameters (Action/Ressource, drnaString)
    */
    if (!Array.isArray(drna) || drna.length < 2) {
      return false;
    }
    const type = String(drna[0]);
    if (type !== "Action" && type !== "Ressource") {
      return false;
    }
    let localPath = drna[1].replace(/\./g, "-").replace(/\s/g, "-").split(":");
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
        ? [...this.paramsMatcher(type, parameters, req)]
        : [];
    /*
           If Parameters is an empty array or undefined or false in strict mode the path must be rejected as it doesnt match schema

    */
    if (typeof parameters === "object" && parameters.hasOwnProperty(type)) {
      // eslint-disable-next-line security/detect-object-injection
      if (parameters[type] !== true) return false;
    } else if (!Array.isArray(parameters) && parameters !== true) {
      return false;
    }
    return [type, [...localPath, ...paramsMatched].join(":")];
  }

  *paramsMatcher(type, params, req) {
    let reqValues = req;
    /*if (req.body) {
      reqValues = { ...req, ...req.body };
    }
    if (req.query) {
      reqValues = { ...req, ...req.query };
    }*/
    for (const parameter of params) {
      if (
        parameter.hasOwnProperty(type) &&
        // eslint-disable-next-line security/detect-object-injection
        parameter[type] === true &&
        parameter.hasOwnProperty("name") &&
        typeof parameter.name === "string"
      ) {
        // eslint-disable-next-line security/detect-object-injection
        if (reqValues[parameter.name]) {
          // eslint-disable-next-line security/detect-object-injection
          yield `${String(parameter.name)}/${String(reqValues[parameter.name])
            .replace(/\s/g, "-")
            .replace(/[^\w\-\_]*/g, "")}`;
        }
      }
    }
  }
};
