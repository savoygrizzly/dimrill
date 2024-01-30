const drna = "files:createOrder&*&pricelist/*";

const drnaParams = drna.split("&").slice(1);
const options = {
  removeWildcards: true,
};
const injectedDrnaParams = new Map(
  drnaParams
    .map((param) => {
      const [key, value] = param.split("/");
      return [key, value]; // Return as an entry for the Map
    })
    .filter((param) => {
      console.log(param);
      if (options.removeWildcards) {
        return param[0] !== "*";
      }
      return param;
    })
);
console.log(injectedDrnaParams);
