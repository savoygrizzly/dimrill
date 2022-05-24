const agentsSchema = {
  agents: {
    createAgent: {
      Action: true,
    },
    getAgent: {
      Action: true,
      Ressource: true,
    },
    updateAgentInformations: [
      {
        name: "agentId",
        Action: true,
      },
    ],
  },
};
module.exports = agentsSchema;
