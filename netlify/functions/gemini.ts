
export async function handler(event: any) {
    console.log("Function invoked:", event.httpMethod, event.path);

    if (event.httpMethod === "GET") {
        return { statusCode: 200, body: "Gemini proxy is live!" };
    }

    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    try {
        const body = JSON.parse(event.body);
        const { type, payload } = body;
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            console.error("Missing GEMINI_API_KEY");
            return {
                statusCode: 500,
                body: JSON.stringify({ error: "GEMINI_API_KEY not configured on server." })
            };
        }

        // STEP 1: DYNAMICALLY DISCOVER AVAILABLE MODELS
        // We prioritize the cutting-edge models seen in your screenshot: Gemini 3 and 2.5
        let selectedModel = "models/gemini-1.5-flash";
        let apiVersion = "v1beta";

        try {
            console.log("Discovering available models...");
            const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
            const listResp = await fetch(listUrl);

            if (listResp.ok) {
                const listData = await listResp.json();
                const allModels = listData.models || [];
                const modelNames = allModels.map((m: any) => m.name);
                console.log("Available Models on your key:", modelNames.join(", "));

                // Selection logic based on your console's available versions
                const PREFERENCE_LIST = [
                    "models/gemini-3-flash",        // THE HOLY GRAIL (From your screenshot!)
                    "models/gemini-2.5-flash",      // Next gen fallback
                    "models/gemini-2.5-flash-lite", // Next gen lite
                    "models/gemini-1.5-flash",      // Standard flash
                    "models/gemini-1.5-flash-latest",
                    "models/gemini-pro"             // Final fallback
                ];

                // Find the first one from our preference list that actually exists in the return
                const found = PREFERENCE_LIST.find(p => modelNames.includes(p));

                if (found) {
                    selectedModel = found;
                    console.log(`Matched preferred model from your account: ${selectedModel}`);
                } else {
                    // Filter for generateContent support as total fallback
                    const capable = allModels.filter((m: any) =>
                        m.supportedGenerationMethods &&
                        m.supportedGenerationMethods.includes("generateContent") &&
                        !m.name.includes("-2.0") // Keep avoiding 2.0 due to your 0 quota
                    );
                    if (capable.length > 0) {
                        selectedModel = capable[0].name;
                        console.log(`Falling back to first capable non-2.0 model: ${selectedModel}`);
                    }
                }
            } else {
                console.error("Discovery failed. Using hardcoded fallback.");
            }
        } catch (e) {
            console.error("Discovery error:", e);
        }

        // STEP 2: EXECUTE REQUEST
        const apiUrl = `https://generativelanguage.googleapis.com/${apiVersion}/${selectedModel}:generateContent?key=${apiKey}`;
        console.log(`Executing request using: ${selectedModel}`);

        let requestBody;
        if (type === "extract_docs") {
            const { base64Data, mimeType } = payload;
            requestBody = {
                contents: [{
                    parts: [
                        { inline_data: { mime_type: mimeType, data: base64Data } },
                        { text: "Extract the following fields from this document and return ONLY valid JSON with no markdown formatting:\n- baseSalary (annual salary as a number)\n- rsu (annual RSU value as a number)\n- initialAssets (total initial assets as a number)\n- bonusPercent (bonus percentage as a decimal, e.g., 0.1 for 10%)\n\nReturn format: {\"baseSalary\": 100000, \"rsu\": 50000, \"initialAssets\": 0, \"bonusPercent\": 0.1}" }
                    ]
                }]
            };
        } else if (type === "life_event") {
            const { eventInput, currentSimYear } = payload;
            requestBody = {
                contents: [{
                    parts: [{
                        text: `You are a financial event parser. Based on this life event description: "${eventInput}", extract events as a JSON array.

Current simulation start year: ${currentSimYear}

For each event, extract:
- year: (number) The year this event occurs
- type: (string) One of: "expense", "income_jump", or "windfall"
- amount: (number) The monetary impact (positive or negative)
- hikePercentage: (optional number) If this causes a salary increase, the percentage (e.g., 0.25 for 25%)
- newRsuAmount: (optional number) If this grants RSUs, the annual value
- description: (string, max 15 chars) Brief description
- icon: (string) A Material Symbols icon name that fits the event

Return ONLY a valid JSON array with no markdown formatting. Example:
[{"year": 2027, "type": "expense", "amount": -50000, "description": "New Car", "icon": "directions_car"}]`
                    }]
                }]
            };
        }

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Model ${selectedModel} failed: ${errorText}`);
        }

        const result = await response.json();
        const text = result.candidates?.[0]?.content?.parts?.[0]?.text || (type === "life_event" ? "[]" : "{}");

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
        };

    } catch (error: any) {
        console.error("Proxy Error:", error);
        return {
            statusCode: 500,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ error: error.message || String(error) })
        };
    }
}
