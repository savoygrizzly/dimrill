const vm = require("vm");
/**
 * The Schema Class
 */
module.exports = class Schema {
  /**
   *
   * @param  {...any} args - args[0] Contains the schemas to be used by Dimrill.
   */
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

  /**
   * @param {object} schema - An object describing the authorization schema.
   */
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
            object[property].length >= 1
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

  /**
   * This function matches the variables in the drna string described in the policies. @see {matchPolicy}
   * @param {string} expression - String describing a drna path, can contains vafriables ${variable:property.subproperty}.
   * @param {object} variables - An object containing the variables (req,user,context), from which variables in expression will be matched.
   * @returns {string} - The final drna string.
   */
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
              .replace(/(\.\*)/g, "")
          : "";
        expression = expression.replace(match[0], value);
      }
      return expression;
    } else {
      //value is a fixed string
      return expression;
    }
  }

  /**
   * Attempts to match a the synthetized drna to the supplied policies. @see {synthetize}
   * @param {string} drna - The drna string to be matched.
   * @param {array} Policies - An array of policies (attached to a user).
   * @param {object} req - The req object passed from the server.
   * @param {object} user - The data associated to the user attempting to authorize.
   * @param {object} context - An object containing additional informations to be used during the authorization process.
   * @returns {array} - Returns an array of all matched policies.
   */
  matchPolicy(drna, Policies, req, user, context) {
    if (!Array.isArray(drna) && drna.length < 2) {
      return false;
    }
    if (drna[0] != "Action" && drna[0] != "Ressource") {
      return false;
    }
    req = { req };
    user = { user };
    context = { context };

    const results = Policies.map((policy) => {
      const matchedPolicy = policy.Statement.reduce((results, statement) => {
        if (statement[drna[0]]) {
          const matchedStatement = statement[drna[0]].find((elem) => {
            /*
            Escape all regex characters except * wildcards
            */
            const regexStr = this.matchExpressionVariable(elem, {
              req,
              user,
              context,
            }).replace(/[.+?^${}()|[\]\\]/g, "\\$&");
            /*
              Wrap regex match in a VM to prevent ReDOS
            */
            const sandbox = {
              result: null,
              target: drna[1],
              str: regexStr,
            };
            const vmContext = vm.createContext(sandbox);
            const script = new vm.Script(
              `result = String(target).match(
                new RegExp("^" + String(str).replace("*", ".*") + "$")
              );`
            );

            try {
              script.runInContext(vmContext, { timeout: 10 }); // milliseconds
            } catch (e) {
              /*
                Possible Attack has been detected, need to notify to take remedial actions
            */
            }
            if (sandbox.result) {
              return drna;
            }
          });
          if (matchedStatement) {
            results.push(statement);
          }
        }
        return results;
      }, []);
      return matchedPolicy ?? false;
    });
    return results.flat();
  }

  /**
   * Synthetizes a drna string from the parameters supplied to the Dimrill.authorize function.
   * @param {array} drna - The array from which to synthetize the drna string ["Action/Ressource","string:to:match"].
   * @param {object} req - The req object passed from the server.
   * @returns {string} - The synthetozed drna string.
   */
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

  /**
   * Extracts parameters from the schema and query and matches them.
   * @param {String} type - The naure of what the user is trying to access, can be either Action or Ressource
   * @param {object} params - The Paramters described in the Schema for the path of drna.
   * @param {object} req - The req object passed from the server.
   * @returns {string} - The matched parameters if any ParamKey/ParamValue.
   */
  *paramsMatcher(type, params, req) {
    let reqValues = req;
    /*
      If the whole req object is passed extract .body or .query out of it, else leave the plain body
    */
    if (req.body && typeof req.body === "object") {
      reqValues = { ...req, ...req.body };
    }
    if (req.params && typeof req.params === "object") {
      reqValues = { ...req, ...req.params };
    }
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
            .replace(/(\.\*)/g, "")}`;
        }
      }
    }
  }
};
