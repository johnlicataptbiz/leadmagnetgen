
import { GoogleGenerativeAI } from "@google/genai";

export default async function handler(req: any, res: any) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // Health check for debugging
  if (req.method === 'GET') {
    return res.status(200).json({ status: 'Proxy Active', sdk_loaded: !!GoogleGenerativeAI });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { action, payload } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY missing on Vercel.' });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash",
      systemInstruction: payload.systemInstruction || "You are a helpful assistant."
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
      const prompt = payload.prompt || (payload.parts?.[0]?.text) || "Identify yourself.";
      result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig
      });
    }

    const response = await result.response;
    return res.status(200).json(JSON.parse(response.text()));

  } catch (error: any) {
    console.error("AI Proxy Error:", error);
    return res.status(500).json({ 
      error: error.message || "AI Engine Failure",
      details: error.toString() 
    });
  }
}
