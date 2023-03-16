const vm = require("vm");
/**
 * The Schema Class
 */
module.exports = class Schema {
  /**
   *
   * @param  {...any} args - args[0] Contains the schemas to be used by Dimrill.
   */
  constructor(
    options = {
      debug: false,
      output: console.log,
      strictMode: false,
      schema: {},
    }
  ) {
    this.debug = typeof options.debug === "boolean" ? options.debug : false;
    this.output =
      options.debug === true && typeof options.output === "function"
        ? options.output
        : console.log;
    this.strictMode =
      typeof options.strictMode === "boolean" ? options.strictMode : false;
    this.schema = options.schema;
    if (typeof this.schema !== "object") {
      throw new Error("Dimrill Schema must contain an Object");
    }

    this.compile(this.schema); //make compilation mandatory
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
   * @param {array} drna - String describing a drna path, can contains vafriables ${variable:property.subproperty}.
   * @param {object} variables - An object containing the variables (req,user,context), from which variables in expression will be matched.
   * @param {array} schemaElements - An array containing params and localPaths from the schema.
   * @returns {string} - The final drna string.
   */
  matchExpressionVariable(drna, variables, schemaElements) {
    if (!Array.isArray(drna) || drna.length < 2) {
      return false;
    }
    const type = String(drna[0]),
      expression = String(drna[1]);
    if (type !== "Action" && type !== "Ressource") {
      return false;
    }

    /* re-order variables so that they match the order of the schema */
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

  createRessourcesMap() {
    function iterate(object, paths = []) {
      for (const property in object) {
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
            iterate(object[property], Object.keys(object[property]));
          }
        } else {
          if (property == "Ressource") {
          }
        }
      }
      return paths;
    }
    return iterate(this.schema);
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
    let injectedParams = String(drna[1])
      .replace(/\./g, "-")
      .replace(/\s/g, "-")
      .split("&");
    const localPath = injectedParams[0]
      .replace(/\./g, "-")
      .replace(/\s/g, "-")
      .split(":");
    injectedParams.shift();
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

    let formattedReq = req;
    if (Object.keys(formattedReq).length >= 1) {
      /*
      Extract .body or .query out of it, else leave the plain body
    */
      if (req.body && typeof req.body === "object") {
        formattedReq = { ...formattedReq, ...req.body };
      }
      if (req.params && typeof req.params === "object") {
        formattedReq = { ...formattedReq, ...req.params };
      }
      if (req.query && typeof req.query === "object") {
        formattedReq = { ...formattedReq, ...req.query };
      }
    }
    const paramsMatched =
      parameters && Array.isArray(parameters) && parameters.length >= 1
        ? [
            ...this.paramsMatcher(
              type,
              parameters,
              injectedParams,
              formattedReq
            ),
          ]
        : [];
    if (
      parameters &&
      typeof parameters === "object" &&
      parameters.hasOwnProperty(type)
    ) {
      // eslint-disable-next-line security/detect-object-injection
      if (parameters[type] !== true) {
        return false;
      }
    } else if (!Array.isArray(parameters) && parameters !== true) {
      return false;
    }

    return {
      drna: [type, this.buildDrnaPathFromParams(localPath, paramsMatched)],
      schema: {
        localPath,
        paramsMatched,
      },
    };
  }
  buildDrnaPathFromParams(path, params) {
    path = Array.isArray(path) ? path.join(":") : path;
    params = Array.isArray(params) ? params.sort().join("&") : params;

    return String(path) + (params ? "&" + String(params) : "");
  }
  /**
   * Extracts parameters from the schema and query and matches them.
   * @param {String} type - The naure of what the user is trying to access, can be either Action or Ressource
   * @param {object} params - The Paramters described in the Schema for the path of drna.
   * @param {object} req - The req object passed from the server.
   * @returns {string} - The matched parameters if any ParamKey/ParamValue.
   */
  *paramsMatcher(type, params, injectedParams, req) {
    let reqValues = req;
    /*
      If the whole req object is passed extract .body or .query out of it, else leave the plain body
    */
    injectedParams = Object.fromEntries(
      injectedParams.map((param) => param.split("/"))
    );
    for (const parameter of params) {
      if (
        parameter.hasOwnProperty(type) &&
        // eslint-disable-next-line security/detect-object-injection
        parameter[type] === true &&
        parameter.hasOwnProperty("name") &&
        typeof parameter.name === "string"
      ) {
        if (injectedParams[parameter.name]) {
          yield `${String(parameter.name)}/${String(
            injectedParams[parameter.name]
          )
            .replace(/\s/g, "-")
            .replace(/(\.\*)/g, "")}`;
        } else {
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
    if (!Array.isArray(drna.drna) || drna.drna.length < 2) {
      return false;
    }
    if (drna.drna[0] != "Action" && drna.drna[0] != "Ressource") {
      return false;
    }
    req = { req };
    user = { user };
    context = { context };

    const results = Policies.map((policy) => {
      if (!policy.Statement || !Array.isArray(policy.Statement)) {
        return false;
      }
      const matchedPolicy = policy.Statement.reduce((results, statement) => {
        if (statement[drna.drna[0]]) {
          const matchedStatement = statement[drna.drna[0]].find((elem) => {
            /*
            Escape all regex characters except * wildcards
            */

            const regexStr = this.extractPolicyParams(
              this.matchExpressionVariable(
                [drna.drna[0], elem],
                {
                  req,
                  user,
                  context,
                },
                drna.schema
              ).replaceAll(/[.+?^${}()|[\]\\]/g, "\\$&")
            ).replaceAll("/", "\\/");

            /*
              Wrap regex match in a VM to prevent ReDOS
            */
            const sandbox = {
              result: null,
              target: drna.drna[1],
              str: regexStr,
            };

            const vmContext = vm.createContext(sandbox);
            const script = new vm.Script(
              `result = String(target).match(
                new RegExp("^" + String(str).replaceAll("*", ".*") + "$")
              );`
            );

            try {
              script.runInContext(vmContext, { timeout: 10 }); // milliseconds
            } catch (e) {
              if (this.debug === true) {
                this.output(`Error while matching ${e}`);
              }
              /*
                Possible Attack has been detected, need to notify to take remedial actions
            */
            }
            if (sandbox.result) {
              if (this.debug === true) {
                this.output(
                  `In:matchPolicy; Matched against ${drna.drna[1]}  ${String(
                    sandbox.str
                  ).replace("*", ".*")}`
                );
              }
              return drna.drna;
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
  extractPolicyParams(str) {
    const params = String(str).split("&");
    params.shift();

    return this.buildDrnaPathFromParams(str.split("&")[0], params);
  }
  /**
   * Synthetizes a drna string not taking parameters into account from the parameters supplied to the Dimrill.authorize function.
   * @param {array} drna - The array from which to synthetize the drna string ["Action/Ressource","string:to:match"].
   * @param {object} req - The req object passed from the server.
   * @returns {string} - The synthetozed drna string.
   */
  synthetizeForRessourcesAccess(drna) {
    /* 
    Check if drna is an array, and has both required parameters (Action/Ressource, drnaString)
*/
    if (typeof drna !== "string") {
      return false;
    }
    const type = "Ressource";

    if (type !== "Action" && type !== "Ressource") {
      return false;
    }
    let injectedParams = String(drna)
      .replace(/\./g, "-")
      .replace(/\s/g, "-")
      .split("&");
    const localPath = injectedParams[0]
      .replace(/\./g, "-")
      .replace(/\s/g, "-")
      .split(":");
    injectedParams.shift();

    return this.buildDrnaPathFromParams(localPath, injectedParams);
  }
  /**
   * Attempts to match a the paramsLess synthetized drna to the supplied policies ressources. @see {synthetizeForRessourcesAccess}
   * This function aims to return the drna of the ressources the user is allowed to access, without their parameters
   * @param {string} drna - The drna string to be matched.
   * @param {array} Policies - An array of policies (attached to a user).
   * @param {object} req - The req object passed from the server.
   * @param {object} user - The data associated to the user attempting to authorize.
   * @param {object} context - An object containing additional informations to be used during the authorization process.
   * @returns {array} - Returns an array of all matched policies.
   */
  matchForRessourceAccess(drna, Policies) {
    if (typeof drna !== "string") {
      return false;
    }

    const results = Policies.map((policy) => {
      const matchedPolicy = policy.Statement.reduce((results, statement) => {
        if (statement.Ressource) {
          const matchedStatement = statement.Ressource.find((elem) => {
            /*
            Escape all regex characters except * wildcards
            Remove empty parameters (:param/*)
            */
            const regexStr = this.extractPolicyParams(
              elem.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/:\w+\/\*/, "")
            ).replaceAll("/", "\\/");
            /*
              Wrap regex match in a VM to prevent ReDOS
            */

            const sandbox = {
              result: null,
              target: drna,
              str: regexStr,
            };

            const vmContext = vm.createContext(sandbox);
            const script = new vm.Script(
              `result = String(target).match(
                new RegExp("^" + String(str).replace("*", ".*") )
              );`
            );

            try {
              script.runInContext(vmContext, { timeout: 10 }); // milliseconds
            } catch (e) {
              if (this.debug === true) {
                this.output(`Error while matching ${e}`);
              }
              /*
                Possible Attack has been detected, need to notify to take remedial actions
            */
            }
            if (sandbox.result) {
              if (this.debug === true) {
                this.output(
                  `In:matchForRessourceAccess; Matched against ${drna}  ${String(
                    sandbox.str
                  ).replace("*", ".*")}`
                );
                this.output(`Matched statement:`, statement);
              }
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
};
