const findPolicy = async (id, policies) => {
  return {
    id: "123",
    Version: "2022-05-02",
    Statement: [
      {
        Effect: "Allow",
        Action: ["files:createOrder&*pricelist/distributor*"],
        Ressource: ["files:createOrder&currency/*"],
      },
    ],
  };
};
module.exports = findPolicy;
