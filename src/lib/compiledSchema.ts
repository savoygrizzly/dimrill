import { type RootSchema } from "../types/custom";

class CompiledSchemaObject {
  fileName: string;
  schema: Record<string, any>;

  constructor(fileName: string = "") {
    this.fileName = fileName;
    this.schema = {};
  }

  assign(value: CompiledSchemaObject | Record<string, any>): void {
    if (value instanceof CompiledSchemaObject) {
      // Dynamically extend the schema with a fromFile method for the value being merged
      const extendedSchema = this.extendWithFromFileMethod(
        value.schema,
        value.fileName
      );
      this.schema = { ...this.schema, ...extendedSchema };
    } else {
      // Directly merge plain objects
      this.schema = { ...this.schema, ...value };
    }
  }

  // Dynamically adds a fromFile method to the merged object
  private extendWithFromFileMethod(
    obj: Record<string, any>,
    fileName: string
  ): Record<string, any> {
    return Object.keys(obj).reduce<Record<string, any>>((acc, key) => {
      const value = obj[key];
      // If the value is an object, extend it; otherwise, just copy it
      if (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value)
      ) {
        acc[key] = { ...value, fromFile: () => fileName };
      } else {
        acc[key] = value;
      }
      return acc;
    }, {});
  }

  public fromFile(): string {
    return this.fileName;
  }
}
export default CompiledSchemaObject;
