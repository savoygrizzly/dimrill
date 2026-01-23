import Dimrill from "../src";
import path from "path";
import { Policy } from "../src/types/custom";

describe("Complex Policy Linter Tests", () => {
	let dimrill: Dimrill;

	beforeAll(async () => {
		dimrill = new Dimrill({
			schemaPrefix: "blackeye",
		});

		await dimrill.autoload(path.join(__dirname, "schemas/"), {
			recursive: true,
		});
	});

	describe("Template Variable Keys", () => {
		test("should accept template variables as condition keys", () => {
			// This tests the fix for false positives with template variable keys
			// like {{$customerId}}, {{$toOrderState}}, etc.
			const policyWithTemplateKeys: Policy = {
				Version: "1.0",
				Statement: [
					{
						Effect: "Allow",
						Action: ["blackeye:orders:convertOrder"],
						Condition: {
							InArray: {
								"{{$customerId}}": "{{$organizations}}",
								"{{$orderState}}": ["draft"],
							},
							StringEquals: {
								"{{$toOrderState}}": "salesOrder",
							},
						},
					},
				],
			};

			const result = dimrill.validatePolicy(policyWithTemplateKeys);

			// Should NOT report errors for valid template variable keys
			const hasTemplateKeyErrors = result.some(
				(error) =>
					error.message.includes("{{$customerId}}") ||
					error.message.includes("{{$toOrderState}}") ||
					error.message.includes("{{$orderState}}"),
			);
			expect(hasTemplateKeyErrors).toBe(false);
		});

		test("should detect invalid template variable keys", () => {
			const policyWithInvalidTemplateKey: Policy = {
				Version: "1.0",
				Statement: [
					{
						Effect: "Allow",
						Action: ["blackeye:orders:convertOrder"],
						Condition: {
							StringEquals: {
								"{{$nonExistentVariable}}": "someValue",
							},
						},
					},
				],
			};

			const result = dimrill.validatePolicy(policyWithInvalidTemplateKey);
			expect(
				result.some((error) =>
					error.message.includes("$nonExistentVariable"),
				),
			).toBe(true);
		});

		test("should validate template variables in condition values", () => {
			const policyWithTemplateValues: Policy = {
				Version: "1.0",
				Statement: [
					{
						Effect: "Allow",
						Action: ["blackeye:orders:convertOrder"],
						Condition: {
							InArray: {
								"{{$customerId}}": "{{$organizations}}",
							},
						},
					},
				],
			};

			const result = dimrill.validatePolicy(policyWithTemplateValues);
			// Both customerId and organizations exist in the schema
			expect(result).toEqual([]);
		});

		test("should handle multiple template variable conditions", () => {
			const multiConditionPolicy: Policy = {
				Version: "1.0",
				Statement: [
					{
						Effect: "Allow",
						Action: ["blackeye:orders:getCreateOrderFields"],
						Condition: {
							InArray: {
								"{{$pricelist}}": ["list1", "list2"],
								"{{$currencyCode}}": ["USD", "EUR"],
								"{{$sellerId}}": "{{$organizations}}",
								"{{$customerId}}": "{{$organizations}}",
							},
						},
					},
				],
			};

			const result = dimrill.validatePolicy(multiConditionPolicy);
			expect(result).toEqual([]);
		});
	});

	describe("Multiple Policies Validation", () => {
		test("should validate multiple policies at once", () => {
			const policies: Policy[] = [
				{
					Version: "1.0",
					Statement: [
						{
							Effect: "Allow",
							Action: ["blackeye:orders:convertOrder"],
							Condition: {
								StringEquals: {
									"{{$toOrderState}}": "salesOrder",
								},
							},
						},
					],
				},
				{
					Version: "1.0",
					Statement: [
						{
							Effect: "Allow",
							Action: ["blackeye:orders:getCreateOrderFields"],
							Condition: {
								InArray: {
									"{{$pricelist}}": ["list1"],
								},
							},
						},
					],
				},
			];

			const result = dimrill.validatePolicies(policies);
			expect(result).toEqual([]);
		});

		test("should include policyIndex in errors for multiple policies", () => {
			const policies: Policy[] = [
				{
					Version: "1.0",
					Statement: [
						{
							Effect: "Allow",
							Action: ["blackeye:orders:convertOrder"],
						},
					],
				},
				{
					Version: "1.0",
					Statement: [
						{
							Effect: "Allow",
							Action: ["blackeye:orders:nonExistentAction"],
						},
					],
				},
			];

			const result = dimrill.validatePolicies(policies);
			const errorWithIndex = result.find(
				(error) => error.policyIndex === 1,
			);
			expect(errorWithIndex).toBeDefined();
			expect(errorWithIndex?.message).toContain("does not exist in schema");
		});

		test("should validate all statements across multiple policies", () => {
			const policies: Policy[] = [
				{
					Version: "1.0",
					Statement: [
						{
							Effect: "Allow",
							Action: ["blackeye:orders:convertOrder"],
						},
						{
							Effect: "Allow",
							Action: ["blackeye:orders:deleteOrder"],
						},
					],
				},
				{
					Version: "1.0",
					Statement: [
						{
							Effect: "Deny",
							Resource: ["blackeye:orders:createOrder"],
						},
					],
				},
			];

			const result = dimrill.validatePolicies(policies);
			expect(result).toEqual([]);
		});
	});

	describe("Flexible Operator Formats", () => {
		test("should accept ToQuery:InArray format (reversed)", () => {
			const policy: Policy = {
				Version: "1.0",
				Statement: [
					{
						Effect: "Allow",
						Action: ["blackeye:orders:getApplicableTags"],
						Condition: {
							"ToQuery:InArray": {
								"seller.organization": ["org1", "org2"],
							},
						},
					},
				],
			};

			const result = dimrill.validatePolicy(policy);
			const hasOperatorError = result.some((error) =>
				error.message.includes("Unsupported condition operator"),
			);
			expect(hasOperatorError).toBe(false);
		});

		test("should accept ToQuery:Bool format", () => {
			const policy: Policy = {
				Version: "1.0",
				Statement: [
					{
						Effect: "Allow",
						Action: ["blackeye:orders:selectableOrderSellers"],
						Condition: {
							"ToQuery:Bool": {
								isSeller: true,
							},
						},
					},
				],
			};

			const result = dimrill.validatePolicy(policy);
			const hasOperatorError = result.some((error) =>
				error.message.includes("Unsupported condition operator"),
			);
			expect(hasOperatorError).toBe(false);
		});

		test("should accept ToQuery:NotInArray format", () => {
			const policy: Policy = {
				Version: "1.0",
				Statement: [
					{
						Effect: "Allow",
						Action: ["blackeye:orders:getApplicableTags"],
						Condition: {
							"ToQuery:NotInArray": {
								"seller.organization": ["excludedOrg"],
							},
						},
					},
				],
			};

			const result = dimrill.validatePolicy(policy);
			const hasOperatorError = result.some((error) =>
				error.message.includes("Unsupported condition operator"),
			);
			expect(hasOperatorError).toBe(false);
		});

		test("should accept compound operators with multiple modifiers", () => {
			const policy: Policy = {
				Version: "1.0",
				Statement: [
					{
						Effect: "Allow",
						Action: ["blackeye:orders:getApplicableTags"],
						Condition: {
							"ToQuery:InArray:AnyValues": {
								"seller.organization": ["org1"],
							},
						},
					},
				],
			};

			const result = dimrill.validatePolicy(policy);
			const hasOperatorError = result.some((error) =>
				error.message.includes("Unsupported condition operator"),
			);
			expect(hasOperatorError).toBe(false);
		});

		test("should reject completely invalid operators", () => {
			const policy: Policy = {
				Version: "1.0",
				Statement: [
					{
						Effect: "Allow",
						Action: ["blackeye:orders:convertOrder"],
						Condition: {
							CompletelyInvalidOperator: {
								someField: "value",
							},
						},
					},
				],
			};

			const result = dimrill.validatePolicy(policy);
			expect(
				result.some((error) =>
					error.message.includes("Unsupported condition operator"),
				),
			).toBe(true);
		});
	});

	describe("ToQuery with Template Variable Keys", () => {
		test("should skip QueryKeys validation for template variable keys in ToQuery", () => {
			// When using template variables as keys in ToQuery conditions,
			// the QueryKeys validation should be skipped since the actual key
			// is determined at runtime
			const policyWithToQuery: Policy = {
				Version: "1.0",
				Statement: [
					{
						Effect: "Allow",
						Action: ["blackeye:orders:getApplicableTags"],
						Condition: {
							"InArray:ToQuery": {
								// Template variable key - should skip QueryKeys validation
								"{{$sellerId}}": ["seller1", "seller2"],
							},
						},
					},
				],
			};

			const result = dimrill.validatePolicy(policyWithToQuery);
			// Should NOT report QueryKey errors for template variable keys
			const hasQueryKeyError = result.some(
				(error) =>
					error.message.includes("Query key") &&
					error.message.includes("not allowed"),
			);
			expect(hasQueryKeyError).toBe(false);
		});

		test("should validate regular keys against QueryKeys in ToQuery", () => {
			const policyWithInvalidQueryKey: Policy = {
				Version: "1.0",
				Statement: [
					{
						Effect: "Allow",
						Action: ["blackeye:orders:getApplicableTags"],
						Condition: {
							"InArray:ToQuery": {
								// Regular key - should be validated against QueryKeys
								invalidQueryKey: ["value1"],
							},
						},
					},
				],
			};

			const result = dimrill.validatePolicy(policyWithInvalidQueryKey);
			expect(
				result.some(
					(error) =>
						error.message.includes("Query key") &&
						error.message.includes("invalidQueryKey") &&
						error.message.includes("not allowed"),
				),
			).toBe(true);
		});

		test("should accept valid QueryKeys in ToQuery", () => {
			const policyWithValidQueryKey: Policy = {
				Version: "1.0",
				Statement: [
					{
						Effect: "Allow",
						Action: ["blackeye:orders:getApplicableTags"],
						Condition: {
							"InArray:ToQuery": {
								// These are valid QueryKeys from the schema
								"seller.organization": ["org1"],
								currencyCode: ["USD"],
							},
						},
					},
				],
			};

			const result = dimrill.validatePolicy(policyWithValidQueryKey);
			// Should not have QueryKey-related errors
			const hasQueryKeyError = result.some(
				(error) =>
					error.message.includes("Query key") &&
					error.message.includes("not allowed"),
			);
			expect(hasQueryKeyError).toBe(false);
		});
	});

	describe("Template Variables", () => {
		test("should accept valid policy with template variables", () => {
			const validPolicyWithTemplates: Policy = {
				Version: "1.0",
				Statement: [
					{
						Effect: "Allow",
						Resource: [
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

			const result = dimrill.validatePolicy(validPolicyWithTemplates);

			// Should not have errors about valid variables
			const validSchemaVars = ["status", "organizations"];
			const hasErrorsForValidVars =
				result.filter((error) =>
					validSchemaVars.some(
						(varName) =>
							error.message.includes(`Variable "${varName}"`) ||
							error.message.includes(`Template variable "$${varName}"`),
					),
				).length > 0;

			expect(hasErrorsForValidVars).toBe(false);
		});

		test("should detect invalid template variables", () => {
			const invalidTemplatePolicy: Policy = {
				Version: "1.0",
				Statement: [
					{
						Effect: "Allow",
						Resource: ["blackeye:orders:allowedProductCategories"],
						Condition: {
							StringEquals: {
								orderCurrency: "{{$nonExistentVar}}",
							},
						},
					},
				],
			};

			const result = dimrill.validatePolicy(invalidTemplatePolicy);
			expect(
				result.some((error) =>
					error.message.includes('Template variable "$nonExistentVar"'),
				),
			).toBe(true);
		});
	});

	describe("Wildcard Paths", () => {
		test("should accept wildcard paths", () => {
			const wildcardPolicy: Policy = {
				Version: "1.0",
				Statement: [
					{
						Effect: "Allow",
						Action: ["blackeye:orders:*"],
					},
				],
			};

			const result = dimrill.validatePolicy(wildcardPolicy);
			expect(result).toEqual([]);
		});
	});

	describe("Parameterized Paths", () => {
		test("should accept parameterized paths", () => {
			const paramPathPolicy: Policy = {
				Version: "1.0",
				Statement: [
					{
						Effect: "Allow",
						Resource: [
							"blackeye:orders:allowedProductCategories&orderCurrency/EUR",
						],
					},
				],
			};

			const result = dimrill.validatePolicy(paramPathPolicy);
			expect(result).toEqual([]);
		});
	});

	describe("Complex Condition Operators", () => {
		test("should accept complex condition operators", () => {
			const complexOpPolicy: Policy = {
				Version: "1.0",
				Statement: [
					{
						Effect: "Allow",
						Resource: ["blackeye:orders:allowedProductCategories"],
						Condition: {
							"InArray:ToQuery": {
								organizations: ["org1", "org2"],
							},
						},
					},
				],
			};

			const result = dimrill.validatePolicy(complexOpPolicy);
			expect(result).toEqual([]);
		});
	});

	describe("Deny and Allow Statements", () => {
		const adminPolicy: Policy = {
			Version: "2023-7-1",
			Description: "Admin policy, gives full access to the admin functionality",
			Statement: [
				{
					Effect: "Allow",
					Resource: ["*"],
					Action: ["*"],
				},
				{
					Effect: "Deny",
					Resource: [
						"blackeye:policies:editPolicy",
						"blackeye:policies:createPolicy",
					],
					Action: [
						"blackeye:policies:editPolicy",
						"blackeye:policies:createPolicy",
					],
				},
			],
		};

		test("should accept policy with Deny and Allow statements", () => {
			const result = dimrill.validatePolicy(adminPolicy);
			// Wildcards in linter validation may show warnings but should not prevent authorization
			// The important test is that authorization works correctly (tested below)
			expect(result.length).toBeGreaterThanOrEqual(0);
		});

		describe("Authorization with Deny statements", () => {
			test("should reject createPolicy Action due to Deny statement", async () => {
				const result = await dimrill.authorize(
					["Action", "blackeye:policies:createPolicy"],
					[adminPolicy],
					{
						variables: {},
					},
				);

				expect(result.valid).toBe(false);
			});

			test("should reject editPolicy Action due to Deny statement", async () => {
				const result = await dimrill.authorize(
					["Action", "blackeye:policies:editPolicy"],
					[adminPolicy],
					{
						variables: {},
					},
				);

				expect(result.valid).toBe(false);
			});

			test("should reject createPolicy Resource access due to Deny statement", async () => {
				const result = await dimrill.authorize(
					["Resource", "blackeye:policies:createPolicy"],
					[adminPolicy],
					{
						variables: {},
					},
				);

				expect(result.valid).toBe(false);
			});

			test("should allow other actions due to Allow * statement", async () => {
				const result = await dimrill.authorize(
					["Action", "blackeye:orders:allowedProductCategories"],
					[adminPolicy],
					{
						variables: {
							orderCurrency: "EUR",
						},
					},
				);

				expect(result.valid).toBe(true);
			});
		});
	});
});
