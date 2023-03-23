const StringStrictlyEquals = (leftOperator, rightOperator) => {
  return String(leftOperator) === String(rightOperator);
};

const StringEquals = (leftOperator, rightOperator) => {
  return String(leftOperator) == String(rightOperator);
};

const StringStrictlyNotEquals = (leftOperator, rightOperator) => {
  return String(leftOperator) !== String(rightOperator);
};

const StringNotEquals = (leftOperator, rightOperator) => {
  return String(leftOperator) != String(rightOperator);
};

const NumericEquals = (leftOperator, rightOperator) => {
  return Number(leftOperator) === Number(rightOperator);
};

const NumericNotEquals = (leftOperator, rightOperator) => {
  return Number(leftOperator) !== Number(rightOperator);
};

const NumericLessThan = (leftOperator, rightOperator) => {
  return Number(leftOperator) < Number(rightOperator);
};

const NumericLessThanEquals = (leftOperator, rightOperator) => {
  return Number(leftOperator) <= Number(rightOperator);
};

const NumericGreaterThan = (leftOperator, rightOperator) => {
  return Number(leftOperator) > Number(rightOperator);
};

const NumericGreaterThanEquals = (leftOperator, rightOperator) => {
  return Number(leftOperator) >= Number(rightOperator);
};

const DateEquals = (leftOperator, rightOperator) => {
  if (!leftOperator instanceof Date || isNaN(leftOperator)) {
    leftOperator = new Date(leftOperator);
  }
  if (!rightOperator instanceof Date || isNaN(rightOperator)) {
    rightOperator = new Date(rightOperator);
  }
  return !isNaN(leftOperator) && !isNaN(rightOperator)
    ? leftOperator.getTime() === rightOperator.getTime()
    : false;
};

const DateNotEquals = (leftOperator, rightOperator) => {
  if (!leftOperator instanceof Date || isNaN(leftOperator)) {
    leftOperator = new Date(leftOperator);
  }
  if (!rightOperator instanceof Date || isNaN(rightOperator)) {
    rightOperator = new Date(rightOperator);
  }
  return !isNaN(leftOperator) && !isNaN(rightOperator)
    ? leftOperator.getTime() !== rightOperator.getTime()
    : false;
};

const DateLessThan = (leftOperator, rightOperator) => {
  if (!leftOperator instanceof Date || isNaN(leftOperator)) {
    leftOperator = new Date(leftOperator);
  }
  if (!rightOperator instanceof Date || isNaN(rightOperator)) {
    rightOperator = new Date(rightOperator);
  }
  return !isNaN(leftOperator) && !isNaN(rightOperator)
    ? leftOperator.getTime() < rightOperator.getTime()
    : false;
};
const DateLessThanEquals = (leftOperator, rightOperator) => {
  if (!leftOperator instanceof Date || isNaN(leftOperator)) {
    leftOperator = new Date(leftOperator);
  }
  if (!rightOperator instanceof Date || isNaN(rightOperator)) {
    rightOperator = new Date(rightOperator);
  }
  return !isNaN(leftOperator) && !isNaN(rightOperator)
    ? leftOperator.getTime() <= rightOperator.getTime()
    : false;
};

const DateGreaterThan = (leftOperator, rightOperator) => {
  if (!leftOperator instanceof Date || isNaN(leftOperator)) {
    leftOperator = new Date(leftOperator);
  }
  if (!rightOperator instanceof Date || isNaN(rightOperator)) {
    rightOperator = new Date(rightOperator);
  }
  return !isNaN(leftOperator) && !isNaN(rightOperator)
    ? leftOperator.getTime() > rightOperator.getTime()
    : false;
};

const DateGreaterThanEquals = (leftOperator, rightOperator) => {
  if (!leftOperator instanceof Date || isNaN(leftOperator)) {
    leftOperator = new Date(leftOperator);
  }
  if (!rightOperator instanceof Date || isNaN(rightOperator)) {
    rightOperator = new Date(rightOperator);
  }
  return !isNaN(leftOperator) && !isNaN(rightOperator)
    ? leftOperator.getTime() >= rightOperator.getTime()
    : false;
};

const Bool = (leftOperator, rightOperator) => {
  return Boolean(leftOperator) === Boolean(rightOperator);
};

const InArray = (leftOperator, rightOperator) => {
  return (
    Array.isArray(leftOperator) ? leftOperator : Array(leftOperator)
  ).includes(rightOperator);
};

module.exports = {
  StringStrictlyEquals,
  StringEquals,
  StringStrictlyNotEquals,
  StringNotEquals,
  NumericEquals,
  NumericNotEquals,
  NumericLessThan,
  NumericLessThanEquals,
  NumericGreaterThan,
  NumericGreaterThanEquals,
  DateEquals,
  DateNotEquals,
  DateLessThan,
  DateLessThanEquals,
  DateGreaterThan,
  DateGreaterThanEquals,
  Bool,
  InArray,
};
