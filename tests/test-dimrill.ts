import Dimrill from "../src";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { assertMatch } from "./assertMatch";
import util from "util";
// Get current file's directory when using ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Simple assertion helper

async function testDimrill() {
  const dimrill = new Dimrill({
    schemaPrefix: "blackeye",
  });

  const distributorPolicies = [
    {
      Version: "1.0",
      Statement: [
        {
          Effect: "Allow",
          Ressource: [
            "blackeye:orders:allowedProductCategories&orderCurrency/EUR",
          ],
          Condition: {
            "InArray:ToQuery:AnyValues": {
              status: ["{{$status}}", "banned"],
              organizations: "{{$organizations}}",
            },
          },
        },
        {
          Effect: "Allow",
          Action: ["blackeye:orders:*"],
        },
      ],
    },
  ];

  try {
    console.log("\n📝 Loading schemas...");
    await dimrill.autoload(path.join(__dirname, "../tests/schemas"), {
      recursive: true,
    });
    console.log("✅ Schemas loaded successfully");

    console.log("\n🧪 Testing authorization...");
    const result = await dimrill.authorize(
      ["Ressource", "blackeye:orders:allowedProductCategories"],
      distributorPolicies as any,
      {
        variables: {
          organizations: ["5e9f8f8f8f8f8f8f8f8f8f8f"],
          orderCurrency: "EUR",
          status: ["active", "pending"],
        },
      }
    );
    // Assert the result matches expected structure
    assertMatch(
      result,
      {
        valid: true,
        query: {
          $or: [
            { status: { $in: ["active", "pending", "banned"] } },
            { organizations: { $in: ["5e9f8f8f8f8f8f8f8f8f8f8f"] } },
          ],
        },
      },
      "Authorization result should match expected structure"
    );

    // Test missing required variable
    console.log("\n🧪 Testing missing required variable...");
    try {
      const response = await dimrill.authorize(
        ["Ressource", "blackeye:orders:allowedProductCategories"],
        distributorPolicies as any,
        {
          variables: {
            organizations: ["5e9f8f8f8f8f8f8f8f8f8f8f"],
            // Missing orderCurrency
          },
        }
      );
      if (response.valid) {
        throw new Error(
          "Should have thrown error and stopped execution for missing required variable"
        );
      }
    } catch (error: any) {
      if (error.message.includes("Required variable")) {
        console.log("✅ Correctly rejected missing required variable");
      } else {
        throw error;
      }
    }

    // Test invalid path
    console.log("\n🧪 Testing invalid path...");
    try {
      await dimrill.authorize(
        ["Ressource", "invalid:path"],
        distributorPolicies as any,
        {
          variables: {
            organizations: ["5e9f8f8f8f8f8f8f8f8f8f8f"],
            orderCurrency: "EUR",
          },
        }
      );
      // throw new Error("Should have thrown error for invalid path");
    } catch (error: any) {
      if (error.message.includes("Invalid DRNA path")) {
        console.log("✅ Correctly rejected invalid path");
      } else {
        throw error;
      }
    }

    // Test that legacy objects are removed
    console.log("\n🧪 Testing legacy objects removal...");
    try {
      const result = await dimrill.authorize(
        ["Ressource", "blackeye:orders:allowedProductCategories"],
        distributorPolicies as any,
        {
          // These should be ignored
          // @ts-ignore
          req: { someData: "test" },
          user: { id: "123" },
          context: { extra: "info" },
          // Only variables should be used
          variables: {
            organizations: ["5e9f8f8f8f8f8f8f8f8f8f8f"],
            orderCurrency: "EUR",
          },
        }
      );

      // Verify that the query only uses variables data
      assertMatch(
        result,
        {
          valid: true,
          query: {
            $or: [
              { status: { $in: ["banned"] } }, // no status passed in variables
              { organizations: { $in: ["5e9f8f8f8f8f8f8f8f8f8f8f"] } },
            ],
          },
        },
        "Authorization should only use variables, ignoring legacy objects"
      );

      // Verify the same works with only variables
      const resultOnlyVariables = await dimrill.authorize(
        ["Ressource", "blackeye:orders:allowedProductCategories"],
        distributorPolicies as any,
        {
          variables: {
            organizations: ["5e9f8f8f8f8f8f8f8f8f8f8f"],
            orderCurrency: "EUR",
          },
        }
      );

      assertMatch(
        resultOnlyVariables,
        result,
        "Results should be identical with or without legacy objects"
      );
      console.log("✅ Successfully verified legacy objects are ignored");
    } catch (error) {
      console.error("❌ Legacy objects test failed:", error);
      throw error;
    }

    // Test AnyValues with multiple conditions
    console.log("\n🧪 Testing AnyValues with multiple conditions...");
    const resultMultipleAnyValues = await dimrill.authorize(
      ["Ressource", "blackeye:orders:allowedProductCategories"],
      [
        {
          Version: "1.0",
          Statement: [
            {
              Effect: "Allow",
              Ressource: ["blackeye:orders:allowedProductCategories"],
              Action: ["blackeye:orders:allowedProductCategories"],
              Condition: {
                "InArray:ToQuery:AnyValues": {
                  status: ["active", "pending"],
                  type: ["user", "admin"],
                  organizations: "{{$organizations}}",
                },
              },
            },
          ],
        },
      ],
      {
        variables: {
          organizations: ["5e9f8f8f8f8f8f8f8f8f8f8f"],
          status: ["active"],
          orderCurrency: "EUR",
        },
      }
    );

    assertMatch(
      resultMultipleAnyValues,
      {
        valid: true,
        query: {
          $or: [
            { status: { $in: ["active", "pending"] } },
            { type: { $in: ["user", "admin"] } },
            { organizations: { $in: ["5e9f8f8f8f8f8f8f8f8f8f8f"] } },
          ],
        },
      },
      "Multiple AnyValues conditions should be combined with $or"
    );

    // test authorize bulk
    console.log("\n🧪 Testing authorize bulk...");
    const resultBulk = await dimrill.authorizeBulk(
      [
        ["Ressource", "blackeye:orders:allowedProductCategories"],
        ["Action", "blackeye:orders:listProductCategories"],
        ["Ressource", "blackeye:orders:listProductCategories"],
      ],
      distributorPolicies as any,
      {
        ignoreConditions: true,
      }
    );
    assertMatch(
      resultBulk,
      [
        "Ressource,blackeye:orders:allowedProductCategories",
        "Action,blackeye:orders:listProductCategories",
      ],
      "Authorization bulk should return valid true"
    );
    console.log("\n✅ All tests passed!");
  } catch (error) {
    console.error("\n❌ Test failed:", error);
    process.exit(1);
  }
}

testDimrill().catch(console.error);
