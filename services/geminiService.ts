
import { Type } from "@google/genai";
import { PT_BIZ_SYSTEM_INSTRUCTION, SUGGESTION_PROMPT, CONTENT_PROMPT } from "../constants";
import { LeadMagnetIdea, LeadMagnetContent, HubspotAnalysis, BrandContext } from "../types";

// PROXY MODE: Instead of calling Google directly (Insecure in browser),
// we call our own secure Vercel API endpoint.
const callAIProxy = async (action: 'text' | 'multimodal', payload: any) => {
  const response = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, payload })
  });
  
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || "Server failed to process AI request");
  }
  
  return response.json();
};

export const analyzeStyleReference = async (rawContent: string, fileName: string, logoUrl?: string): Promise<Partial<BrandContext>> => {
  let parts: any[] = [];
  let action: 'text' | 'multimodal' = 'text';
  
  if (logoUrl && logoUrl.startsWith('data:image/')) {
    action = 'multimodal';
    const [mimePart, base64Data] = logoUrl.split(',');
    const mimeType = mimePart.match(/:(.*?);/)?.[1] || 'image/png';
    parts.push({
      inlineData: {
        data: base64Data,
        mimeType: mimeType
      }
    });
  }

  const prompt = `Analyze this existing lead magnet/document named "${fileName}". 
  ${logoUrl ? "I have also provided the brand logo for visual context." : ""}
  Your goal is to extract the "Brand DNA" so that a future AI can perfectly mimic its style, tone, and clinical depth.
  
  Please provide detailed findings for:
  1. Colors: Identify primary, secondary, and accent colors.
  2. Tonality: Define the voice. Is it direct? Academic? Gritty? Emotional? Mention specific recurring linguistic choices.
  3. Styling & Layout: How does it present information? (e.g., 'uses hypothetical patient scenarios', 'heavy use of 3-step frameworks', 'prefers bulleted summaries over paragraphs').
  4. Clinical/Brand Nuances: Extract 3-5 specific "rules" or "jargon" unique to this brand (e.g., 'calls patients "clients"', 'uses the term "clinical freedom" frequently').
  
  Document Content Snippet:
  """
  ${rawContent.substring(0, 30000)}
  """`;

  parts.push({ text: prompt });

  const payload = {
    systemInstruction: PT_BIZ_SYSTEM_INSTRUCTION,
    parts: action === 'multimodal' ? parts : undefined,
    prompt: action === 'text' ? prompt : undefined,
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        colors: {
          type: Type.OBJECT,
          properties: {
            primary: { type: Type.STRING },
            secondary: { type: Type.STRING },
            accent: { type: Type.STRING }
          },
          required: ["primary", "secondary", "accent"]
        },
        tonality: { type: Type.STRING },
        styling: { type: Type.STRING },
        styleNotes: { type: Type.STRING }
      },
      required: ["colors", "tonality", "styling", "styleNotes"]
    }
  };

  try {
    return await callAIProxy(action, payload);
  } catch (e) {
    console.error("Failed to parse brand analysis", e);
    return {};
  }
};

export const getLeadMagnetSuggestions = async (topic: string, brandContext?: BrandContext): Promise<LeadMagnetIdea[]> => {
  const brandPrompt = brandContext ? `
    BRAND MEMORY:
    - Tone: ${brandContext.tonality}
    - Style: ${brandContext.styling}
    - Notes: ${brandContext.styleNotes}
  ` : "";

  const fullPrompt = `${SUGGESTION_PROMPT(topic)}\n\n${brandPrompt}`;

  const payload = {
    systemInstruction: PT_BIZ_SYSTEM_INSTRUCTION,
    prompt: fullPrompt,
    responseSchema: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          title: { type: Type.STRING },
          hook: { type: Type.STRING },
          outline: { type: Type.ARRAY, items: { type: Type.STRING } },
          rationale: { type: Type.STRING },
        },
        required: ["id", "title", "hook", "outline", "rationale"]
      }
    }
  };

  try {
    return await callAIProxy('text', payload);
  } catch (e) {
    console.error("Failed to get suggestions", e);
    return [];
  }
};

export const getSingleLeadMagnetSuggestion = async (topic: string, existingTitles: string[], brandContext?: BrandContext): Promise<LeadMagnetIdea | null> => {
  const brandPrompt = brandContext ? `
    BRAND MEMORY:
    - Tone: ${brandContext.tonality}
    - Style: ${brandContext.styling}
    - Notes: ${brandContext.styleNotes}
  ` : "";

  const fullPrompt = `Generate ONE additional high-converting lead magnet idea for the topic: "${topic}".
  CRITICAL: Do NOT use any of these existing titles: ${existingTitles.join(', ')}.
  Provide something unique and strategic for cash-based PT business growth.
  
  ${brandPrompt}`;

  const payload = {
    systemInstruction: PT_BIZ_SYSTEM_INSTRUCTION,
    prompt: fullPrompt,
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        id: { type: Type.STRING },
        title: { type: Type.STRING },
        hook: { type: Type.STRING },
        outline: { type: Type.ARRAY, items: { type: Type.STRING } },
        rationale: { type: Type.STRING },
      },
      required: ["id", "title", "hook", "outline", "rationale"]
    }
  };

  try {
    return await callAIProxy('text', payload);
  } catch (e) {
    console.error("Failed to get single suggestion", e);
    return null;
  }
};

export const generateLeadMagnetContent = async (idea: LeadMagnetIdea, brandContext?: BrandContext): Promise<LeadMagnetContent | null> => {
  const brandPrompt = brandContext ? `
    CRITICAL BRAND DNA INSTRUCTIONS:
    You MUST mimic the following style exactly:
    - Target Tonality: ${brandContext.tonality}
    - Document Styling & Layout Patterns: ${brandContext.styling}
    - Clinical & Brand Nuances: ${brandContext.styleNotes}
    - Brand Color Palette: Primary: ${brandContext.colors.primary}, Secondary: ${brandContext.colors.secondary}, Accent: ${brandContext.colors.accent}

    Instructions for mimicry:
    1. If the source material uses specific jargon or "insider" clinical language, adopt it.
    2. If the styling mentions specific structures (like 'uses numbered lists for everything' or 'prefers short, punchy paragraphs'), use those exact structures for your content sections.
    3. The tone should feel like an evolution of their existing document but through the PT lens of growth and freedom.
  ` : "";

  const fullPrompt = `${CONTENT_PROMPT(idea)}\n\n${brandPrompt}`;

  const payload = {
    systemInstruction: PT_BIZ_SYSTEM_INSTRUCTION,
    prompt: fullPrompt,
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        subtitle: { type: Type.STRING },
        introduction: { type: Type.STRING },
        sections: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              heading: { type: Type.STRING },
              content: { type: Type.STRING },
              type: { type: Type.STRING },
              items: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["heading", "content", "type"]
          }
        },
        conclusion: { type: Type.STRING },
        cta: { type: Type.STRING },
      },
      required: ["title", "subtitle", "introduction", "sections", "conclusion", "cta"]
    }
  };

  try {
    return await callAIProxy('text', payload);
  } catch (e) {
    console.error("Failed to generate content", e);
    return null;
  }
};

export const analyzeHubspotData = async (rawContent: string, brandContext?: BrandContext): Promise<HubspotAnalysis | null> => {
  const brandContextStr = brandContext ? `Use our established Tone (${brandContext.tonality}) and Styling (${brandContext.styling}) when proposing new ideas.` : "";
  
  const prompt = `Analyze the following raw HubSpot report data from the last 30 days for PT Biz.
  
  Data:
  """
  ${rawContent}
  """
  
  ${brandContextStr}
  
  Provide:
  1. A high-level executive summary.
  2. Winning themes.
  3. Underperforming themes.
  4. 4 brand new strategic lead magnet ideas tailored to our practice style.`;

  const payload = {
    systemInstruction: PT_BIZ_SYSTEM_INSTRUCTION,
    prompt: prompt,
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        summary: { type: Type.STRING },
        whatIsWorking: { type: Type.ARRAY, items: { type: Type.STRING } },
        whatIsNotWorking: { type: Type.ARRAY, items: { type: Type.STRING } },
        strategicSuggestions: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              title: { type: Type.STRING },
              hook: { type: Type.STRING },
              outline: { type: Type.ARRAY, items: { type: Type.STRING } },
              rationale: { type: Type.STRING }
            },
            required: ["id", "title", "hook", "outline", "rationale"]
          }
        }
      },
      required: ["summary", "whatIsWorking", "whatIsNotWorking", "strategicSuggestions"]
    }
  };

  try {
    return await callAIProxy('text', payload);
  } catch (e) {
    console.error("Failed to analyze HubSpot data", e);
    return null;
  }
};
