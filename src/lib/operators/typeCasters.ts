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

  public ToArray(value: any): any[] {
    return Array.isArray(value) ? value : [value];
  }

  public ToDate(value: string): Date {
    return new Date(String(value));
  }

  public ToObjectId(value: string): ObjectId | ObjectId[] {
    if (Array.isArray(value)) {
      return this.ToObjectIdArray(value);
    }
    return new ObjectId(String(value));
  }

  public ToObjectIdArray(value: string[]): ObjectId[] {
    return value.map((id) => new ObjectId(String(id))).filter((id) => id);
  }
}
