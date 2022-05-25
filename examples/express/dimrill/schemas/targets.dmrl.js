const newTargetSchema = {
  targets: {
    getTarget: {
      Ressource: true,
    },
    createTarget: [
      {
        name: "targetName",
        Action: true,
      },
      {
        name: "organizationId",
        Ressource: true,
        Action: true,
      },
    ],
  },
};
module.exports = newTargetSchema;
