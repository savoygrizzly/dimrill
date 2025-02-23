import Dimrill from "../src";
import path from "path";
import { ObjectId } from "bson";
import util from "util";

const dimrill = new Dimrill({
  validateData: false,
  ivmMemoryLimit: 20,
  schemaPrefix: "blackeye"
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
        orderCurrency: "EUR"
      },
      params: {
        userId
      }
    },
    user: {
      sub: userId,
      test: {
        naaasty: "test"
      },
      ot: 12,
      organizations: userOrgs
    },
    variables: {
      pricelist: "dealerPrice",
      orderCurrency: "EUR",
      customerId: [userOrgs[0]],
      organizations: userOrgs
    }
  };
};

const distributorPolicies = [
  {
    Version: "1.0",
    Statement: [
      {
        Effect: "Allow",
        Ressource: [
          "blackeye:files:orders:allowedProductCategories"
        ],
        Action: ["blackeye:files:orders:allowedProductCategories"],
        Condition: {
          "InArray:ToQuery": {
            "_id": "{{$organizations}}"
          }
        }
      },
      {
        Effect: "Allow",
        Ressource: ["blackeye:products:categories:*"]
      }
    ]
  }
];

describe("Dimrill Authorization Tests", () => {
  beforeAll(async () => {
    console.log("Starting tests...");
    console.log("Loading schemas from:", path.join(__dirname, "schemas"));
    try {
      await dimrill.autoload(path.join(__dirname, "schemas"));
      console.log("Schemas loaded successfully");
      console.log("Schema compiled:", dimrill.schemaHasCompiled());
      console.log("Schema content:", util.inspect(dimrill.getSchema(), { depth: null }));
    } catch (error) {
      console.error("Error loading schemas:", error);
      throw error;
    }
  });

  afterAll(() => {
    console.log("Cleaning up...");
    dimrill.destroyIvm();
  });

  test("Should load schemas successfully", () => {
    console.log("Testing schema loading...");
    expect(dimrill.schemaHasCompiled()).toBe(true);
    expect(dimrill.getSchema()).toBeTruthy();
  });

  test("Should authorize with valid variables", async () => {
    console.log("Testing authorization with valid variables...");
    try {
      console.log(dimrill)
      const result = await dimrill.authorize(
        ["Ressource", "blackeye:files:orders:allowedProductCategories"],
        distributorPolicies as any,
        {
          variables: {
            organizations: ["5e9f8f8f8f8f8f8f8f8f8f8f"],
            orderCurrency: "EUR",
          }
        }
      );
      console.log("Authorization result:", util.inspect(result, { depth: null }));
      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('query');
      expect(result.valid).toBe(true);
    } catch (error) {
      console.error("Authorization error:", error);
      throw error;
    }
  }, 10000);

  test("Should reject with missing required variable", async () => {
    console.log("Testing rejection with missing variable...");
    await expect(dimrill.authorize(
      ["Ressource", "blackeye:files:orders:allowedProductCategories"],
      distributorPolicies as any,
      {
        variables: {
          organizations: ["5e9f8f8f8f8f8f8f8f8f8f8f"]
          // Missing orderCurrency
        }
      }
    )).rejects.toThrow('Required variable');
  }, 10000);

  test("Should reject invalid DRNA path", async () => {
    console.log("Testing rejection with invalid path...");
    await expect(dimrill.authorize(
      ["Ressource", "invalid:path"],
      distributorPolicies as any,
      {
        variables: {
          organizations: ["5e9f8f8f8f8f8f8f8f8f8f8f"],
          orderCurrency: "EUR"
        }
      }
    )).rejects.toThrow('Invalid DRNA path');
  }, 10000);

  // test("Should authorize bulk operations", async () => {
  //   const bulk = await dimrill.authorizeBulk(
  //     [["Ressource", "blackeye:products:categories:createCategory"]],
  //     distributorPolicies as any
  //   );
  //   expect(Array.isArray(bulk)).toBe(true);
  // });

  // test("Should authorize allowed product categories", async () => {
  //   const testObj = generateTestObject();
  //   const result = await dimrill.authorize(
  //     ["Ressource", "blackeye:files:orders:allowedProductCategories"],
  //     distributorPolicies as any,
  //     testObj
  //   );

  //   expect(result).toHaveProperty('valid');
  //   expect(result).toHaveProperty('query');
  // });
});

