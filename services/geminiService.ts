
import { GoogleGenAI, Type } from "@google/genai";
import { PT_BIZ_SYSTEM_INSTRUCTION, SUGGESTION_PROMPT, CONTENT_PROMPT } from "../constants";
import { LeadMagnetIdea, LeadMagnetContent, HubspotAnalysis, BrandContext } from "../types";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY as string });

export const analyzeStyleReference = async (rawContent: string, fileName: string): Promise<Partial<BrandContext>> => {
  const ai = getAI();
  const prompt = `Analyze this existing lead magnet/document named "${fileName}". 
  Extract the "Brand DNA" into a structured format. 
  
  Look for:
  1. Colors: Identify the primary, secondary, and accent colors (look for Hex codes or RGB if mentioned, otherwise describe them).
  2. Tonality: What is the emotional and intellectual tone? (e.g., authoritative, gritty, premium, minimalist).
  3. Styling: What are the layout patterns? (e.g., uses lots of checklists, bold summaries, specific section breaks).
  
  Document Content Snippet:
  """
  ${rawContent.substring(0, 15000)}
  """`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: { 
      systemInstruction: PT_BIZ_SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          colors: {
            type: Type.OBJECT,
            properties: {
              primary: { type: Type.STRING, description: "Hex code or color name" },
              secondary: { type: Type.STRING, description: "Hex code or color name" },
              accent: { type: Type.STRING, description: "Hex code or color name" }
            },
            required: ["primary", "secondary", "accent"]
          },
          tonality: { type: Type.STRING },
          styling: { type: Type.STRING },
          styleNotes: { type: Type.STRING, description: "A summary of how to replicate this voice" }
        },
        required: ["colors", "tonality", "styling", "styleNotes"]
      }
    }
  });

  try {
    const data = JSON.parse(response.text || '{}');
    return data;
  } catch (e) {
    console.error("Failed to parse brand analysis", e);
    return {};
  }
};

export const getLeadMagnetSuggestions = async (topic: string, brandContext?: BrandContext): Promise<LeadMagnetIdea[]> => {
  const ai = getAI();
  const brandPrompt = brandContext ? `
    BRAND MEMORY:
    - Tone: ${brandContext.tonality}
    - Style: ${brandContext.styling}
    - Notes: ${brandContext.styleNotes}
  ` : "";

  const fullPrompt = `${SUGGESTION_PROMPT(topic)}\n\n${brandPrompt}`;

  const response = await ai.models.generateContent({
    model: 'gemini-flash-lite-latest',
    contents: fullPrompt,
    config: {
      systemInstruction: PT_BIZ_SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
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
    }
  });

  try {
    return JSON.parse(response.text || '[]');
  } catch (e) {
    return [];
  }
};

export const getSingleLeadMagnetSuggestion = async (topic: string, existingTitles: string[], brandContext?: BrandContext): Promise<LeadMagnetIdea | null> => {
  const ai = getAI();
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

  const response = await ai.models.generateContent({
    model: 'gemini-flash-lite-latest',
    contents: fullPrompt,
    config: {
      systemInstruction: PT_BIZ_SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
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
    }
  });

  try {
    return JSON.parse(response.text || 'null');
  } catch (e) {
    return null;
  }
};

export const generateLeadMagnetContent = async (idea: LeadMagnetIdea, brandContext?: BrandContext): Promise<LeadMagnetContent | null> => {
  const ai = getAI();
  const brandPrompt = brandContext ? `
    STRICT BRAND ADHERENCE:
    - Target Tone: ${brandContext.tonality}
    - Formatting/Styling Rules: ${brandContext.styling}
    - Key Messaging: ${brandContext.styleNotes}
  ` : "";

  const fullPrompt = `${CONTENT_PROMPT(idea)}\n\n${brandPrompt}`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: fullPrompt,
    config: {
      systemInstruction: PT_BIZ_SYSTEM_INSTRUCTION,
      thinkingConfig: { thinkingBudget: 32768 },
      responseMimeType: "application/json",
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
    }
  });

  try {
    return JSON.parse(response.text || '{}');
  } catch (e) {
    return null;
  }
};

export const analyzeHubspotData = async (rawContent: string, brandContext?: BrandContext): Promise<HubspotAnalysis | null> => {
  const ai = getAI();
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

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: {
      systemInstruction: PT_BIZ_SYSTEM_INSTRUCTION,
      thinkingConfig: { thinkingBudget: 32768 },
      responseMimeType: "application/json",
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
    }
  });

  try {
    return JSON.parse(response.text || '{}');
  } catch (e) {
    return null;
  }
};
