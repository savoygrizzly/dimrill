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
    return Boolean(leftOperator) === Boolean(rightOperator);
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
      [...new Set(leftOperator)].filter((x) => rightOperatorSet.has(x)).length ===
      0
    );
  };
}
