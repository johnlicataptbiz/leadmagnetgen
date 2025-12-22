
import { GoogleGenAI } from "@google/genai";

// Vercel Serverless Function (Backend)
// Standardized AI Proxy for secure API key management
export default async function handler(req: any, res: any) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action, payload } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error("CRITICAL: GEMINI_API_KEY is missing from environment variables.");
    return res.status(500).json({ error: 'AI Agent not properly configured. Please check Vercel environment variables.' });
  }

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
      console.log(`Processing multimodal request for action: ${action}`);
      result = await model.generateContent({
        contents: [{ role: 'user', parts: payload.parts }],
        generationConfig
      });
    } else {
      console.log(`Processing text request for prompt length: ${payload.prompt?.length || 0}`);
      result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: payload.prompt }] }],
        generationConfig
      });
    }

    const response = await result.response;
    const text = response.text();
    
    // Safety check for JSON parsing
    try {
      const jsonResponse = JSON.parse(text);
      console.log("Successfully generated JSON response");
      return res.status(200).json(jsonResponse);
    } catch (parseError) {
      console.error("Failed to parse clean JSON from AI. Raw text:", text);
      return res.status(500).json({ error: "AI returned an invalid format. Please try again." });
    }

  } catch (error: any) {
    console.error("AI Proxy Error:", error);
    return res.status(500).json({ 
      error: error.message || "Failed to communicate with AI engine.",
      details: error.stack 
    });
  }
}
