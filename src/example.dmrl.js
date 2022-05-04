const Dimrill = require("./index.js");
const orders = new Dimrill.Schema(
  {
    createOrder: ["priceList", "organization"],
    category: {
      subCategory: {
        subSubCategory: ["value One", "valueTwo"],
        subSubCategory1: {
          shit: "key",
        },
      },
    },
  },
  "DEBUG"
);
