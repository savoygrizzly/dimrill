module.exports = {
	testEnvironment: "node",
	testMatch: ["**/tests/**/*.test.ts", "**/tests/**/*.spec.ts"],
	moduleFileExtensions: ["ts", "js", "node"],
	transform: {
		"^.+\\.ts$": "@swc/jest",
	},
	verbose: true,
	maxWorkers: 1,
	silent: false,
};
