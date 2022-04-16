"use-strict";

const StringStrictlyEquals = (leftOperator, rightOperator) => {
  return {
    [String(lefOperator)]: String(rightOperator),
  };
};

const StringEquals = (leftOperator, rightOperator) => {
  return {
    [String(lefOperator)]: String(rightOperator),
  };
};

const StringStrictlyNotEquals = (leftOperator, rightOperator) => {
  return {
    [String(lefOperator)]: { $ne: String(rightOperator) },
  };
};

const StringNotEquals = (leftOperator, rightOperator) => {
  return {
    [String(lefOperator)]: { $ne: String(rightOperator) },
  };
};

const NumericEquals = (leftOperator, rightOperator) => {
  return {
    [String(lefOperator)]: Number(rightOperator),
  };
};

const NumericNotEquals = (leftOperator, rightOperator) => {
  return {
    [String(lefOperator)]: { $ne: Number(rightOperator) },
  };
};

const NumericLessThan = (leftOperator, rightOperator) => {
  return {
    [String(lefOperator)]: { $lt: Number(rightOperator) },
  };
};

const NumericLessThanEquals = (leftOperator, rightOperator) => {
  return {
    [String(lefOperator)]: { $lte: Number(rightOperator) },
  };
};

const NumericGreaterThan = (leftOperator, rightOperator) => {
  return {
    [String(lefOperator)]: { $gt: Number(rightOperator) },
  };
};

const NumericGreaterThanEquals = (leftOperator, rightOperator) => {
  return {
    [String(lefOperator)]: { $gte: Number(rightOperator) },
  };
};

const DateEquals = (leftOperator, rightOperator) => {
  if (!rightOperator instanceof Date || isNaN(rightOperator)) {
    rightOperator = new Date(rightOperator);
  }
  return {
    [String(leftOperator)]: isNaN(rightOperator) ? false : rightOperator,
  };
};

const DateNotEquals = (leftOperator, rightOperator) => {
  if (!rightOperator instanceof Date || isNaN(rightOperator)) {
    rightOperator = new Date(rightOperator);
  }
  return {
    [String(leftOperator)]: {
      $ne: isNaN(rightOperator) ? false : rightOperator,
    },
  };
};

const DateLessThan = (leftOperator, rightOperator) => {
  if (!rightOperator instanceof Date || isNaN(rightOperator)) {
    rightOperator = new Date(rightOperator);
  }
  return {
    [String(leftOperator)]: {
      $lt: isNaN(rightOperator) ? false : rightOperator,
    },
  };
};
const DateLessThanEquals = (leftOperator, rightOperator) => {
  if (!rightOperator instanceof Date || isNaN(rightOperator)) {
    rightOperator = new Date(rightOperator);
  }
  return {
    [String(leftOperator)]: {
      $lte: isNaN(rightOperator) ? false : rightOperator,
    },
  };
};

const DateGreaterThan = (leftOperator, rightOperator) => {
  if (!rightOperator instanceof Date || isNaN(rightOperator)) {
    rightOperator = new Date(rightOperator);
  }
  return {
    [String(leftOperator)]: {
      $gt: isNaN(rightOperator) ? false : rightOperator,
    },
  };
};

const DateGreaterThanEquals = (leftOperator, rightOperator) => {
  if (!rightOperator instanceof Date || isNaN(rightOperator)) {
    rightOperator = new Date(rightOperator);
  }
  return {
    [String(leftOperator)]: {
      $gte: isNaN(rightOperator) ? false : rightOperator,
    },
  };
};

const Bool = (leftOperator, rightOperator) => {
  return {
    [String(lefOperator)]: Boolean(rightOperator),
  };
};

const InArray = (leftOperator, rightOperator) => {
  return {
    [String(lefOperator)]: {
      $in: Array.isArray(rightOperator) ? t : Array(rightOperator),
    },
  };
};

module.exports = {
  StringStrictlyEquals: StringStrictlyEquals,
  StringEquals: StringEquals,
  StringStrictlyNotEquals: StringStrictlyNotEquals,
  StringNotEquals: StringNotEquals,
  NumericEquals: NumericNotEquals,
  NumericLessThan: NumericLessThan,
  NumericLessThanEquals: NumericLessThanEquals,
  NumericGreaterThan: NumericGreaterThan,
  NumericGreaterThanEquals: NumericGreaterThanEquals,
  DateEquals: DateEquals,
  DateNotEquals: DateNotEquals,
  DateLessThan: DateLessThan,
  DateLessThanEquals: DateLessThanEquals,
  DateGreaterThan: DateGreaterThan,
  DateGreaterThanEquals: DateGreaterThanEquals,
  Bool: Bool,
  InArray: InArray,
};
