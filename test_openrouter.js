


const API_KEY = 'sk-or-v1-REMOVED_FOR_SECURITY'; // TODO: Use environment variable
const MODEL = 'nousresearch/hermes-3-llama-3.1-405b:free';

async function testOpenRouter() {
    // console.log("Testing OpenRouter API...");
    // console.log(`Key: ${API_KEY.substring(0, 10)}...`);
    // console.log(`Model: ${MODEL}`);

    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${API_KEY}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "http://localhost:3000", // Mocking the referer
                "X-Title": "Pillars OS Test",
            },
            body: JSON.stringify({
                "model": MODEL,
                "messages": [
                    { "role": "user", "content": "Ping" }
                ]
            })
        });

        // console.log(`Status: ${response.status} ${response.statusText}`);
        
        if (!response.ok) {
            const errorText = await response.text();
            // console.error("Error Body:", errorText);
            return;
        }

        const data = await response.json();
        // console.log("Success!");
        // console.log("Response:", JSON.stringify(data, null, 2));

    } catch (error) {
        // console.error("Fetch error:", error);
    }
}

testOpenRouter();
