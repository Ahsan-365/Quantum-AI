const GROQ_API_KEY = "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";

const modelsToTest = [
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
    "llama3-70b-8192",
    "llama3-8b-8192",
    "llama-3.2-3b-preview",
    "llama-3.2-1b-preview",
    "llama-guard-3-8b",
    "deepseek-r1-distill-llama-70b",
    "deepseek-r1-distill-llama-70b-specdec",
    "mixtral-8x7b-32768",
    "mistral-saba-24b",
    "qwen-2.5-32b",
    "qwen-2.5-coder-32b",
    "gemma2-9b-it"
];

async function testModels() {
    console.log("Starting model verification...\n");
    for (const model of modelsToTest) {
        try {
            const url = "https://api.groq.com/openai/v1/chat/completions";
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${GROQ_API_KEY}`
                },
                body: JSON.stringify({
                    model: model,
                    messages: [{ role: "user", content: "Hi" }],
                    max_tokens: 10
                })
            });

            if (response.ok) {
                console.log(`[PASS] ${model}`);
            } else {
                const err = await response.json();
                console.log(`[FAIL] ${model} - Error: ${err.error?.message || response.statusText}`);
            }
        } catch (error) {
            console.log(`[ERROR] ${model} - ${error.message}`);
        }
    }
}

testModels();
