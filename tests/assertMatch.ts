import util from "util";

export function assertMatch(actual: any, expected: any, message?: string) {
    const matches = Object.entries(expected).every(([key, value]) => {
        if (typeof value === 'object' && value !== null) {
            return JSON.stringify(actual[key]) === JSON.stringify(value);
        }
        return actual[key] === value;
    });

    if (!matches) {
        console.error(`❌ Assertion failed${message ? ': ' + message : ''}`);
        console.error('Expected:', util.inspect(expected, { depth: null, colors: true }));
        console.error('Received:', util.inspect(actual, { depth: null, colors: true }));
        throw new Error('Assertion failed');
    }
    console.log(`✅ Assertion passed${message ? ': ' + message : ''}`);
}