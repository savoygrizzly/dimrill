import Dimrill from "../src";
import path from "path";

describe("Dimrill Authorization Tests", () => {
	let dimrill: Dimrill;

	const distributorPolicies = [
		{
			Version: "1.0",
			Statement: [
				{
					Effect: "Allow",
					Resource: [
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

	beforeAll(async () => {
		dimrill = new Dimrill({
			schemaPrefix: "blackeye",
		});

		await dimrill.autoload(path.join(__dirname, "schemas"), {
			recursive: true,
		});
	});

	describe("Basic Authorization", () => {
		test("should authorize with valid variables", async () => {
			const result = await dimrill.authorize(
				["Resource", "blackeye:orders:allowedProductCategories"],
				distributorPolicies as any,
				{
					variables: {
						organizations: ["5e9f8f8f8f8f8f8f8f8f8f8f"],
						orderCurrency: "EUR",
						status: ["active", "pending"],
					},
				},
			);

			expect(result.valid).toBe(true);
			expect(result.query).toHaveProperty("$or");
			// Organizations get cast to ObjectId, so we just check structure
			if (
				typeof result.query === "object" &&
				"$or" in result.query &&
				Array.isArray(result.query.$or)
			) {
				expect(result.query.$or.length).toBe(2);
				// Check that status is in the result
				const hasStatus = result.query.$or.some(
					(item: any) => item.status && Array.isArray(item.status.$in),
				);
				expect(hasStatus).toBe(true);
			}
		});

		test("should reject with missing required variable", async () => {
			const result = await dimrill.authorize(
				["Resource", "blackeye:orders:allowedProductCategories"],
				distributorPolicies as any,
				{
					variables: {
						organizations: ["5e9f8f8f8f8f8f8f8f8f8f8f"],
						// Missing orderCurrency
					},
				},
			);

			expect(result.valid).toBe(false);
		});

		test("should reject invalid path", async () => {
			const result = await dimrill.authorize(
				["Resource", "invalid:path"],
				distributorPolicies as any,
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

	describe("Legacy Objects", () => {
		test("should ignore legacy objects and use only variables", async () => {
			const result = await dimrill.authorize(
				["Resource", "blackeye:orders:allowedProductCategories"],
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
				},
			);

			expect(result.valid).toBe(true);
			expect(result.query).toHaveProperty("$or");
			// Organizations get cast to ObjectId, so we just check structure
			if (
				typeof result.query === "object" &&
				"$or" in result.query &&
				Array.isArray(result.query.$or)
			) {
				expect(result.query.$or.length).toBe(2);
			}

			// Verify the same works with only variables
			const resultOnlyVariables = await dimrill.authorize(
				["Resource", "blackeye:orders:allowedProductCategories"],
				distributorPolicies as any,
				{
					variables: {
						organizations: ["5e9f8f8f8f8f8f8f8f8f8f8f"],
						orderCurrency: "EUR",
					},
				},
			);

			expect(resultOnlyVariables.valid).toBe(result.valid);
			expect(JSON.stringify(resultOnlyVariables.query)).toBe(
				JSON.stringify(result.query),
			);
		});
	});

	describe("AnyValues with Multiple Conditions", () => {
		test("should combine multiple AnyValues conditions with $or", async () => {
			const resultMultipleAnyValues = await dimrill.authorize(
				["Resource", "blackeye:orders:allowedProductCategories"],
				[
					{
						Version: "1.0",
						Statement: [
							{
								Effect: "Allow",
								Resource: ["blackeye:orders:allowedProductCategories"],
								Action: ["blackeye:orders:allowedProductCategories"],
								Condition: {
									"InArray:ToQuery:AnyValues": {
										status: ["active", "pending"],
										categories: ["cat1", "cat2"],
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
				},
			);

			expect(resultMultipleAnyValues.valid).toBe(true);
			if (typeof resultMultipleAnyValues.query === "object") {
				expect(resultMultipleAnyValues.query).toHaveProperty("$or");
			}
		});
	});

	describe("Bulk Authorization", () => {
		test("should authorize multiple DRNAs", async () => {
			const resultBulk = await dimrill.authorizeBulk(
				[
					["Resource", "blackeye:orders:allowedProductCategories"],
					["Action", "blackeye:orders:listProductCategories"],
					["Resource", "blackeye:orders:listProductCategories"],
				],
				distributorPolicies as any,
				{
					ignoreConditions: true,
				},
			);

			expect(resultBulk).toEqual([
				"Resource,blackeye:orders:allowedProductCategories",
				"Action,blackeye:orders:listProductCategories",
			]);
		});
	});

	describe("QueryKeys Validation", () => {
		test("should accept valid query keys", async () => {
			const validQueryKeysPolicy = [
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
				validQueryKeysPolicy as any,
				{
					variables: {
						orderCurrency: "EUR",
					},
				},
			);

			expect(result.valid).toBe(true);
		});

		test("should reject invalid query keys", async () => {
			const invalidQueryKeysPolicy = [
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

			const result = await dimrill.authorize(
				["Resource", "blackeye:orders:allowedProductCategories"],
				invalidQueryKeysPolicy as any,
				{
					variables: {
						orderCurrency: "EUR",
					},
				},
			);

			expect(result.valid).toBe(false);
		});

		test("should accept valid query keys with dynamic variables", async () => {
			const dynamicQueryKeysPolicy = [
				{
					Version: "1.0",
					Statement: [
						{
							Effect: "Allow",
							Resource: ["blackeye:orders:allowedProductCategories"],
							Condition: {
								"StringEquals:ToQuery": {
									status: "{{$status}}",
								},
							},
						},
					],
				},
			];

			const result = await dimrill.authorize(
				["Resource", "blackeye:orders:allowedProductCategories"],
				dynamicQueryKeysPolicy as any,
				{
					variables: {
						status: ["active"],
						orderCurrency: "EUR",
					},
				},
			);

			expect(result.valid).toBe(true);
		});
	});
});
