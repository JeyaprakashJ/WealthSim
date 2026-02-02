import { GoogleGenAI, Type } from "@google/genai";

export async function handler(event: any) {
    console.log("Function invoked:", event.httpMethod, event.path);

    if (event.httpMethod === "GET") {
        return { statusCode: 200, body: "Gemini proxy is live!" };
    }

    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    try {
        const { type, payload } = JSON.parse(event.body);
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            console.error("Missing GEMINI_API_KEY");
            return {
                statusCode: 500,
                body: JSON.stringify({ error: "GEMINI_API_KEY not configured on server." })
            };
        }

        // Initialize with API version v1beta for better schema support
        const ai = new GoogleGenAI({ apiKey, apiVersion: "v1beta" });
        const modelId = "gemini-1.5-flash";

        if (type === "extract_docs") {
            console.log("Processing extract_docs");
            const { base64Data, mimeType } = payload;

            const result = await (ai as any).models.generateContent({
                model: modelId,
                contents: [{
                    parts: [
                        { inlineData: { data: base64Data, mimeType } },
                        { text: "Extract annual 'baseSalary', 'rsu', 'initialAssets', 'bonusPercent'. Return JSON only." }
                    ]
                }],
                generationConfig: {
                    response_mime_type: "application/json",
                    response_schema: {
                        type: Type.OBJECT,
                        properties: {
                            baseSalary: { type: Type.NUMBER },
                            rsu: { type: Type.NUMBER },
                            initialAssets: { type: Type.NUMBER },
                            bonusPercent: { type: Type.NUMBER }
                        }
                    }
                }
            });

            return {
                statusCode: 200,
                headers: { "Content-Type": "application/json" },
                body: result.text
            };
        }

        if (type === "life_event") {
            console.log("Processing life_event:", payload.eventInput);
            const { eventInput, currentSimYear } = payload;

            const result = await (ai as any).models.generateContent({
                model: modelId,
                contents: [{
                    parts: [{
                        text: `Life event prompt: "${eventInput}". Current simulation start year is ${currentSimYear}. 
            Extract: 
            - year (number)
            - type (expense, income_jump, or windfall)
            - amount (number, flat addition/subtraction)
            - hikePercentage (optional number for one-time salary % growth override)
            - newRsuAmount (optional number for one-time RSU grant value override)
            - description (max 15 chars)
            - icon (Material Symbol name). 
            Return a JSON array of objects.`
                    }]
                }],
                generationConfig: {
                    response_mime_type: "application/json",
                    response_schema: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                year: { type: Type.NUMBER },
                                type: { type: Type.STRING },
                                amount: { type: Type.NUMBER },
                                hikePercentage: { type: Type.NUMBER },
                                newRsuAmount: { type: Type.NUMBER },
                                description: { type: Type.STRING },
                                icon: { type: Type.STRING }
                            },
                            required: ["year", "type", "amount", "description", "icon"]
                        }
                    }
                }
            });

            return {
                statusCode: 200,
                headers: { "Content-Type": "application/json" },
                body: result.text
            };
        }

        return { statusCode: 400, body: "Invalid Request Type" };
    } catch (error: any) {
        console.error("Proxy Error:", error);
        return {
            statusCode: 500,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ error: error.message })
        };
    }
}
