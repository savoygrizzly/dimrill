import Dimrill from "../src";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { assertMatch } from "./assertMatch";
import { ObjectId } from "bson";
import { Policy, Statement, StatementCondition } from "../src/types/custom";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testComplexPolicyLinter() {
    const dimrill = new Dimrill({
        schemaPrefix: "blackeye",
    });

    try {
        console.log("\n📝 Loading schemas for complex policy linter tests...");
        await dimrill.autoload(path.join(__dirname, "../tests/schemas/"), {
            recursive: true,
        });
        // await dimrill.compileSchemas();
        console.log("✅ Schemas loaded successfully");

        // Test policy with template variables
        console.log("\n🧪 Testing policy with template variables...");

        // Valid policy with template variables
        const validPolicyWithTemplates: Policy = {
            Version: "1.0",
            Statement: [
                {
                    Effect: "Allow",
                    Ressource: [
                        "blackeye:orders:allowedProductCategories&orderCurrency/EUR",
                        "blackeye:orders:listProductCategories",
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
        };

        const validTemplateResult = dimrill.validatePolicy(validPolicyWithTemplates);
        console.log("Template validation results:", validTemplateResult);

        // We'll test for both status and organizations since they are in the schema
        const validSchemaVars = ["status", "organizations"];
        assertMatch(
            validTemplateResult.filter(error =>
                validSchemaVars.some(varName =>
                    error.message.includes(`Variable "${varName}"`) ||
                    error.message.includes(`Template variable "$${varName}"`)
                )
            ).length === 0,
            true,
            "Should accept variables that exist in the schema"
        );

        // Test policy with invalid template variables
        const invalidTemplatePolicy: Policy = {
            Version: "1.0",
            Statement: [
                {
                    Effect: "Allow",
                    Ressource: [
                        "blackeye:orders:allowedProductCategories",
                    ],
                    Condition: {
                        "StringEquals": {
                            orderCurrency: "{{$nonExistentVar}}",
                        },
                    },
                },
            ],
        };

        const invalidTemplateResult = dimrill.validatePolicy(invalidTemplatePolicy);
        assertMatch(
            invalidTemplateResult.some(error =>
                error.message.includes("Template variable \"$nonExistentVar\"")),
            true,
            "Should detect invalid template variables"
        );

        // Test policy with wildcard path
        console.log("\n🧪 Testing policy with wildcard path...");
        const wildcardPolicy: Policy = {
            Version: "1.0",
            Statement: [
                {
                    Effect: "Allow",
                    Action: ["blackeye:orders:*"],
                }
            ]
        };

        const wildcardResult = dimrill.validatePolicy(wildcardPolicy);
        assertMatch(wildcardResult, [], "Should accept wildcard paths");

        // Test policy with parameterized path
        console.log("\n🧪 Testing policy with parameterized path...");
        const paramPathPolicy: Policy = {
            Version: "1.0",
            Statement: [
                {
                    Effect: "Allow",
                    Ressource: [
                        "blackeye:orders:allowedProductCategories&orderCurrency/EUR",
                    ],
                }
            ]
        };

        const paramPathResult = dimrill.validatePolicy(paramPathPolicy);
        assertMatch(paramPathResult, [], "Should accept parameterized paths");

        // Test policy with complex condition operator
        console.log("\n🧪 Testing policy with complex condition operator...");
        const complexOpPolicy: Policy = {
            Version: "1.0",
            Statement: [
                {
                    Effect: "Allow",
                    Ressource: [
                        "blackeye:orders:allowedProductCategories",
                    ],
                    Condition: {
                        "InArray:ToQuery": {
                            organizations: ["org1", "org2"]
                        }
                    }
                }
            ]
        };

        const complexOpResult = dimrill.validatePolicy(complexOpPolicy);
        assertMatch(complexOpResult, [], "Should accept complex condition operators");

        console.log("\n✅ All complex policy linter tests passed!");
    } catch (error) {
        console.error("\n❌ Complex policy linter test failed:", error);
        process.exit(1);
    }
}

testComplexPolicyLinter(); 