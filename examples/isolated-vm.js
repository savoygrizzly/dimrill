const InArray = (leftOperator, rightOperator) => {
  return (
    Array.isArray(rightOperator) ? rightOperator : Array(rightOperator)
  ).includes(leftOperator);
};

console.log(InArray(2, [1, 2, 3])); // true
