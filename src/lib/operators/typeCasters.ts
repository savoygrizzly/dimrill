import { ObjectId } from "bson";
export default class TypeCasters {
  public ToNumber(value: any): number {
    return Number(value);
  }

  public ToString(value: any): string {
    return String(value);
  }

  public ToBoolean(value: any): boolean {
    return Boolean(value);
  }

  public ToArray(value: any | any[]): any[] {
    /*
      check if array values are dangerous objects, remove injection sink
    */
    if (
      !Array.isArray(value) &&
      typeof value === "object" &&
      !(value instanceof ObjectId)
    ) {
      return [String(value)];
    }
    value = Array.isArray(value) ? value : [value];
    const safeValues = value
      .map((val: any) => {
        if (typeof val === "object" && val !== null) {
          return String(val);
        }

        return val;
      })
      .filter(
        (filtered: boolean | string | number) =>
          filtered !== null && filtered !== undefined
      );

    return safeValues;
  }

  public ToDate(value: string): Date {
    return new Date(String(value));
  }

  public ToObjectId(value: string): ObjectId | ObjectId[] | undefined {
    if (Array.isArray(value)) {
      return this.ToObjectIdArray(value);
    }
    try {
      return new ObjectId(String(value));
    } catch (e) {
      return undefined;
    }
  }

  public ToObjectIdArray(value: string[]): ObjectId[] {
    value = Array.isArray(value) ? value : [value];
    return value
      .map((id) => this.ToObjectId(id))
      .filter((id) => id) as ObjectId[];
  }
}
