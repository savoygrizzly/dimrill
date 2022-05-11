const Dimrill = require("./index.js");
/*
 *
 *
 *
 *
 *
 *
 *              SCHEMAS IMPLEMENTATION EXAMPLE
 *
 *
 *
 *    Schemas have to be generated using the Dimrill.Schema class
 *    It would be best practice to separate each of them in  DIFFERENT file
 *    Then to assign them all to a single object befor passing it as constructor
 *
 *
 *
 *
 */
const orders = new Dimrill.Schema(
  {
    createOrder: ["priceList", "organization"],
    category: {
      subCategory: {
        subSubCategory: ["value One", "valueTwo"],
        subSubCategory1: true,
      },
    },
  },
  { debug: true, strict: true }
);
