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
    this.isolate = null;
  }

  private readonly options: {
    memoryLimit: number;
    timeout: number;
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
      return { isolate: this.isolate! };
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
    validatedObjects: validatedDataObjects
  ): Promise<ivm.Context> {
    if (this.isolate !== null && this.instanciated) {
      const context = await this.isolate.createContext();

      const jail = context.global;
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
      await sc.run(context);
      return context;
    } else {
      throw new Error(
        "Isolate not Instanciated, call createIvm first or set autoLaunchIvm to true"
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
