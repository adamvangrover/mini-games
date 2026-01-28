import LLMService from '../js/core/LLMService.js';

async function testLLM() {
    console.log("Testing LLMService...");

    // Test Grok
    const context = [{ role: 'user', text: 'who are you?' }];
    const response = await LLMService.chat('who are you?', context, 'Grok');
    console.log(`Grok says: ${response}`);

    if (response && response.length > 0) {
        console.log("PASS: Grok responded.");
    } else {
        console.error("FAIL: Grok did not respond.");
    }

    // Test Context
    const context2 = [{ role: 'user', text: 'why?' }];
    const response2 = await LLMService.chat('why?', context2, 'Grok');
    console.log(`Grok (context 'why') says: ${response2}`);
    if(response2.includes("Why not") || response2.includes("logic")) {
         console.log("PASS: Context logic worked.");
    }
}

testLLM();
