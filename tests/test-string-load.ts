import Dimrill from "../src";
import { assertMatch } from "./assertMatch";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { Policy } from "../src/types/custom";

// Get current file's directory when using ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testStringLoading() {
  const dimrill = new Dimrill({
    schemaPrefix: "blackeye",
  });

  // Define our test policies JSON as a string
  const testPoliciesJson = `{
    "testProductPermissions": {
      "Type": [
        "Action",
        "Resource"
      ],
      "Description": "This is a test string-loaded permission",
      "Arguments": {
        "pricelist": {
          "type": "string"
        },
        "orderCurrency": {
          "type": "string"
        },
        "organizations": {
          "type": "objectIdArray"
        }
      },
      "Variables": {
        "pricelist": {
          "type": "string"
        },
        "customerId": {
          "type": "objectIdArray"
        },
        "orderCurrency": {
          "type": "string",
          "required": true
        },
        "organizations": {
          "type": "objectIdArray"
        },
        "status": {
          "type": "stringArray"
        }
      },
      "Condition": {
        "QueryEnforceTypeCast": {
          "organizations": "ToObjectIdArray",
          "categories": "ToObjectIdArray"
        }
      }
    },
    "testListProducts": {
      "Type": [
        "Action"
      ],
      "Description": "This is a test string-loaded product listing",
      "Arguments": {
        "pricelist": {
          "type": "string"
        },
        "orderCurrency": {
          "type": "string"
        },
        "organizations": {
          "type": "objectIdArray"
        }
      },
      "Variables": {
        "pricelist": {
          "type": "string"
        },
        "customerId": {
          "type": "objectIdArray"
        },
        "orderCurrency": {
          "type": "string",
          "required": true
        },
        "organizations": {
          "type": "objectIdArray"
        }
      },
      "Condition": {
        "QueryEnforceTypeCast": {
          "organizations": "ToObjectIdArray",
          "categories": "ToObjectIdArray"
        }
      }
    }
  }`;

  const distributorPolicies: Policy[] = [
    {
      Version: "1.0",
      Statement: [
        {
          Effect: "Allow",
          Resource: [
            "blackeye:testOrders:testProductPermissions&orderCurrency/EUR",
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
          Action: ["blackeye:testOrders:*"],
        },
      ],
    },
  ];

  try {
    console.log("\n📝 Loading schema from string...");

    // Load schema from string with a path that includes a directory
    dimrill.loadSchemaFromString(
      testPoliciesJson,
      "testOrders/products.dmrl.json"
    );

    // Compile the schemas
    await dimrill.compileSchemas();
    console.log("✅ Schema loaded and compiled successfully");

    // Get the schema to verify it was loaded correctly
    const schema = dimrill.getSchema();
    console.log("\n📋 Schema structure:");
    console.log(JSON.stringify(schema, null, 2).substring(0, 300) + "...");

    console.log("\n🧪 Testing authorization with string-loaded schema...");
    const result = await dimrill.authorize(
      ["Resource", "blackeye:testOrders:testProductPermissions"],
      distributorPolicies,
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
    console.log("✅ Authorization successful with string-loaded schema");

    // Test the action permission
    console.log(
      "\n🧪 Testing action authorization with string-loaded schema..."
    );
    const actionResult = await dimrill.authorize(
      ["Action", "blackeye:testOrders:testListProducts"],
      distributorPolicies,
      {
        variables: {
          organizations: ["5e9f8f8f8f8f8f8f8f8f8f8f"],
          orderCurrency: "EUR",
        },
      }
    );

    assertMatch(
      actionResult,
      {
        valid: true,
        query: {},
      },
      "Action authorization should be valid"
    );
    console.log("✅ Action authorization successful");

    console.log("\n✅ All tests passed!");
  } catch (error) {
    console.error("\n❌ Test failed:", error);
    process.exit(1);
  }
}

testStringLoading().catch(console.error);
