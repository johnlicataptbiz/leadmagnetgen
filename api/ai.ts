
import { GoogleGenAI } from "@google/genai";

export default async function handler(req: any, res: any) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { action, payload } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY missing on server.' });

  try {
    const genAI = new GoogleGenAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash",
      systemInstruction: payload.systemInstruction 
    });

    const generationConfig = {
      responseMimeType: "application/json",
      responseSchema: payload.responseSchema
    };

    let result;
    if (action === 'multimodal') {
      result = await model.generateContent({
        contents: [{ role: 'user', parts: payload.parts }],
        generationConfig
      });
    } else {
      result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: payload.prompt }] }],
        generationConfig
      });
    }

    const response = await result.response;
    const text = response.text();
    return res.status(200).json(JSON.parse(text));

  } catch (error: any) {
    console.error("Vercel AI Error:", error);
    return res.status(500).json({ error: error.message || "AI Communication Failure" });
  }
}
