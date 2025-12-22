import { GoogleGenerativeAI } from "@google/genai";

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // STEP 1: Verify function entry
  if (req.method === 'GET') {
    return res.status(200).json({ 
      status: 'Function Reached',
      node_version: process.version,
      env_key_exists: !!process.env.GEMINI_API_KEY,
      sdk_loaded: !!GoogleGenerativeAI
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (!GoogleGenerativeAI) {
      return res.status(500).json({ error: 'SDK import failed: GoogleGenerativeAI is undefined' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY not set on server' });
    }

    // STEP 2: Test SDK initialization
    const genAI = new GoogleGenerativeAI(apiKey);
    
    if (!genAI) {
      return res.status(500).json({ error: 'SDK initialization failed' });
    }

    // STEP 3: Process request
    const { action, payload } = req.body;
    
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash",
      systemInstruction: payload?.systemInstruction || "You are a helpful assistant"
    });

    const generationConfig = {
      responseMimeType: "application/json",
      responseSchema: payload?.responseSchema || { type: "object", properties: { message: { type: "string" } } }
    };

    let result;
    if (action === 'multimodal') {
      result = await model.generateContent({
        contents: [{ role: 'user', parts: payload.parts }],
        generationConfig
      });
    } else {
      const promptText = payload?.prompt || payload?.parts?.[0]?.text || "Hello";
      result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: promptText }] }],
        generationConfig
      });
    }

    const response = await result.response;
    const text = response.text();
    
    try {
      return res.status(200).json(JSON.parse(text));
    } catch (parseError) {
      return res.status(500).json({ 
        error: 'AI did not return valid JSON',
        raw: text.substring(0, 200)
      });
    }

  } catch (error) {
    return res.status(500).json({ 
      error: error.message || 'Unknown error',
      stack: error.stack,
      type: error.constructor?.name
    });
  }
}
