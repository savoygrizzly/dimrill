"use-strict";

const StringStrictlyEquals = (leftOperator, rightOperator) => {
  return {
    [String(leftOperator)]: String(rightOperator),
  };
};

const StringEquals = (leftOperator, rightOperator) => {
  return {
    [String(leftOperator)]: String(rightOperator),
  };
};

const StringStrictlyNotEquals = (leftOperator, rightOperator) => {
  return {
    [String(leftOperator)]: { $ne: String(rightOperator) },
  };
};

const StringNotEquals = (leftOperator, rightOperator) => {
  return {
    [String(leftOperator)]: { $ne: String(rightOperator) },
  };
};

const NumericEquals = (leftOperator, rightOperator) => {
  return {
    [String(leftOperator)]: Number(rightOperator),
  };
};

const NumericNotEquals = (leftOperator, rightOperator) => {
  return {
    [String(leftOperator)]: { $ne: Number(rightOperator) },
  };
};

const NumericLessThan = (leftOperator, rightOperator) => {
  return {
    [String(leftOperator)]: { $lt: Number(rightOperator) },
  };
};

const NumericLessThanEquals = (leftOperator, rightOperator) => {
  return {
    [String(leftOperator)]: { $lte: Number(rightOperator) },
  };
};

const NumericGreaterThan = (leftOperator, rightOperator) => {
  return {
    [String(leftOperator)]: { $gt: Number(rightOperator) },
  };
};

const NumericGreaterThanEquals = (leftOperator, rightOperator) => {
  return {
    [String(leftOperator)]: { $gte: Number(rightOperator) },
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
    [String(leftOperator)]: Boolean(rightOperator),
  };
};

const InArray = (leftOperator, rightOperator) => {
  return {
    [String(leftOperator)]: {
      $in: Array.isArray(rightOperator) ? t : Array(rightOperator),
    },
  };
};

module.exports = {
  StringStrictlyEquals,
  StringEquals,
  StringStrictlyNotEquals,
  StringNotEquals,
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
