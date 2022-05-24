"use-strict";
const mysql = require("mysql");

const StringStrictlyEquals = (leftOperator, rightOperator) => {
  return `${mysql.escapeId(String(leftOperator))} = ${mysql.escape(
    String(rightOperator)
  )}`;
};

const StringEquals = (leftOperator, rightOperator) => {
  return `${mysql.escapeId(String(leftOperator))} = ${mysql.escape(
    String(rightOperator)
  )}`;
};

const StringStrictlyNotEquals = (leftOperator, rightOperator) => {
  return `${mysql.escapeId(String(leftOperator))} != ${mysql.escape(
    String(rightOperator)
  )}`;
};

const StringNotEquals = (leftOperator, rightOperator) => {
  return `${mysql.escapeId(String(leftOperator))} != ${mysql.escape(
    String(rightOperator)
  )}`;
};

const NumericEquals = (leftOperator, rightOperator) => {
  return `${mysql.escapeId(String(leftOperator))} = ${mysql.escape(
    Number(rightOperator)
  )}`;
};

const NumericNotEquals = (leftOperator, rightOperator) => {
  return `${mysql.escapeId(String(leftOperator))} != ${mysql.escape(
    Number(rightOperator)
  )}`;
};

const NumericLessThan = (leftOperator, rightOperator) => {
  return `${mysql.escapeId(String(leftOperator))} < ${mysql.escape(
    Number(rightOperator)
  )}`;
};

const NumericLessThanEquals = (leftOperator, rightOperator) => {
  return `${mysql.escapeId(String(leftOperator))} <= ${mysql.escape(
    Number(rightOperator)
  )}`;
};

const NumericGreaterThan = (leftOperator, rightOperator) => {
  return `${mysql.escapeId(String(leftOperator))} > ${mysql.escape(
    Number(rightOperator)
  )}`;
};

const NumericGreaterThanEquals = (leftOperator, rightOperator) => {
  return `${mysql.escapeId(String(leftOperator))} >= ${mysql.escape(
    Number(rightOperator)
  )}`;
};

const DateEquals = (leftOperator, rightOperator) => {
  return `${mysql.escapeId(String(leftOperator))} = DATE ${mysql.escape(
    String(rightOperator)
  )}`;
};

const DateNotEquals = (leftOperator, rightOperator) => {
  return `${mysql.escapeId(String(leftOperator))} != DATE ${mysql.escape(
    String(rightOperator)
  )}`;
};

const DateLessThan = (leftOperator, rightOperator) => {
  return `${mysql.escapeId(String(leftOperator))} < DATE ${mysql.escape(
    String(rightOperator)
  )}`;
};
const DateLessThanEquals = (leftOperator, rightOperator) => {
  return `${mysql.escapeId(String(leftOperator))} <= DATE ${mysql.escape(
    String(rightOperator)
  )}`;
};

const DateGreaterThan = (leftOperator, rightOperator) => {
  return `${mysql.escapeId(String(leftOperator))} > DATE ${mysql.escape(
    String(rightOperator)
  )}`;
};

const DateGreaterThanEquals = (leftOperator, rightOperator) => {
  return `${mysql.escapeId(String(leftOperator))} >= DATE ${mysql.escape(
    String(rightOperator)
  )}`;
};

const Bool = (leftOperator, rightOperator) => {
  if (typeof rightOperator !== "boolean") {
    rightOperator = false;
  }
  return `${mysql.escapeId(String(leftOperator))} = ${mysql.escape(
    Number(rightOperator)
  )}`;
};

const InArray = (leftOperator, rightOperator) => {
  rightOperator = Array.isArray(rightOperator)
    ? rightOperator
    : Array(rightOperator);
  rightOperator = rightOperator.map((value) => mysql.escape(value)); //sanitize values
  return `${mysql.escapeId(String(leftOperator))} IN (${rightOperator.join(
    ", "
  )})`;
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
