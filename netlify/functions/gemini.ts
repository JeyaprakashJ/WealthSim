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

        // CRITICAL FIX: Use v1beta endpoint. 
        // Newer models like gemini-1.5-flash and gemini-2.0-flash-exp often fail on v1.
        // We use gemini-1.5-flash to ensure high quota availability (avoiding 429).
        const model = "gemini-1.5-flash";
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        console.log(`Calling Gemini API: ${apiUrl.replace(apiKey, "***")} with model ${model}`);

        if (type === "extract_docs") {
            const { base64Data, mimeType } = payload;

            const requestBody = {
                contents: [{
                    parts: [
                        {
                            inline_data: {
                                mime_type: mimeType,
                                data: base64Data
                            }
                        },
                        {
                            text: "Extract the following fields from this document and return ONLY valid JSON with no markdown formatting:\n- baseSalary (annual salary as a number)\n- rsu (annual RSU value as a number)\n- initialAssets (total initial assets as a number)\n- bonusPercent (bonus percentage as a decimal, e.g., 0.1 for 10%)\n\nReturn format: {\"baseSalary\": 100000, \"rsu\": 50000, \"initialAssets\": 0, \"bonusPercent\": 0.1}"
                        }
                    ]
                }]
            };

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error("Gemini API Error:", errorText);
                try {
                    const errorJson = JSON.parse(errorText);
                    throw new Error(JSON.stringify(errorJson));
                } catch {
                    throw new Error(errorText);
                }
            }

            const result = await response.json();
            const text = result.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

            return {
                statusCode: 200,
                headers: { "Content-Type": "application/json" },
                body: text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
            };
        }

        if (type === "life_event") {
            const { eventInput, currentSimYear } = payload;

            const requestBody = {
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

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error("Gemini API Error:", errorText);
                try {
                    const errorJson = JSON.parse(errorText);
                    throw new Error(JSON.stringify(errorJson));
                } catch {
                    throw new Error(errorText);
                }
            }

            const result = await response.json();
            const text = result.candidates?.[0]?.content?.parts?.[0]?.text || "[]";

            return {
                statusCode: 200,
                headers: { "Content-Type": "application/json" },
                body: text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
            };
        }

        return { statusCode: 400, body: "Invalid Request Type" };
    } catch (error: any) {
        console.error("Proxy Error:", error);
        return {
            statusCode: 500,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ error: error.message || String(error) })
        };
    }
}
