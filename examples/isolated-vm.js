const results = [true, false, false];

const test =
  results.filter((result) => result === true).length === results.length;
console.log(test);
