module.exports = (context) => {
  return {};
  context.Policies.forEach((policy) => {
    policy.Statement.forEach((statement) => {
      statement.Action.find((drna) => {
        //console.log(safe(new RegExp(drna.replace("*", ".*"))));
        const match = context.matchingDrna.match(
          new RegExp(drna.replace("*", ".*"))
        );
        if (match) {
          //console.log(match[0]);
        }
      });
    });
  });
};
