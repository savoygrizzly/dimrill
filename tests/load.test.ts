import Dimrill from "../src";
import path from "path";
import { ObjectId } from "bson";
import util from "util";

const dimrill = new Dimrill({
  schemaPrefix: "blackeye",
});

// Helper function to generate random hex string
const generateRandomHexString = (length: number): string => {
  let result = "";
  const characters = "0123456789abcdef";
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

// Helper function to generate test objects
const generateTestObject = () => {
  const userId = generateRandomHexString(24);
  const userOrgs = Array.from(
    { length: Math.floor(Math.random() * 5) + 1 },
    () => new ObjectId(generateRandomHexString(24))
  );

  return {
    req: {
      body: {
        parentId: generateRandomHexString(24),
        customerId: userOrgs[0],
        pricelist: "dealerPrice",
        orderCurrency: "EUR",
      },
      params: {
        userId,
      },
    },
    user: {
      sub: userId,
      test: {
        naaasty: "test",
      },
      ot: 12,
      organizations: userOrgs,
    },
    variables: {
      pricelist: "dealerPrice",
      orderCurrency: "EUR",
      customerId: [userOrgs[0]],
      organizations: userOrgs,
    },
  };
};

const distributorPolicies = [
  {
    Version: "1.0",
    Statement: [
      {
        Effect: "Allow",
        Resource: ["blackeye:orders:allowedProductCategories"],
        Action: ["blackeye:orders:allowedProductCategories"],
        Condition: {
          "InArray:ToQuery": {
            _id: "{{$organizations}}",
          },
        },
      },
      {
        Effect: "Allow",
        Resource: ["blackeye:products:categories:*"],
      },
    ],
  },
];

describe("Dimrill Authorization Tests", () => {
  beforeAll(async () => {
    console.log("Starting tests...");
    console.log("Loading schemas from:", path.join(__dirname, "schemas"));
    try {
      await dimrill.autoload(path.join(__dirname, "schemas"), {
        recursive: true,
      });
      console.log("Schemas loaded successfully");
      console.log("Schema compiled:", dimrill.schemaHasCompiled());
      console.log(
        "Schema content:",
        util.inspect(dimrill.getSchema(), { depth: null })
      );
    } catch (error) {
      console.error("Error loading schemas:", error);
      throw error;
    }
  });

  afterAll(() => {
    console.log("Cleaning up...");
  });

  test("Should load schemas successfully", () => {
    console.log("Testing schema loading...");
    expect(dimrill.schemaHasCompiled()).toBe(true);
    expect(dimrill.getSchema()).toBeTruthy();
  });

  test("Should authorize with valid variables", async () => {
    console.log("Testing authorization with valid variables...");
    try {
      console.log(dimrill);
      const result = await dimrill.authorize(
        ["Resource", "blackeye:orders:allowedProductCategories"],
        distributorPolicies as any,
        {
          variables: {
            organizations: ["5e9f8f8f8f8f8f8f8f8f8f8f"],
            orderCurrency: "EUR",
          },
        }
      );
      console.log(
        "Authorization result:",
        util.inspect(result, { depth: null })
      );
      expect(result).toHaveProperty("valid");
      expect(result).toHaveProperty("query");
      expect(result.valid).toBe(true);
    } catch (error) {
      console.error("Authorization error:", error);
      throw error;
    }
  }, 10000);

  test("Should reject with missing required variable", async () => {
    console.log("Testing rejection with missing variable...");
    const result = await dimrill.authorize(
      ["Resource", "blackeye:orders:allowedProductCategories"],
      distributorPolicies as any,
      {
        variables: {
          organizations: ["5e9f8f8f8f8f8f8f8f8f8f8f"],
          // Missing orderCurrency
        },
      }
    );
    expect(result.valid).toBe(false);
  }, 10000);

  test("Should reject invalid DRNA path", async () => {
    console.log("Testing rejection with invalid path...");
    const result = await dimrill.authorize(
      ["Resource", "invalid:path"],
      distributorPolicies as any,
      {
        variables: {
          organizations: ["5e9f8f8f8f8f8f8f8f8f8f8f"],
          orderCurrency: "EUR",
        },
      }
    );
    expect(result.valid).toBe(false);
  }, 10000);

  test("Should validate QueryKeys - allow valid keys", async () => {
    console.log("Testing QueryKeys validation with valid keys...");
    const validPolicy = [
      {
        Version: "1.0",
        Statement: [
          {
            Effect: "Allow",
            Resource: ["blackeye:orders:allowedProductCategories"],
            Condition: {
              "InArray:ToQuery": {
                organizations: ["5e9f8f8f8f8f8f8f8f8f8f8f"],
                status: ["active"],
              },
            },
          },
        ],
      },
    ];

    const result = await dimrill.authorize(
      ["Resource", "blackeye:orders:allowedProductCategories"],
      validPolicy as any,
      {
        variables: {
          orderCurrency: "EUR",
        },
      }
    );
    expect(result.valid).toBe(true);
  }, 10000);

  test("Should validate QueryKeys - reject invalid keys", async () => {
    console.log("Testing QueryKeys validation with invalid keys...");
    const invalidPolicy = [
      {
        Version: "1.0",
        Statement: [
          {
            Effect: "Allow",
            Resource: ["blackeye:orders:allowedProductCategories"],
            Condition: {
              "InArray:ToQuery": {
                invalidKey: ["value"], // This key is not in QueryKeys
              },
            },
          },
        ],
      },
    ];

    try {
      const result = await dimrill.authorize(
        ["Resource", "blackeye:orders:allowedProductCategories"],
        invalidPolicy as any,
        {
          variables: {
            orderCurrency: "EUR",
          },
        }
      );
      // Should either throw or return valid: false
      expect(result.valid).toBe(false);
    } catch (error: any) {
      // Should throw a security error
      expect(error.message).toContain("Query key");
      expect(error.message).toContain("invalidKey");
    }
  }, 10000);

  test("Should validate QueryKeys with dynamic variables", async () => {
    console.log("Testing QueryKeys validation with variables...");
    const policyWithVariables = [
      {
        Version: "1.0",
        Statement: [
          {
            Effect: "Allow",
            Resource: ["blackeye:orders:allowedProductCategories"],
            Condition: {
              "InArray:ToQuery": {
                organizations: "{{$organizations}}",
                status: ["active", "pending"],
              },
            },
          },
        ],
      },
    ];

    const result = await dimrill.authorize(
      ["Resource", "blackeye:orders:allowedProductCategories"],
      policyWithVariables as any,
      {
        variables: {
          organizations: ["5e9f8f8f8f8f8f8f8f8f8f8f"],
          orderCurrency: "EUR",
        },
      }
    );
    expect(result.valid).toBe(true);
  }, 10000);

  // test("Should authorize bulk operations", async () => {
  //   const bulk = await dimrill.authorizeBulk(
  //     [["Resource", "blackeye:products:categories:createCategory"]],
  //     distributorPolicies as any
  //   );
  //   expect(Array.isArray(bulk)).toBe(true);
  // });

  // test("Should authorize allowed product categories", async () => {
  //   const testObj = generateTestObject();
  //   const result = await dimrill.authorize(
  //     ["Resource", "blackeye:orders:allowedProductCategories"],
  //     distributorPolicies as any,
  //     testObj
  //   );

  //   expect(result).toHaveProperty('valid');
  //   expect(result).toHaveProperty('query');
  // });
});
