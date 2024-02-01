import def from "ajv/dist/vocabularies/discriminator";

class Operators {
  public StringStrictlyEquals = (
    leftOperator: string,
    rightOperator: string
  ): boolean => {
    return String(leftOperator) === String(rightOperator);
  };

  public StringEquals = (
    leftOperator: string,
    rightOperator: string
  ): boolean => {
    return String(leftOperator) === String(rightOperator);
  };

  public StringStrictlyNotEquals = (
    leftOperator: string,
    rightOperator: string
  ): boolean => {
    return String(leftOperator) !== String(rightOperator);
  };

  public StringNotEquals = (
    leftOperator: string,
    rightOperator: string
  ): boolean => {
    return String(leftOperator) !== String(rightOperator);
  };

  public NumericEquals = (
    leftOperator: number,
    rightOperator: number
  ): boolean => {
    return Number(leftOperator) === Number(rightOperator);
  };

  public NumericNotEquals = (
    leftOperator: number,
    rightOperator: number
  ): boolean => {
    return Number(leftOperator) !== Number(rightOperator);
  };

  public NumericLessThan = (
    leftOperator: number,
    rightOperator: number
  ): boolean => {
    return Number(leftOperator) < Number(rightOperator);
  };

  public NumericLessThanEquals = (
    leftOperator: number,
    rightOperator: number
  ): boolean => {
    return Number(leftOperator) <= Number(rightOperator);
  };

  public NumericGreaterThan = (
    leftOperator: number,
    rightOperator: number
  ): boolean => {
    return Number(leftOperator) > Number(rightOperator);
  };

  public NumericGreaterThanEquals = (
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

  public InArray = (leftOperator: any[], rightOperator: any[]): boolean => {
    return (
      Array.isArray(leftOperator) ? leftOperator : Array(leftOperator)
    ).includes(rightOperator);
  };
}
export default Operators;
