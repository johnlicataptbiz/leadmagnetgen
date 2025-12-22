export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  
  if (req.method === 'GET') {
    return res.status(200).json({ status: 'Lightweight Proxy Online', version: '2.0' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'API key not configured' });
    }

    const { action, payload } = req.body;
    
    // Construct Gemini API request - using gemini-2.5-flash (latest model)
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
    
    const requestBody = {
      contents: action === 'multimodal' 
        ? [{ role: 'user', parts: payload.parts }]
        : [{ role: 'user', parts: [{ text: payload.prompt }] }],
      generationConfig: {
        response_mime_type: "application/json",
        response_schema: payload.responseSchema
      }
    };

    // Add system instruction if provided
    if (payload.systemInstruction) {
      requestBody.systemInstruction = {
        parts: [{ text: payload.systemInstruction }]
      };
    }

    // Forward request to Gemini API
    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      return res.status(geminiResponse.status).json({ 
        error: 'Gemini API error',
        status: geminiResponse.status,
        details: errorText.substring(0, 500)
      });
    }

    const geminiData = await geminiResponse.json();
    const generatedText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText) {
      return res.status(500).json({ 
        error: 'No content generated',
        candidates: geminiData.candidates
      });
    }

    // Parse and return the JSON response
    try {
      return res.status(200).json(JSON.parse(generatedText));
    } catch (parseError) {
      return res.status(500).json({ 
        error: 'Failed to parse AI response as JSON',
        raw: generatedText.substring(0, 200)
      });
    }

  } catch (error) {
    return res.status(500).json({ 
      error: error.message,
      type: error.name,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
