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
    
    // Select model based on 2025 Gemini 3 Specifications
    const modelName = action === 'image' ? 'gemini-3-pro-image-preview' : 'gemini-3-flash-preview';
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
    
    const requestBody = {
      contents: action === 'multimodal' 
        ? [{ role: 'user', parts: payload.parts }]
        : [{ role: 'user', parts: [{ text: payload.prompt }] }],
      generationConfig: {
        response_mime_type: action === 'image' ? "text/plain" : "application/json",
        response_schema: action === 'image' ? undefined : payload.responseSchema,
        // Gemini 3 Thinking Levels
        thinking_level: payload.precision === 'high' ? 'high' : 'low',
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

    // For image generation (Nano Banana), the model returns binary/inlineData
    if (action === 'image') {
       const imagePart = geminiData.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
       if (imagePart) {
          return res.status(200).json({ 
             url: `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`,
             metadata: geminiData.usageMetadata 
          });
       }
       // Fallback: check if it returned a text description of an image instead of the image itself
       return res.status(200).json({ error: 'Image generation failed - no binary data returned', raw: generatedText });
    }

    // Parse and return the JSON response for text/data tasks
    try {
      return res.status(200).json(JSON.parse(generatedText));
    } catch (parseError) {
      return res.status(500).json({ 
        error: 'Failed to parse AI response as JSON',
        raw: generatedText?.substring(0, 200) || 'Empty response'
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
