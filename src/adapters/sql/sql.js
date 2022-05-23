"use-strict";
const mysql = require("mysql");
const StringStrictlyEquals = (leftOperator, rightOperator) => {
  return `${mysql.escape(String(leftOperator))} = ${mysql.escape(
    String(rightOperator)
  )}`;
};

const StringEquals = (leftOperator, rightOperator) => {
  return `${mysql.escape(String(leftOperator))} = ${mysql.escape(
    String(rightOperator)
  )}`;
};

const StringStrictlyNotEquals = (leftOperator, rightOperator) => {
  return `${mysql.escape(String(leftOperator))} != ${mysql.escape(
    String(rightOperator)
  )}`;
};

const StringNotEquals = (leftOperator, rightOperator) => {
  return `${mysql.escape(String(leftOperator))} != ${mysql.escape(
    String(rightOperator)
  )}`;
};

const NumericEquals = (leftOperator, rightOperator) => {
  return `${mysql.escape(String(leftOperator))} = ${mysql.escape(
    Number(rightOperator)
  )}`;
};

const NumericNotEquals = (leftOperator, rightOperator) => {
  return `${mysql.escape(String(leftOperator))} != ${mysql.escape(
    Number(rightOperator)
  )}`;
};

const NumericLessThan = (leftOperator, rightOperator) => {
  return `${mysql.escape(String(leftOperator))} < ${mysql.escape(
    Number(rightOperator)
  )}`;
};

const NumericLessThanEquals = (leftOperator, rightOperator) => {
  return `${mysql.escape(String(leftOperator))} <= ${mysql.escape(
    Number(rightOperator)
  )}`;
};

const NumericGreaterThan = (leftOperator, rightOperator) => {
  return `${mysql.escape(String(leftOperator))} > ${mysql.escape(
    Number(rightOperator)
  )}`;
};

const NumericGreaterThanEquals = (leftOperator, rightOperator) => {
  return `${mysql.escape(String(leftOperator))} >= ${mysql.escape(
    Number(rightOperator)
  )}`;
};

const DateEquals = (leftOperator, rightOperator) => {
  if (!rightOperator instanceof Date || isNaN(rightOperator)) {
    rightOperator = new Date(rightOperator);
  }
  return `${mysql.escape(String(leftOperator))} = to_date(${mysql.escape(
    Number(rightOperator)
  )})`;
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

/*
    Logical operators
*/
const or = (str) => {
  if (Array.isArray(str)) {
    str = str.length > 1 ? str.join(" OR ") : str.join("");
    return str;
  } else {
    return ` OR ${str}`;
  }
};
const and = (str) => {
  if (Array.isArray(str)) {
    str = str.length > 1 ? str.join(" AND ") : str.join("");
    return str;
  } else {
    return ` AND ${str}`;
  }
};
const explicitAnd = (str) => {
  if (Array.isArray(str)) {
    str = str.length > 1 ? str.join(" AND ") : str.join("");
    return str;
  } else {
    return ` AND ${str}`;
  }
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
  operators: {
    or,
    and,
    explicitAnd,
  },
  returnAs: "String",
};
