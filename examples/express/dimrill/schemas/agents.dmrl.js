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
    getAgentDetails: {
      Ressource: true,
    },
  },
};
module.exports = agentsSchema;
