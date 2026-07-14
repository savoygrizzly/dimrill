/**
 * Parse a value into a boolean without JS truthiness pitfalls
 * (e.g. Boolean("false") === true).
 */
export function parseStrictBoolean(value: unknown): boolean {
	if (typeof value === "boolean") {
		return value;
	}
	if (typeof value === "number") {
		if (value === 1) return true;
		if (value === 0) return false;
	}
	if (typeof value === "string") {
		const normalized = value.trim().toLowerCase();
		if (normalized === "true" || normalized === "1") return true;
		if (normalized === "false" || normalized === "0") return false;
	}
	throw new Error(`Invalid boolean value: ${String(value)}`);
}
