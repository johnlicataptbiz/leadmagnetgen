module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // STEP 1: Verify function entry
  if (req.method === 'GET') {
    return res.status(200).json({ 
      status: 'Function Reached',
      node_version: process.version,
      env_key_exists: !!process.env.GEMINI_API_KEY
    });
  }

  try {
    // STEP 2: Test SDK import
    const { GoogleGenerativeAI } = require("@google/genai");
    
    if (!GoogleGenerativeAI) {
      return res.status(500).json({ error: 'SDK import failed: GoogleGenerativeAI is undefined' });
    }

    // STEP 3: Test SDK initialization
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    if (!genAI) {
      return res.status(500).json({ error: 'SDK initialization failed' });
    }

    // STEP 4: Process request
    const { action, payload } = req.body;
    
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
    return res.status(200).json(JSON.parse(response.text()));

  } catch (error) {
    return res.status(500).json({ 
      error: error.message,
      stack: error.stack,
      type: error.constructor.name
    });
  }
};
