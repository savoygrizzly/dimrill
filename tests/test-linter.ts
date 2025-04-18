import Dimrill from "../src";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { assertMatch } from "./assertMatch";
import { ObjectId } from "bson";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testLinter() {
  const dimrill = new Dimrill({
    schemaPrefix: "blackeye",
  });

  try {
    console.log("\n📝 Loading schemas for linter tests...");
    // await dimrill.autoload(path.join(__dirname, "../tests/schemas"), {
    //   recursive: true,
    // });
    await dimrill.loadSchema(path.join(__dirname, "../tests/schemas/orders/"));
    console.log("✅ Schemas loaded successfully");
    // Test schema details retrieval
    console.log("\n🧪 Testing schema details retrieval...");
    const schemaDetails = dimrill.getSchemaDetails(
      "blackeye:orders:allowedProductCategories"
    );

    assertMatch(
      schemaDetails,
      {
        variables: {
          pricelist: { type: "string" },
          customerId: { type: "objectIdArray" },
          orderCurrency: { type: "string", required: true },
          organizations: { type: "objectIdArray" },
          status: { type: "array" },
        },
        arguments: {
          pricelist: { type: "string" },
          orderCurrency: { type: "string" },
          organizations: { type: "objectIdArray" },
        },
        conditions: {
          QueryEnforceTypeCast: {
            organizations: "ToObjectIdArray",
            categories: "ToObjectIdArray",
          },
        },
        type: ["Action", "Ressource"],
      },
      "Schema details should match the schema file"
    );

    // Test variable validation
    console.log("\n🧪 Testing variable validation...");

    // Test valid variables
    const validVariables = {
      pricelist: "standard",
      singleId: new ObjectId(),
      customerId: [new ObjectId()],
      orderCurrency: "EUR",
      organizations: [new ObjectId()],
      status: ["active", "pending"],
    };

    const validResult = dimrill.validateVariables(
      "blackeye:orders:allowedProductCategories",
      validVariables
    );
    assertMatch(validResult, [], "Valid variables should produce no errors");

    // Test invalid variables
    const invalidVariables = {
      pricelist: 123, // should be string
      singleId: "not-an-objectid", // should be ObjectId
      customerId: "not-an-array", // should be objectIdArray
      organizations: ["not-an-objectid"], // should be array of ObjectIds
      status: "not-an-array", // should be array
      // missing required orderCurrency
    };

    const invalidResult = dimrill.validateVariables(
      "blackeye:orders:allowedProductCategories",
      invalidVariables
    );

    assertMatch(invalidResult.length, 6, "Should have 6 validation errors");
    assertMatch(
      invalidResult.some((error) =>
        error.message.includes('Required variable "orderCurrency" is missing')
      ),
      true,
      "Should detect missing required variable"
    );
    assertMatch(
      invalidResult.some(
        (error) =>
          error.message.includes("must be a string") &&
          error.path === "pricelist"
      ),
      true,
      "Should detect wrong type for string"
    );

    // Test non-existent path
    console.log("\n🧪 Testing non-existent path...");
    const nonExistentResult = dimrill.getSchemaDetails("blackeye:invalid:path");
    assertMatch(
      nonExistentResult,
      null,
      "Non-existent path should return null"
    );

    console.log("\n✅ All linter tests passed!");
  } catch (error) {
    console.error("\n❌ Linter test failed:", error);
    process.exit(1);
  }
}

testLinter();
