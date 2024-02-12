import ivm from "isolated-vm";
import { ObjectId } from "bson";
import { type validatedDataObjects } from "../types/custom";

import Operators from "./operators/operators";
import MongoDbOperators from "./operators/adapters/mongodb";
class IvmSandbox {
  constructor(
    options = {
      memoryLimit: 8,
      timeout: 1000,
    }
  ) {
    this.options = options;
    this.instanciated = false;
    this.contextSet = false;
    this.isolate = null;
    this.context = null;
  }

  private readonly options: {
    memoryLimit: number;
    timeout: number;
  };

  private contextSet: boolean;
  private instanciated: boolean;
  private isolate: ivm.Isolate | null;
  private context: ivm.Context | null;
  /**
   *  Setup the Isolate with the validated objects and relevant classes
   *
   * @param options:
   */
  public async create(
    options = {
      memoryLimit: this.options.memoryLimit,
      timeout: this.options.timeout,
    }
  ): Promise<{ isolate: ivm.Isolate; context: ivm.Context }> {
    if (!this.instanciated) {
      this.isolate = new ivm.Isolate(options);
      this.context = await this.isolate.createContext();
      this.instanciated = true;
      return { isolate: this.isolate, context: this.context };
    } else {
      return { isolate: this.isolate!, context: this.context! };
    }
  }

  public destroy(): void {
    if (this.isolate !== null) {
      this.isolate.dispose();
      this.isolate = null;
    }
    this.context = null;
  }

  /**
   *  Setup the Isolate with the validated objects and relevant classes
   *
   */
  public async setup(validatedObjects: validatedDataObjects): Promise<void> {
    if (
      this.instanciated &&
      !this.contextSet &&
      this.context !== null &&
      this.isolate !== null
    ) {
      this.contextSet = true;
      const jail = this.context.global;
      /*
        Pass the validated objects to the Isolate
    */
      await jail.set(
        "req",
        new ivm.ExternalCopy(validatedObjects.req).copyInto()
      );
      await jail.set(
        "user",
        new ivm.ExternalCopy(validatedObjects.user).copyInto()
      );
      await jail.set(
        "context",
        new ivm.ExternalCopy(validatedObjects.context).copyInto()
      );

      await jail.set("log", function (...args: any) {
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
        }).deref()
      );

      await jail.set(
        "__adapterClass__",
        new ivm.Reference(function (fn: any, a: string, b: any) {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-expect-error
          const result = adapterClass[fn](a, b);
          return new ivm.ExternalCopy(result).copyInto();
        }).deref()
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
            req,
            user,
            context
        };

        function accessProperty(path, context) {
          const parts = path.split(":");
          let current = context;
          for (const part of parts) {
            if (current && typeof current === "object" && part in current) {
              current = current[part];
            } else {
              return undefined;
              // Property not found or invalid; return undefined or handle as needed
            }
          }
          if (['&', '/', '*'].includes(current)) {
            current = "";
          }
          return current;
        }
    
        function formatValue(value, context) {
          let parsedValue;
          try {
            parsedValue = JSON.parse(value);
          } catch (e) {
            parsedValue = value;
          }
    
          if (typeof parsedValue !== "string") return parsedValue;
          else {
            if (parsedValue.startsWith("{{") && parsedValue.endsWith("}}")) {
              return accessProperty(parsedValue.slice(2, -2), context);
            }
            else {
              if (['&', '/'].includes(parsedValue)) {
                parsedValue = "";
              }
              return parsedValue;
            }
          }
        }

    `);
      await sc.run(this.context);
    }
  }

  public get(): {
    context: ivm.Context | null;
    isolate: ivm.Isolate | null;
  } {
    return {
      context: this.context,
      isolate: this.isolate,
    };
  }
}
export default IvmSandbox;
