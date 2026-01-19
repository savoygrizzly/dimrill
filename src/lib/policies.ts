import {
	type PathSchema,
	type Policy,
	type ValidatedDataObjects,
	type _SynthetizedDRNAMatch,
	type _DrnaParameters,
} from "../types/custom";
import type Condition from "./conditions";
import type DRNA from "./drna";
import { VariableContext } from "./variableContext";

class Policies {
	public DRNA: DRNA;
	private readonly Conditions: Condition;

	constructor(DRNA: DRNA, Conditions: Condition) {
		this.DRNA = DRNA;
		this.Conditions = Conditions;
	}

	public async sanitizePolicyDrna(
		drna: string,
		schema: PathSchema,
		validatedObjects: ValidatedDataObjects,
		variableContext: VariableContext,
	): Promise<_SynthetizedDRNAMatch> {
		const rawParameters = this.DRNA.matchParametersToSchema(
			this.DRNA.mapInjectedParams(drna.split("&").slice(1), {
				removeWildcards: true,
			}),
			schema,
			validatedObjects,
			{ allowWildcards: true },
		);

		const parameters = await this.processParameters(
			rawParameters,
			variableContext,
		);
		return {
			drnaPaths: drna.split("&")[0].split(":"),
			parameters,
		};
	}

	private async processParameters(
		rawParameters: Record<string, string | number | undefined>,
		variableContext: VariableContext,
	): Promise<_DrnaParameters> {
		const acc: Record<string, string | number | undefined> = {};

		for (const [key, value] of Object.entries(rawParameters)) {
			try {
				const parsedValue = variableContext.formatValue(value);
				acc[String(key)] = parsedValue;
			} catch (error) {
				throw new Error(`Error processing parameter ${key}: ${error}`);
			}
		}

		return acc;
	}

	private async processPolicy(
		drnaType: string,
		policy: Policy,
		drnaToMatch: _SynthetizedDRNAMatch,
		schema: PathSchema,
		validatedObjects: ValidatedDataObjects,
		variableContext: VariableContext,
		options: {
			pathOnly: boolean;
			ignoreConditions: boolean;
		},
	): Promise<{ valid: boolean; query: object | string }> {
		let allowResult: { valid: boolean; query: object | string } | null = null;

		for (const statement of policy.Statement) {
			if (!statement[String(drnaType)]) continue;

			const drnaElements = statement[drnaType];
			if (!Array.isArray(drnaElements)) continue;

			for (const elem of drnaElements) {
				const policyBasePath = elem.split("&")[0];
				const requestBasePath = drnaToMatch.drnaPaths.join(":");

				if (
					this.DRNA.policyPathMatches(policyBasePath as string, requestBasePath)
				) {
					const sanitizedDrna = await this.sanitizePolicyDrna(
						String(elem),
						schema,
						validatedObjects,
						variableContext,
					);

					const valid = this.DRNA.checkDrnaAccess(
						drnaToMatch.drnaPaths,
						drnaToMatch.parameters,
						sanitizedDrna.drnaPaths,
						sanitizedDrna.parameters,
						options.pathOnly,
					);

					if (valid) {
						if (statement.Effect === "Deny") {
							// Deny statement matched - check conditions if present
							if (statement.Condition && !options.ignoreConditions) {
								const conditionResult = await this.Conditions.runConditions(
									statement.Condition,
									schema,
									variableContext,
								);
								// If condition is valid, deny access immediately
								if (conditionResult.valid) {
									return { valid: false, query: {} };
								}
								// If condition is invalid, this Deny doesn't apply - continue checking
								continue;
							}
							// No condition or ignoring conditions - deny immediately
							return { valid: false, query: {} };
						} else if (statement.Effect === "Allow") {
							// Allow statement matched - store result but continue checking for Deny
							if (options.ignoreConditions) {
								allowResult = { valid: true, query: {} };
							} else {
								allowResult = await this.Conditions.runConditions(
									statement.Condition,
									schema,
									variableContext,
								);
							}
							// Don't return yet - continue checking for potential Deny statements
						}
					}
				}
			}
		}

		// If we found an Allow and no Deny blocked it, return the Allow result
		if (allowResult) {
			return allowResult;
		}

		return { valid: false, query: {} };
	}

	public async matchPolicy(
		drnaType: string,
		drnaToMatch: _SynthetizedDRNAMatch,
		schema: PathSchema,
		policies: Policy[],
		validatedObjects: ValidatedDataObjects,
		variableContext: VariableContext,
		options: {
			pathOnly: boolean;
			ignoreConditions: boolean;
		},
	): Promise<Array<{ valid: boolean; query: object | string }>> {
		if (policies.length === 0) {
			return [
				{
					valid: false,
					query: {},
				},
			];
		}
		const promises = await Promise.all(
			policies.map(
				async (policy) =>
					await this.processPolicy(
						drnaType,
						policy,
						drnaToMatch,
						schema,
						validatedObjects,
						variableContext,
						options,
					),
			),
		);

		return promises;
	}

	public mergePoliciesResults(
		results: Array<{ valid: boolean; query: object | string }>,
	): {
		valid: boolean;
		query: object | string;
	} {
		const allValidResults = results.filter((result) => result.valid);
		if (allValidResults.length === 0) {
			return {
				valid: false,
				query: {},
			};
		}
		const allQueries = [allValidResults.map((result) => result.query)];
		const mergedQuery =
			typeof allQueries[0] === "object"
				? this.Conditions.mergeObjectQueries(
						allQueries as Array<Record<string, any>>,
					)
				: this.Conditions.mergeStringQueries(allQueries[0] as string[]);
		return {
			valid: true,
			query: mergedQuery,
		};
	}
}
export default Policies;
