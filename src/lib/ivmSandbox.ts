import ivm from "isolated-vm";
import { type ValidatedDataObjects } from "../types/custom";
import { ObjectId } from "bson";
import Operators from "./operators/operators";
import MongoDbOperators from "./operators/adapters/mongodb";
class IvmSandbox {
  constructor(
    options = {
      memoryLimit: 8,
      timeout: 1000,
      unsafeEquals: false,
    },
  ) {
    this.options = options;
    this.instanciated = false;
    this.isolate = null;
  }

  private readonly options: {
    memoryLimit: number;
    timeout: number;
    unsafeEquals: boolean;
  };

  private instanciated: boolean;
  private isolate: ivm.Isolate | null;

  /**
   *  Setup the Isolate with the validated objects and relevant classes
   *
   * @param options:
   */
  public async createIvm(): Promise<{ isolate: ivm.Isolate }> {
    if (!this.instanciated) {
      this.isolate = new ivm.Isolate({
        memoryLimit: this.options.memoryLimit,
      });

      this.instanciated = true;
      return { isolate: this.isolate };
    } else {
      if (this.isolate === null) {
        this.isolate = new ivm.Isolate({
          memoryLimit: this.options.memoryLimit,
        });
        this.instanciated = true;
      }
      return { isolate: this.isolate };
    }
  }

  public destroy(): void {
    if (this.isolate !== null && this.instanciated) {
      this.instanciated = false;

      this.isolate.dispose();
      this.isolate = null;
    }
  }

  public release(context: ivm.Context): void {
    context.release();
  }

  /**
   *  Setup the Isolate with the validated objects and relevant classes
   *
   */
  public async createContext(
    variables: Record<string, unknown> = {},
  ): Promise<ivm.Context> {
    if (this.isolate !== null && this.instanciated) {
      const context = await this.isolate.createContext();
      const jail = context.global;
      const serializedVariables = Object.entries(variables).reduce(
        (acc, [key, value]) => {
          if (value instanceof ObjectId) {
            acc[key] = value.toString();
          } else if (Array.isArray(value) && value.every((v) => v instanceof ObjectId)) {
            acc[key] = value.map((v) => v.toString());
          } else {
            acc[key] = value;
          }
          return acc;
        },
        {} as Record<string, unknown>,
      );

      await jail.set("variables", new ivm.ExternalCopy(serializedVariables).copyInto());

      await jail.set("log", function (...args: any) {
        // eslint-disable-next-line
        console.log(...args);
      });

      /* set classes */
      const adapterClass = new MongoDbOperators();
      const operatorsClass = new Operators();

      await jail.set(
        "__operatorsClass__",
        new ivm.Reference(function (fn: any, a: any, b: any) {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-expect-error
          const result = operatorsClass[fn](a, b);
          return new ivm.ExternalCopy(result).copyInto();
        }).deref(),
      );
      // const _this = this;
      await jail.set(
        "__adapterClass__",
        new ivm.Reference((fn: string, c: string, a: string, b: any) => {
          if (
            !this.options.unsafeEquals &&
            ["Equals", "NotEquals"].includes(fn) &&
            c === "undefined" &&
            typeof b === "object" &&
            b !== null &&
            !Array.isArray(b)
          ) {
            b = String(b);
          }
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-expect-error
          const result = adapterClass[fn](a, b);

          return new ivm.ExternalCopy(result).copyInto();
        }).deref(),
      );

      await jail.set("Operators", operatorsClass, {
        reference: true,
      });
      await jail.set("MongoDbOperators", adapterClass, {
        reference: true,
      });
      await jail.set("global", jail.derefInto());

      const sc = await this.isolate.compileScript(`
        const groupedContext = {
          variables
        };

        function accessProperty(path, context) {
          // Handle variable access (now wrapped in {{$variableName}})
          if (path.startsWith('$')) {
            const variableName = path.slice(1);
            // Clean special characters from variable values
            if (['&', '/', '*'].includes(variableName)) {
              return "";
            }
            return context.variables[variableName];
          }
          // Any non-variable path should return empty string
          return "";
        }

        function formatValue(value, context) {
          
          let parsedValue = value;
      
          // Helper to process a single value
          function processValue(val) {
            if (typeof val === "string") {
              if (val.startsWith("{{") && val.endsWith("}}")) {
                const innerValue = val.slice(2, -2);
                if (innerValue.startsWith('$')) {
                  return accessProperty(innerValue, context);
                }
                return "";
              }
              if (['&', '/', '*'].includes(val)) {
                return "";
              }
              return val;
            }
            return val;
          }

          // Flatten and process arrays
          function flattenAndProcess(val) {
            if (Array.isArray(val)) {
              return val.reduce((acc, curr) => {
                if (Array.isArray(curr)) {
                  return [...acc, ...flattenAndProcess(curr)];
                }
                const processed = processValue(curr);
                return Array.isArray(processed) 
                  ? [...acc, ...processed] 
                  : [...acc, processed];
              }, []);
            }
            return processValue(val);
          }

          return flattenAndProcess(parsedValue);
        }
      `);

      await sc.run(context);
      return context;
    } else {
      throw new Error(
        "Isolate not Instanciated, call createIvm first or set autoLaunchIvm to true",
      );
    }
  }

  public get(): {
    isolate: ivm.Isolate | null;
  } {
    return {
      isolate: this.isolate,
    };
  }
}
export default IvmSandbox;
