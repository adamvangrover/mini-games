
import Security from '../js/core/Security.js';

console.log("Running Security Class Verification...");

let failures = 0;

function assert(condition, message) {
    if (!condition) {
        console.error(`❌ FAIL: ${message}`);
        failures++;
    } else {
        console.log(`✅ PASS: ${message}`);
    }
}

function assertEquals(actual, expected, message) {
    if (actual !== expected) {
        console.error(`❌ FAIL: ${message}`);
        console.error(`   Expected: "${expected}"`);
        console.error(`   Actual:   "${actual}"`);
        failures++;
    } else {
        console.log(`✅ PASS: ${message}`);
    }
}

// Test escapeHTML
console.log("\n--- Testing escapeHTML ---");
assertEquals(Security.escapeHTML('<script>alert(1)</script>'), '&lt;script&gt;alert(1)&lt;/script&gt;', 'Basic script tag escaping');
assertEquals(Security.escapeHTML('Width is "500px" & Height is \'300px\''), 'Width is &quot;500px&quot; &amp; Height is &#39;300px&#39;', 'Quotes and ampersand escaping');
assertEquals(Security.escapeHTML(null), '', 'Null input handling');
assertEquals(Security.escapeHTML(undefined), '', 'Undefined input handling');
assertEquals(Security.escapeHTML(0), '0', 'Numeric 0 handling');
assertEquals(Security.escapeHTML(''), '', 'Empty string handling');

// Test sanitizeCSV
console.log("\n--- Testing sanitizeCSV ---");
assertEquals(Security.sanitizeCSV('Normal Text'), 'Normal Text', 'Normal text pass-through');
assertEquals(Security.sanitizeCSV('=1+1'), "'=1+1", 'Formula injection (=) sanitization');
assertEquals(Security.sanitizeCSV('+1+1'), "'+1+1", 'Formula injection (+) sanitization');
assertEquals(Security.sanitizeCSV('-1+1'), "'-1+1", 'Formula injection (-) sanitization');
assertEquals(Security.sanitizeCSV('@SUM(1,2)'), "'@SUM(1,2)", 'Formula injection (@) sanitization');
assertEquals(Security.sanitizeCSV(null), "", 'Null CSV handling');
assertEquals(Security.sanitizeCSV(123), "123", 'Numeric CSV handling');

// Test detectCSVInjection
console.log("\n--- Testing detectCSVInjection ---");
assert(Security.detectCSVInjection('=cmd|'), 'Detects =');
assert(Security.detectCSVInjection('+cmd|'), 'Detects +');
assert(Security.detectCSVInjection('-cmd|'), 'Detects -');
assert(Security.detectCSVInjection('@cmd|'), 'Detects @');
assert(!Security.detectCSVInjection('Safe Text'), 'Ignores safe text');

if (failures === 0) {
    console.log("\n🎉 All Security Tests Passed!");
    process.exit(0);
} else {
    console.error(`\n💀 ${failures} Tests Failed.`);
    process.exit(1);
}
