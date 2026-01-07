
import { GrokApp } from '../js/core/BossModeApps.js';

// Mock DOM
const mockContainer = {
    innerHTML: '',
    closest: () => ({ grokInstance: null }),
    querySelector: () => null
};

// Instantiate GrokApp
const app = new GrokApp(mockContainer);

// Simulate user input with XSS payload
const xssPayload = '<img src=x onerror=alert("XSS")>';
app.chat(xssPayload);

// Check if payload is in innerHTML
if (mockContainer.innerHTML.includes(xssPayload)) {
    console.log('VULNERABILITY CONFIRMED: XSS payload found in innerHTML.');
    console.log('Payload:', xssPayload);
} else {
    console.log('SAFE: XSS payload not found directly in innerHTML.');
}
