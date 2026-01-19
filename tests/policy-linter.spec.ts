import Dimrill from "../src";
import path from "path";
import { Policy, Statement, StatementCondition } from "../src/types/custom";

describe("Policy Linter Tests", () => {
	let dimrill: Dimrill;

	beforeAll(async () => {
		dimrill = new Dimrill({
			schemaPrefix: "blackeye",
		});

		await dimrill.autoload(path.join(__dirname, "schemas/"), {
			recursive: true,
		});
	});

	describe("Policy Validation", () => {
		test("should accept valid policy", () => {
			const validPolicy: Policy = {
				Version: "2023-10-17",
				Statement: [
					{
						Effect: "Allow",
						Action: ["blackeye:orders:allowedProductCategories"],
						Condition: {
							StringEquals: {
								orderCurrency: "EUR",
							},
						},
					},
				],
			};

			const result = dimrill.validatePolicy(validPolicy);
			expect(result).toEqual([]);
		});

		test("should detect missing Version", () => {
			const invalidPolicy = {
				Statement: [
					{
						Effect: "Allow",
						Action: ["blackeye:orders:allowedProductCategories"],
					},
				],
			} as Policy;

			const result = dimrill.validatePolicy(invalidPolicy);
			expect(
				result.some((error) =>
					error.message.includes("Policy must have a Version"),
				),
			).toBe(true);
		});

		test("should detect invalid Effect", () => {
			const invalidPolicy: Policy = {
				Version: "2023-10-17",
				Statement: [
					{
						// @ts-ignore - intentionally invalid for testing
						Effect: "Invalid",
						Action: ["blackeye:orders:allowedProductCategories"],
					},
				],
			};

			const result = dimrill.validatePolicy(invalidPolicy);
			expect(
				result.some((error) =>
					error.message.includes("Statement must have a valid Effect"),
				),
			).toBe(true);
		});

		test("should detect non-existent DRNA path", () => {
			const invalidPolicy: Policy = {
				Version: "2023-10-17",
				Statement: [
					{
						Effect: "Allow",
						Action: ["blackeye:orders:nonexistentAction"],
					},
				],
			};

			const result = dimrill.validatePolicy(invalidPolicy);
			expect(
				result.some((error) =>
					error.message.includes("does not exist in schema"),
				),
			).toBe(true);
		});

		test("should detect missing Action/Resource", () => {
			const invalidPolicy: Policy = {
				Version: "2023-10-17",
				Statement: [
					{
						Effect: "Allow",
					},
				],
			};

			const result = dimrill.validatePolicy(invalidPolicy);
			expect(
				result.some((error) =>
					error.message.includes(
						"Statement must have either Action or Resource",
					),
				),
			).toBe(true);
		});
	});

	describe("Condition Validation", () => {
		test("should detect variable not in schema", () => {
			const invalidPolicy: Policy = {
				Version: "2023-10-17",
				Statement: [
					{
						Effect: "Allow",
						Action: ["blackeye:orders:allowedProductCategories"],
						Condition: {
							StringEquals: {
								nonExistentVar: "value",
							},
						},
					},
				],
			};

			const result = dimrill.validatePolicy(invalidPolicy);
			expect(
				result.some((error) =>
					error.message.includes("does not exist in the referenced schemas"),
				),
			).toBe(true);
		});

		test("should detect type mismatch between operator and variable", () => {
			const invalidPolicy: Policy = {
				Version: "2023-10-17",
				Statement: [
					{
						Effect: "Allow",
						Action: ["blackeye:orders:allowedProductCategories"],
						Condition: {
							NumberEquals: {
								orderCurrency: 123,
							},
						},
					},
				],
			};

			const result = dimrill.validatePolicy(invalidPolicy);
			expect(
				result.some((error) =>
					error.message.includes(
						'requires a number variable, but "orderCurrency" is of type "string"',
					),
				),
			).toBe(true);
		});

		test("should detect unsupported operator", () => {
			const invalidPolicy: Policy = {
				Version: "2023-10-17",
				Statement: [
					{
						Effect: "Allow",
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

			const result = dimrill.validatePolicy(invalidPolicy);
			expect(
				result.some((error) =>
					error.message.includes("Unsupported condition operator"),
				),
			).toBe(true);
		});
	});

	describe("Statement Validation", () => {
		test("should accept valid statement", () => {
			const validStatement: Statement = {
				Effect: "Allow",
				Action: ["blackeye:orders:allowedProductCategories"],
			};

			const result = dimrill.validateStatement(validStatement);
			expect(result).toEqual([]);
		});
	});

	describe("Standalone Condition Validation", () => {
		test("should accept valid condition", () => {
			const validCondition: StatementCondition = {
				StringEquals: {
					orderCurrency: "EUR",
				},
			};

			const result = dimrill.validateConditions(validCondition, {
				Effect: "Allow",
				Action: ["blackeye:orders:allowedProductCategories"],
			});
			expect(result).toEqual([]);
		});
	});

	describe("QueryKeys Validation", () => {
		test("should accept valid QueryKeys", () => {
			const validQueryKeysPolicy: Policy = {
				Version: "2023-10-17",
				Statement: [
					{
						Effect: "Allow",
						Action: ["blackeye:orders:allowedProductCategories"],
						Condition: {
							"InArray:ToQuery": {
								organizations: ["5e9f8f8f8f8f8f8f8f8f8f8f"],
								status: ["active"],
							},
						},
					},
				],
			};

			const result = dimrill.validatePolicy(validQueryKeysPolicy);
			expect(result).toEqual([]);
		});

		test("should detect invalid QueryKeys", () => {
			const invalidQueryKeysPolicy: Policy = {
				Version: "2023-10-17",
				Statement: [
					{
						Effect: "Allow",
						Action: ["blackeye:orders:allowedProductCategories"],
						Condition: {
							"InArray:ToQuery": {
								invalidKey: ["value"], // This key is not in QueryKeys
							},
						},
					},
				],
			};

			const result = dimrill.validatePolicy(invalidQueryKeysPolicy);
			expect(
				result.some(
					(error) =>
						error.message.includes("Query key") &&
						error.message.includes("invalidKey"),
				),
			).toBe(true);
		});

		test("should detect invalid key in mixed conditions", () => {
			const mixedQueryKeysPolicy: Policy = {
				Version: "2023-10-17",
				Statement: [
					{
						Effect: "Allow",
						Action: ["blackeye:orders:allowedProductCategories"],
						Condition: {
							"StringEquals:ToQuery": {
								status: "active", // valid
								invalidField: "value", // invalid
							},
						},
					},
				],
			};

			const result = dimrill.validatePolicy(mixedQueryKeysPolicy);
			expect(
				result.some((error) => error.message.includes("invalidField")),
			).toBe(true);
		});

		test("should not validate non-ToQuery conditions against QueryKeys", () => {
			const nonToQueryPolicy: Policy = {
				Version: "2023-10-17",
				Statement: [
					{
						Effect: "Allow",
						Action: ["blackeye:orders:allowedProductCategories"],
						Condition: {
							StringEquals: {
								orderCurrency: "EUR", // Should validate against variables, not QueryKeys
							},
						},
					},
				],
			};

			const result = dimrill.validatePolicy(nonToQueryPolicy);
			expect(result).toEqual([]);
		});
	});
});
