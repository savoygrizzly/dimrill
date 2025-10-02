import Dimrill from "../src";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { assertMatch } from "./assertMatch";
import { ObjectId } from "bson";
import { Policy, Statement, StatementCondition } from "../src/types/custom";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testPolicyLinter() {
  const dimrill = new Dimrill({
    schemaPrefix: "blackeye",
  });

  try {
    console.log("\n📝 Loading schemas for policy linter tests...");
    await dimrill.loadSchema(
      path.join(__dirname, "../tests/schemas/orders/products.dmrl.json")
    );
    await dimrill.compileSchemas();
    console.log("✅ Schemas loaded successfully");

    // Test policy validation
    console.log("\n🧪 Testing policy validation...");

    // Valid policy
    const validPolicy: Policy = {
      Version: "2023-10-17",
      Statement: [
        {
          Effect: "Allow" as const,
          Action: ["blackeye:orders:allowedProductCategories"],
          Condition: {
            StringEquals: {
              orderCurrency: "EUR",
            },
          },
        },
      ],
    };

    const validPolicyResult = dimrill.validatePolicy(validPolicy);
    assertMatch(validPolicyResult, [], "Valid policy should produce no errors");

    // Invalid policy - missing Version
    const invalidPolicy1 = {
      Statement: [
        {
          Effect: "Allow" as const,
          Action: ["blackeye:orders:allowedProductCategories"],
        },
      ],
    } as Policy;

    const invalidPolicyResult1 = dimrill.validatePolicy(invalidPolicy1);
    assertMatch(
      invalidPolicyResult1.some((error) =>
        error.message.includes("Policy must have a Version")
      ),
      true,
      "Should detect missing Version"
    );

    // Invalid policy - invalid Effect
    const invalidPolicy2: Policy = {
      Version: "2023-10-17",
      Statement: [
        {
          // @ts-ignore - intentionally invalid for testing
          Effect: "Invalid",
          Action: ["blackeye:orders:allowedProductCategories"],
        },
      ],
    };

    const invalidPolicyResult2 = dimrill.validatePolicy(invalidPolicy2);
    assertMatch(
      invalidPolicyResult2.some((error) =>
        error.message.includes("Statement must have a valid Effect")
      ),
      true,
      "Should detect invalid Effect"
    );

    // Invalid policy - non-existent DRNA path
    const invalidPolicy3: Policy = {
      Version: "2023-10-17",
      Statement: [
        {
          Effect: "Allow" as const,
          Action: ["blackeye:orders:nonexistentAction"],
        },
      ],
    };

    const invalidPolicyResult3 = dimrill.validatePolicy(invalidPolicy3);
    assertMatch(
      invalidPolicyResult3.some((error) =>
        error.message.includes("does not exist in schema")
      ),
      true,
      "Should detect non-existent DRNA path"
    );

    // Invalid policy - missing both Action and Resource
    const invalidPolicy4: Policy = {
      Version: "2023-10-17",
      Statement: [
        {
          Effect: "Allow" as const,
        },
      ],
    };

    const invalidPolicyResult4 = dimrill.validatePolicy(invalidPolicy4);
    assertMatch(
      invalidPolicyResult4.some((error) =>
        error.message.includes("Statement must have either Action or Resource")
      ),
      true,
      "Should detect missing Action/Resource"
    );

    // Test condition validation
    console.log("\n🧪 Testing condition validation...");

    // Invalid condition - variable not in schema
    const invalidPolicy5: Policy = {
      Version: "2023-10-17",
      Statement: [
        {
          Effect: "Allow" as const,
          Action: ["blackeye:orders:allowedProductCategories"],
          Condition: {
            StringEquals: {
              nonExistentVar: "value",
            },
          },
        },
      ],
    };

    const invalidPolicyResult5 = dimrill.validatePolicy(invalidPolicy5);
    assertMatch(
      invalidPolicyResult5.some((error) =>
        error.message.includes("does not exist in the referenced schemas")
      ),
      true,
      "Should detect variable not in schema"
    );

    // Invalid condition - wrong operator for variable type
    const invalidPolicy6: Policy = {
      Version: "2023-10-17",
      Statement: [
        {
          Effect: "Allow" as const,
          Action: ["blackeye:orders:allowedProductCategories"],
          Condition: {
            NumberEquals: {
              orderCurrency: 123,
            },
          },
        },
      ],
    };

    const invalidPolicyResult6 = dimrill.validatePolicy(invalidPolicy6);
    assertMatch(
      invalidPolicyResult6.some((error) =>
        error.message.includes(
          'requires a number variable, but "orderCurrency" is of type "string"'
        )
      ),
      true,
      "Should detect type mismatch between operator and variable"
    );

    // Invalid condition - unsupported operator
    const invalidPolicy7: Policy = {
      Version: "2023-10-17",
      Statement: [
        {
          Effect: "Allow" as const,
          Action: ["blackeye:orders:allowedProductCategories"],
          Condition: {
            // @ts-ignore - intentionally invalid for testing
            UnsupportedOperator: {
              orderCurrency: "EUR",
            },
          },
        },
      ],
    };

    const invalidPolicyResult7 = dimrill.validatePolicy(invalidPolicy7);
    assertMatch(
      invalidPolicyResult7.some((error) =>
        error.message.includes("Unsupported condition operator")
      ),
      true,
      "Should detect unsupported operator"
    );

    // Test standalone statement validation
    console.log("\n🧪 Testing statement validation...");

    const validStatement: Statement = {
      Effect: "Allow",
      Action: ["blackeye:orders:allowedProductCategories"],
    };

    const validStatementResult = dimrill.validateStatement(validStatement);
    assertMatch(
      validStatementResult,
      [],
      "Valid statement should produce no errors"
    );

    // Test standalone condition validation
    console.log("\n🧪 Testing condition validation...");

    const validCondition: StatementCondition = {
      StringEquals: {
        orderCurrency: "EUR",
      },
    };

    const validConditionResult = dimrill.validateConditions(validCondition, {
      Effect: "Allow",
      Action: ["blackeye:orders:allowedProductCategories"],
    });
    assertMatch(
      validConditionResult,
      [],
      "Valid condition should produce no errors"
    );

    console.log("\n✅ All policy linter tests passed!");
  } catch (error) {
    console.error("\n❌ Policy linter test failed:", error);
    process.exit(1);
  }
}

testPolicyLinter();
