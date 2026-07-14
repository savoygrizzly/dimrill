import Dimrill from "../src";
import path from "path";
import type { Policy } from "../src/types/custom";

/**
 * Regression suite for authorization bypasses found during security assessment.
 * These tests assert a standard user cannot escalate via policy merge, param
 * matching, ToQuery fail-open, type coercion, or missing variable checks.
 */
describe("Security bypass regressions", () => {
	let dimrill: Dimrill;

	beforeAll(async () => {
		dimrill = new Dimrill({ schemaPrefix: "blackeye" });
		await dimrill.autoload(path.join(__dirname, "schemas"), {
			recursive: true,
		});
	});

	describe("Cross-policy Deny must override Allow", () => {
		const allowAll: Policy = {
			Version: "1.0",
			Statement: [
				{
					Effect: "Allow",
					Action: ["*"],
					Resource: ["*"],
				},
			],
		};

		const denyCreate: Policy = {
			Version: "1.0",
			Statement: [
				{
					Effect: "Deny",
					Action: ["blackeye:policies:createPolicy"],
					Resource: ["blackeye:policies:createPolicy"],
				},
			],
		};

		test("Deny in a separate policy wins over Allow *", async () => {
			const result = await dimrill.authorize(
				["Action", "blackeye:policies:createPolicy"],
				[allowAll, denyCreate],
				{ variables: {} },
			);

			expect(result.valid).toBe(false);
		});

		test("Deny still wins when Deny policy is listed first", async () => {
			const result = await dimrill.authorize(
				["Action", "blackeye:policies:createPolicy"],
				[denyCreate, allowAll],
				{ variables: {} },
			);

			expect(result.valid).toBe(false);
		});
	});

	describe("Policy parameter matching", () => {
		test("policy with explicit params rejects mismatched request params", async () => {
			const policy: Policy = {
				Version: "1.0",
				Statement: [
					{
						Effect: "Allow",
						Resource: [
							"blackeye:orders:allowedProductCategories&orderCurrency/USD",
						],
					},
				],
			};

			const result = await dimrill.authorize(
				["Resource", "blackeye:orders:allowedProductCategories"],
				[policy],
				{
					variables: {
						organizations: ["5e9f8f8f8f8f8f8f8f8f8f8f"],
						orderCurrency: "EUR",
					},
				},
			);

			expect(result.valid).toBe(false);
		});

		test("policy with matching params still authorizes", async () => {
			const policy: Policy = {
				Version: "1.0",
				Statement: [
					{
						Effect: "Allow",
						Resource: [
							"blackeye:orders:allowedProductCategories&orderCurrency/EUR",
						],
						Condition: {
							"InArray:ToQuery": {
								organizations: "{{$organizations}}",
							},
						},
					},
				],
			};

			const result = await dimrill.authorize(
				["Resource", "blackeye:orders:allowedProductCategories"],
				[policy],
				{
					variables: {
						organizations: ["5e9f8f8f8f8f8f8f8f8f8f8f"],
						orderCurrency: "EUR",
					},
				},
			);

			expect(result.valid).toBe(true);
			expect(result.query).toHaveProperty("organizations");
		});
	});

	describe("ToQuery must not fail open", () => {
		test("Mongo operator injection via query key is rejected", async () => {
			const policy: Policy = {
				Version: "1.0",
				Statement: [
					{
						Effect: "Allow",
						Resource: ["blackeye:orders:getCreateOrder"],
						Condition: {
							"StringEquals:ToQuery": {
								$where: "1 == 1",
							} as any,
						},
					},
				],
			};

			const result = await dimrill.authorize(
				["Resource", "blackeye:orders:getCreateOrder"],
				[policy],
				{
					variables: {
						organizations: ["5e9f8f8f8f8f8f8f8f8f8f8f"],
					},
				},
			);

			expect(result.valid).toBe(false);
		});

		test("Mongo operator injection is rejected even without QueryKeys", async () => {
			const policy: Policy = {
				Version: "1.0",
				Statement: [
					{
						Effect: "Allow",
						Resource: ["blackeye:orders:getCreateOrder"],
						Condition: {
							"StringEquals:ToQuery": {
								$where: "1 == 1",
							} as any,
						},
					},
				],
			};

			const result = await dimrill.authorize(
				["Resource", "blackeye:orders:getCreateOrder"],
				[policy],
				{
					variables: {
						organizations: ["5e9f8f8f8f8f8f8f8f8f8f8f"],
					},
				},
			);

			expect(result.valid).toBe(false);
		});

		test("resolved template query keys are denied", async () => {
			const policy: Policy = {
				Version: "1.0",
				Statement: [
					{
						Effect: "Allow",
						Action: ["blackeye:orders:getCreateOrderFields"],
						Condition: {
							"StringEquals:ToQuery": {
								"{{$customerId}}": "1 == 1",
							},
						},
					},
				],
			};

			const result = await dimrill.authorize(
				["Action", "blackeye:orders:getCreateOrderFields"],
				[policy],
				{
					variables: {
						customerId: "$where",
					},
				},
			);

			expect(result.valid).toBe(false);
		});
	});

	describe("Required variables always enforced", () => {
		test("empty variables object fails when schema requires variables", async () => {
			const policy: Policy = {
				Version: "1.0",
				Statement: [
					{
						Effect: "Allow",
						Resource: ["blackeye:orders:allowedProductCategories"],
					},
				],
			};

			const result = await dimrill.authorize(
				["Resource", "blackeye:orders:allowedProductCategories"],
				[policy],
				{ variables: {} },
			);

			expect(result.valid).toBe(false);
		});
	});

	describe("Bool coercion must not treat string false as true", () => {
		test('Bool operator rejects string "false" as matching true', async () => {
			const Operators = (await import("../src/lib/operators/operators"))
				.default;
			const ops = new Operators();
			expect(ops.Bool("false" as any, true)).toBe(false);
			expect(ops.Bool(false, true)).toBe(false);
			expect(ops.Bool(true, true)).toBe(true);
			expect(ops.Bool("true" as any, true)).toBe(true);
		});
	});

	describe("NumericEquals alias works for Deny", () => {
		test("NumericEquals alias matches NumberEquals", async () => {
			const Operators = (await import("../src/lib/operators/operators"))
				.default;
			const ops = new Operators();
			expect(ops.NumericEquals(3, 3)).toBe(true);
			expect(ops.NumericEquals(3, 4)).toBe(false);
			expect(ops.NumericLessThan(2, 5)).toBe(true);
		});

		test("Deny with StringEquals blocks when values match", async () => {
			const policies: Policy[] = [
				{
					Version: "1.0",
					Statement: [
						{
							Effect: "Allow",
							Resource: ["blackeye:orders:allowedProductCategories"],
						},
						{
							Effect: "Deny",
							Resource: ["blackeye:orders:allowedProductCategories"],
							Condition: {
								StringEquals: {
									"{{$orderCurrency}}": "EUR",
								},
							},
						},
					],
				},
			];

			const result = await dimrill.authorize(
				["Resource", "blackeye:orders:allowedProductCategories"],
				policies,
				{
					variables: {
						organizations: ["5e9f8f8f8f8f8f8f8f8f8f8f"],
						orderCurrency: "EUR",
					},
				},
			);

			expect(result.valid).toBe(false);
		});
	});
});
