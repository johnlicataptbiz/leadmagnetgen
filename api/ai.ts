
import { GoogleGenerativeAI } from "@google/genai";

export default async function handler(req: any, res: any) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action, payload } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error("Vercel Backend: GEMINI_API_KEY is not set.");
    return res.status(500).json({ error: 'API Key missing on server configuration.' });
  }

  try {
    // initialize the correct SDK class
    const genAI = new GoogleGenerativeAI(apiKey);
    
    const modelParams: any = { 
      model: "gemini-2.0-flash"
    };

    // Only add system instruction if provided
    if (payload.systemInstruction) {
      modelParams.systemInstruction = payload.systemInstruction;
    }

    const model = genAI.getGenerativeModel(modelParams);

    const generationConfig: any = {
      responseMimeType: "application/json"
    };

    // Only add schema if provided
    if (payload.responseSchema) {
      generationConfig.responseSchema = payload.responseSchema;
    }

    let result;
    if (action === 'multimodal') {
      console.log("Processing multimodal request...");
      result = await model.generateContent({
        contents: [{ role: 'user', parts: payload.parts }],
        generationConfig
      });
    } else {
      const promptText = payload.prompt || (payload.parts?.[0]?.text);
      console.log("Processing text request...");
      result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: promptText }] }],
        generationConfig
      });
    }

    const response = await result.response;
    const responseText = response.text();
    
    try {
      return res.status(200).json(JSON.parse(responseText));
    } catch (parseError) {
      console.error("Failed to parse JSON response from AI:", responseText);
      return res.status(500).json({ 
        error: "AI did not return valid JSON.",
        raw: responseText.substring(0, 100)
      });
    }

  } catch (error: any) {
    console.error("Vercel Gemini Proxy Error:", error);
    // ALWAYS return JSON so the frontend doesn't crash on a text error
    return res.status(500).json({ 
      error: error.message || "Internal server error during AI processing.",
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
