function castValue(type, value) {
  return __typeCasterClass__.apply(undefined, [type, value], {
    arguments: { copy: true },
  });
}
function checkType(value) {
  const casterTypes = [
    "toNumber",
    "toString",
    "toBoolean",
    "toArray",
    "toDate",
    "toObjectId",
    "toObjectIdArray",
  ];
  if (
    casterTypes.some(
      (type) => value.startsWith(type + "(") && value.endsWith(")")
    )
  ) {
    const type = value.slice(0, value.indexOf("("));
    const rawValue = value.slice(value.indexOf("(") + 1, -1);
    return {
      type,
      rawValue,
    };
  }
  return {
    type: "any",
    rawValue: value,
  };
}
function accessProperty(path, context) {
  const typedValue = checkType(path);

  const parts = typedValue.rawValue.split(":");
  let current = context;
  for (const part of parts) {
    if (current && typeof current === "object" && part in current) {
      current = current[part];
    } else {
      return undefined;
      // Property not found or invalid; return undefined or handle as needed
    }
  }
  if (typedValue.type !== "any") {
    return castValue(current);
  }
  return current;
}

function formatValue(value, context) {
  let parsedValue;
  try {
    parsedValue = JSON.parse(value);
  } catch (e) {
    parsedValue = value;
  }

  if (typeof parsedValue !== "string") return parsedValue;
  else {
    if (parsedValue.startsWith("{{") && parsedValue.endsWith("}}")) {
      return accessProperty(parsedValue.slice(2, -2), context);
    }
  }
}

const groupedContext = {
  req: {
    body: {
      pricelist: "distributor",
      test: ["1", "hehe"],
    },
  },
};
const formattedValue1 = formatValue("{{req:body:test}}", groupedContext);
console.log(formattedValue1);
