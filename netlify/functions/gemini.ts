import { Type } from "@google/genai";

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

        // List of models to try in order of preference
        // We try variations to handle region-specific availability or aliasing issues
        const CANDIDATE_MODELS = [
            "gemini-1.5-flash",
            "gemini-1.5-flash-latest",
            "gemini-1.5-flash-001",
            "gemini-1.5-pro",
            "gemini-pro" // Fallback to 1.0 Pro if all else fails
        ];

        let lastError = null;

        for (const model of CANDIDATE_MODELS) {
            try {
                console.log(`Attempting model: ${model}`);
                const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

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
                } else {
                    return { statusCode: 400, body: "Invalid Request Type" };
                }

                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestBody)
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    // If it's a 404 (Not Found) or 429 (Quota), we continue to the next model
                    // Otherwise we might want to stop, but for now let's keep trying
                    console.warn(`Model ${model} failed with ${response.status}: ${errorText}`);
                    lastError = errorText;
                    continue; // Try next model
                }

                // If success:
                const result = await response.json();
                const text = result.candidates?.[0]?.content?.parts?.[0]?.text || (type === "life_event" ? "[]" : "{}");

                console.log(`Success with model: ${model}`);

                return {
                    statusCode: 200,
                    headers: { "Content-Type": "application/json" },
                    body: text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
                };

            } catch (e: any) {
                console.error(`Error attempting ${model}:`, e);
                lastError = e.message;
            }
        }

        // If loop finishes without return
        console.error("All models failed.");
        const safeError = lastError ? (typeof lastError === 'string' ? lastError : JSON.stringify(lastError)) : "Unknown error";
        return {
            statusCode: 500,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ error: `All models failed. Last error: ${safeError}` })
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
