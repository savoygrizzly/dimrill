import { ObjectId } from "bson";
export default class TypeCasters {
  public toNumber(value: any): number {
    return Number(value);
  }

  public toString(value: any): string {
    return String(value);
  }

  public toBoolean(value: any): boolean {
    return Boolean(value);
  }

  public toArray(value: any): any[] {
    return Array.isArray(value) ? value : [value];
  }

  public toDate(value: string): Date {
    return new Date(value);
  }

  public toObjectId(value: string): ObjectId {
    return new ObjectId(value);
  }

  public toObjectIdArray(value: string[]): ObjectId[] {
    return value.map((id) => new ObjectId(id)).filter((id) => id);
  }
}
