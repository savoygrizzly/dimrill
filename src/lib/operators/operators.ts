import { parseStrictBoolean } from "./parseBoolean";

export default class Operators {
  public Equals = (leftOperator: any, rightOperator: any): boolean => {
    return leftOperator === rightOperator;
  };

  public NotEquals = (leftOperator: any, rightOperator: any): boolean => {
    return leftOperator !== rightOperator;
  };

  public StringEquals = (
    leftOperator: string,
    rightOperator: string
  ): boolean => {
    return String(leftOperator) === String(rightOperator);
  };

  public StringNotEquals = (
    leftOperator: string,
    rightOperator: string
  ): boolean => {
    return String(leftOperator) !== String(rightOperator);
  };

  /** Strict equality without string coercion */
  public StringStrictlyEquals = (
    leftOperator: string,
    rightOperator: string
  ): boolean => {
    return leftOperator === rightOperator;
  };

  public NumberEquals = (
    leftOperator: number,
    rightOperator: number
  ): boolean => {
    return Number(leftOperator) === Number(rightOperator);
  };

  public NumberNotEquals = (
    leftOperator: number,
    rightOperator: number
  ): boolean => {
    return Number(leftOperator) !== Number(rightOperator);
  };

  public NumberLessThan = (
    leftOperator: number,
    rightOperator: number
  ): boolean => {
    return Number(leftOperator) < Number(rightOperator);
  };

  public NumberLessThanEquals = (
    leftOperator: number,
    rightOperator: number
  ): boolean => {
    return Number(leftOperator) <= Number(rightOperator);
  };

  public NumberGreaterThan = (
    leftOperator: number,
    rightOperator: number
  ): boolean => {
    return Number(leftOperator) > Number(rightOperator);
  };

  public NumberGreaterThanEquals = (
    leftOperator: number,
    rightOperator: number
  ): boolean => {
    return Number(leftOperator) >= Number(rightOperator);
  };

  // Aliases matching SchemaOperators / AWS-style Numeric* names
  public NumericEquals = this.NumberEquals;
  public NumericNotEquals = this.NumberNotEquals;
  public NumericLessThan = this.NumberLessThan;
  public NumericLessThanEquals = this.NumberLessThanEquals;
  public NumericGreaterThan = this.NumberGreaterThan;
  public NumericGreaterThanEquals = this.NumberGreaterThanEquals;

  public DateEquals = (leftOperator: Date, rightOperator: Date): boolean => {
    if (!(leftOperator instanceof Date)) {
      leftOperator = new Date(leftOperator);
    }
    if (!(rightOperator instanceof Date)) {
      rightOperator = new Date(rightOperator);
    }
    return rightOperator !== null && leftOperator !== null
      ? leftOperator.getTime() === rightOperator.getTime()
      : false;
  };

  public DateNotEquals = (leftOperator: Date, rightOperator: Date): boolean => {
    if (!(leftOperator instanceof Date)) {
      leftOperator = new Date(leftOperator);
    }
    if (!(rightOperator instanceof Date)) {
      rightOperator = new Date(rightOperator);
    }
    return rightOperator !== null && leftOperator !== null
      ? leftOperator.getTime() !== rightOperator.getTime()
      : false;
  };

  public DateLessThan = (leftOperator: Date, rightOperator: Date): boolean => {
    if (!(leftOperator instanceof Date)) {
      leftOperator = new Date(leftOperator);
    }
    if (!(rightOperator instanceof Date)) {
      rightOperator = new Date(rightOperator);
    }
    return rightOperator !== null && leftOperator !== null
      ? leftOperator.getTime() < rightOperator.getTime()
      : false;
  };

  public DateLessThanEquals = (
    leftOperator: Date,
    rightOperator: Date
  ): boolean => {
    if (!(leftOperator instanceof Date)) {
      leftOperator = new Date(leftOperator);
    }
    if (!(rightOperator instanceof Date)) {
      rightOperator = new Date(rightOperator);
    }
    return rightOperator !== null && leftOperator !== null
      ? leftOperator.getTime() <= rightOperator.getTime()
      : false;
  };

  public DateGreaterThan = (
    leftOperator: Date,
    rightOperator: Date
  ): boolean => {
    if (!(leftOperator instanceof Date)) {
      leftOperator = new Date(leftOperator);
    }
    if (!(rightOperator instanceof Date)) {
      rightOperator = new Date(rightOperator);
    }
    return rightOperator !== null && leftOperator !== null
      ? leftOperator.getTime() > rightOperator.getTime()
      : false;
  };

  public DateGreaterThanEquals = (
    leftOperator: Date,
    rightOperator: Date
  ): boolean => {
    if (!(leftOperator instanceof Date)) {
      leftOperator = new Date(leftOperator);
    }
    if (!(rightOperator instanceof Date)) {
      rightOperator = new Date(rightOperator);
    }
    return rightOperator !== null && leftOperator !== null
      ? leftOperator.getTime() >= rightOperator.getTime()
      : false;
  };

  public Bool = (leftOperator: boolean, rightOperator: boolean): boolean => {
    try {
      return (
        parseStrictBoolean(leftOperator) === parseStrictBoolean(rightOperator)
      );
    } catch {
      return false;
    }
  };

  public InArray = (leftOperator: any, rightOperator: any[]): boolean => {
    return (
      Array.isArray(rightOperator) ? rightOperator : Array(rightOperator)
    ).includes(leftOperator);
  };

  public NotInArray = (leftOperator: any, rightOperator: any[]): boolean => {
    return !(
      Array.isArray(rightOperator) ? rightOperator : Array(rightOperator)
    ).includes(leftOperator);
  };

  public ArraysIntersect = (
    leftOperator: any[],
    rightOperator: any[]
  ): boolean => {
    const rightOperatorSet = new Set(rightOperator);
    return (
      [...new Set(leftOperator)].filter((x) => rightOperatorSet.has(x)).length >
      0
    );
  };

  public ArraysNoIntersect = (
    leftOperator: any[],
    rightOperator: any[]
  ): boolean => {
    const rightOperatorSet = new Set(rightOperator);
    return (
      [...new Set(leftOperator)].filter((x) => rightOperatorSet.has(x))
        .length === 0
    );
  };
}
