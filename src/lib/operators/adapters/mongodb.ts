export default class MongoDbOperators {
  // Equals
  public Equals = (field: string, value: any): Record<string, object> => {
    return { [field]: { $eq: value } };
  };

  // NotEquals˚
  public NotEquals = (field: string, value: any): Record<string, object> => {
    return { [field]: { $ne: value } };
  };

  // StringEquals
  public StringEquals = (
    field: string,
    value: string,
  ): Record<string, string> => {
    return { [field]: String(value) };
  };

  // StringNotEquals
  public StringNotEquals = (
    field: string,
    value: string,
  ): Record<string, object> => {
    return { [field]: { $ne: String(value) } };
  };

  // NumberEquals
  public NumberEquals = (
    field: string,
    value: number,
  ): Record<string, object> => {
    return { [field]: { $eq: Number(value) } };
  };

  // NumberNotEquals
  public NumberNotEquals = (
    field: string,
    value: number,
  ): Record<string, object> => {
    return { [field]: { $ne: Number(value) } };
  };

  // NumberLessThan
  public NumberLessThan = (
    field: string,
    value: number,
  ): Record<string, object> => {
    return { [field]: { $lt: Number(value) } };
  };

  // NumberLessThanEquals
  public NumberLessThanEquals = (
    field: string,
    value: number,
  ): Record<string, object> => {
    return { [field]: { $lte: Number(value) } };
  };

  // NumberGreaterThan
  public NumberGreaterThan = (
    field: string,
    value: number,
  ): Record<string, object> => {
    return { [field]: { $gt: Number(value) } };
  };

  // NumberGreaterThanEquals
  public NumberGreaterThanEquals = (
    field: string,
    value: number,
  ): Record<string, object> => {
    return { [field]: { $gte: Number(value) } };
  };

  // DateEquals
  public DateEquals = (field: string, value: Date): Record<string, object> => {
    return { [field]: { $eq: new Date(value) } };
  };

  // DateNotEquals
  public DateNotEquals = (
    field: string,
    value: Date,
  ): Record<string, object> => {
    return { [field]: { $ne: new Date(value) } };
  };

  // DateLessThan
  public DateLessThan = (
    field: string,
    value: Date,
  ): Record<string, object> => {
    return { [field]: { $lt: new Date(value) } };
  };

  // DateLessThanEquals
  public DateLessThanEquals = (
    field: string,
    value: Date,
  ): Record<string, object> => {
    return { [field]: { $lte: new Date(value) } };
  };

  // DateGreaterThan
  public DateGreaterThan = (
    field: string,
    value: Date,
  ): Record<string, object> => {
    return { [field]: { $gt: new Date(value) } };
  };

  // DateGreaterThanEquals
  public DateGreaterThanEquals = (
    field: string,
    value: Date,
  ): Record<string, object> => {
    return { [field]: { $gte: new Date(value) } };
  };

  // Bool
  public Bool = (field: string, value: boolean): Record<string, object> => {
    return { [field]: { $eq: Boolean(value) } };
  };

  // InArray
  public InArray = (field: string, value: any): Record<string, object> => {
    value = Array.isArray(value) ? value : [value];
    const safeValues = value
      .map((val: any) => {
        if (typeof val === "object" && val !== null) {
          return String(val);
        }
        return val;
      })
      .filter((filtered: boolean | string | number) =>
        filtered !== null && filtered !== undefined
      );

    return { [field]: { $in: safeValues } };
  };

  // NotInArray
  public NotInArray = (field: string, value: any): Record<string, object> => {
    value = Array.isArray(value) ? value : [value];
    const safeValues = value
      .map((val: any) => {
        if (typeof val === "object" && val !== null) {
          return String(val);
        }
        return val;
      })
      .filter((filtered: boolean | string | number) =>
        filtered !== null && filtered !== undefined
      );

    return { [field]: { $nin: safeValues } };
  };
}
