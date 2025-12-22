
import { GoogleGenAI, Type } from "@google/genai";

// Vercel Serverless Function (Backend)
// This runs on the server, where the API Key is safe.
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action, payload } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
  }

  const genAI = new GoogleGenAI(apiKey);
  const model = genAI.getGenerativeModel({ 
    model: "gemini-2.0-flash",
    systemInstruction: payload.systemInstruction 
  });

  try {
    let result;
    const generationConfig = {
      responseMimeType: "application/json",
      responseSchema: payload.responseSchema
    };

    if (action === 'multimodal') {
      // For Brand DNA analysis with logo
      result = await model.generateContent({
        contents: [{ role: 'user', parts: payload.parts }],
        generationConfig
      });
    } else {
      // Standard text calls
      result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: payload.prompt }] }],
        generationConfig
      });
    }

    const responseText = result.response.text();
    return res.status(200).json(JSON.parse(responseText));
  } catch (error: any) {
    console.error("AI Server Error:", error);
    return res.status(500).json({ error: error.message || "Failed to process AI request" });
  }
}
