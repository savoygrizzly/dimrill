/*
    Benchmark to find the fastest way to verify if a policy matches the required DRNA
    The benchmark is run 1000 times on a set of policies lines
*/

/*
    First method is using a regex
*/

const TRIES = 20000;

console.log("Benchmarking regex");
console.time("regex");
for (let i = 0; i < TRIES; i++) {
  const matchingDrna = "files:createOrder&pricelist/distributor&currency/USD";
  const policies = [
    "files:createOrder&pricelist/distributor&*",
    "files:createOrder&pricelist/distributor&currency/*",
    "files:createOrder&pricelist/public&*",
    "files:createDraft&currency/public&*",
    "noFiles:*",
    "files:*",
    "*",
    "files:createOrder*",
  ];

  policies.forEach((policy) => {
    const result = String(matchingDrna).match(
      new RegExp("^" + String(policy).replace("*", ".*"))
    );
  });
}
console.timeEnd("regex");

const conds = [
  "ToContext",
  "StringStrictlyEquals",
  "StringEquals",
  "StringNotEquals",
  "NumericEquals",
  "NumericNotEquals",
  "NumericLessThan",
  "NumericLessThanEquals",
  "NumericGreaterThan",
  "NumericGreaterThanEquals",
  "DateEquals",
  "DateNotEquals",
  "DateLessThan",
  "DateLessThanEquals",
  "DateGreaterThan",
  "DateGreaterThanEquals",
  "Bool",
  "InArray",
  "AnyValues",
  "EveryValues",
];
const operators = "ToContext:InArray";
const splitOperators = operators.split(":");
if (splitOperators.length > 3 || !conds.every((i) => conds.includes(i))) {
  throw new Error("Invalid operators");
}
