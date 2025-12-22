
import { Type } from "@google/genai";
import { PT_BIZ_SYSTEM_INSTRUCTION, SUGGESTION_PROMPT, CONTENT_PROMPT } from "../constants";
import { LeadMagnetIdea, LeadMagnetContent, HubspotAnalysis, BrandContext } from "../types";

// PROXY MODE: Securely call Vercel Backend
const callAIProxy = async (action: 'text' | 'multimodal', payload: any) => {
  const response = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, payload })
  });
  
  if (!response.ok) {
    const err = await response.json();
    console.error("AI Proxy Error:", err);
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

  const prompt = `SCANNING NEW ASSET: "${fileName}"
  
  TASK: Perform a deep clinical and stylistic scan of this document. 
  
  EXTRACTION RULES:
  1. TONALITY: Describe the specific voice (e.g., "Gritty, direct, avoids fluff").
  2. STYLING: Identify layout rules (e.g., "Uses numbered gameplans, prefers bold hooks").
  3. COLORS: Even if this is a text document, identify any brand colors mentioned or implied.
  4. LOGO: If described in the text, extract the description into styleNotes.
  
  CONTENT FOR ANALYSIS:
  """
  ${rawContent.substring(0, 30000)}
  """`;

  parts.push({ text: prompt });

  const payload = {
    systemInstruction: PT_BIZ_SYSTEM_INSTRUCTION,
    parts: action === 'multimodal' ? parts : [{ text: prompt }],
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
    console.error("AI Analysis Failed", e);
    return {
      tonality: "Manual verification required.",
      styling: "Failed to parse layout rules automatically.",
      styleNotes: "The AI encountered an error reading this specific file type."
    };
  }
};

export const getLeadMagnetSuggestions = async (topic: string, brandContext?: BrandContext): Promise<LeadMagnetIdea[]> => {
  const brandPrompt = brandContext ? `
    BRAND MEMORY (MUST MIMIC):
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
    console.error("Suggestions Failed", e);
    return [];
  }
};

export const getSingleLeadMagnetSuggestion = async (topic: string, existingTitles: string[], brandContext?: BrandContext): Promise<LeadMagnetIdea | null> => {
  const brandPrompt = brandContext ? `
    ACTING AS PT BIZ ARCHITECT:
    - Tone: ${brandContext.tonality}
    - Style: ${brandContext.styling}
  ` : "";

  const fullPrompt = `Generate ONE unique lead magnet idea for: "${topic}".
  CRITICAL: Do NOT use existing titles: ${existingTitles.join(', ')}.
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
    return null;
  }
};

export const generateLeadMagnetContent = async (idea: LeadMagnetIdea, brandContext?: BrandContext): Promise<LeadMagnetContent | null> => {
  const brandPrompt = brandContext ? `
    EVOLVE THIS BRAND DNA:
    - Tonality: ${brandContext.tonality}
    - Layout Patterns: ${brandContext.styling}
    - Nuances: ${brandContext.styleNotes}
    - Colors: ${brandContext.colors.primary}, ${brandContext.colors.secondary}
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
    return null;
  }
};

export const analyzeHubspotData = async (rawContent: string, brandContext?: BrandContext): Promise<HubspotAnalysis | null> => {
  const prompt = `Perform strategic analysis on this HubSpot report.
  Data: """${rawContent}"""
  ${brandContext ? `Context: ${brandContext.tonality}` : ""}`;

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
    return null;
  }
};
