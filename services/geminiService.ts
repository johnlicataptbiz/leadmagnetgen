
import { PT_BIZ_SYSTEM_INSTRUCTION, SUGGESTION_PROMPT, CONTENT_PROMPT } from "../constants";
import { LeadMagnetIdea, LeadMagnetContent, HubspotAnalysis, BrandContext } from "../types";

/**
 * PROXY MODE: Securely call Vercel Backend
 * This avoids bundling the Google SDK in the frontend, which triggers browser security warnings
 * and makes the application more robust.
 */
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

  const prompt = `Perform a deep clinical and stylistic scan of this document: "${fileName}".
  
  EXTRACTION RULES:
  1. TONALITY: Describe the specific voice (e.g., "Gritty, direct, avoids fluff").
  2. STYLING: Identify layout rules (e.g., "Uses numbered gameplans, prefers bold hooks").
  3. COLORS: Identify primary, secondary, and accent colors.
  4. NOTES: Extract specific jargon or rules.
  
  CONTENT:
  ${rawContent.substring(0, 30000)}`;

  parts.push({ text: prompt });

  const payload = {
    systemInstruction: PT_BIZ_SYSTEM_INSTRUCTION,
    parts: action === 'multimodal' ? parts : [{ text: prompt }],
    prompt: action === 'text' ? prompt : undefined,
    responseSchema: {
      type: "object",
      properties: {
        colors: {
          type: "object",
          properties: {
            primary: { type: "string" },
            secondary: { type: "string" },
            accent: { type: "string" }
          },
          required: ["primary", "secondary", "accent"]
        },
        tonality: { type: "string" },
        styling: { type: "string" },
        styleNotes: { type: "string" }
      },
      required: ["colors", "tonality", "styling", "styleNotes"]
    }
  };

  try {
    return await callAIProxy(action, payload);
  } catch (e) {
    console.error("AI Analysis Failed", e);
    return {
      tonality: "Analysis unavailable.",
      styling: "Analysis unavailable.",
      styleNotes: "Error communicating with AI engine."
    };
  }
};

export const getLeadMagnetSuggestions = async (topic: string, brandContext?: BrandContext): Promise<LeadMagnetIdea[]> => {
  const brandPrompt = brandContext ? `Tone: ${brandContext.tonality}\nStyle: ${brandContext.styling}` : "";
  const fullPrompt = `${SUGGESTION_PROMPT(topic)}\n\n${brandPrompt}`;

  const payload = {
    systemInstruction: PT_BIZ_SYSTEM_INSTRUCTION,
    prompt: fullPrompt,
    responseSchema: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          hook: { type: "string" },
          outline: { type: "array", items: { type: "string" } },
          rationale: { type: "string" },
        },
        required: ["id", "title", "hook", "outline", "rationale"]
      }
    }
  };

  try {
    return await callAIProxy('text', payload);
  } catch (e) {
    console.error("Failed to fetch lead magnet suggestions", e);
    const message = e instanceof Error ? e.message : "Failed to fetch lead magnet suggestions";
    throw new Error(message);
  }
};

export const getSingleLeadMagnetSuggestion = async (topic: string, existingTitles: string[], brandContext?: BrandContext): Promise<LeadMagnetIdea | null> => {
  const brandPrompt = brandContext
    ? `Tone: ${brandContext.tonality}\nStyle: ${brandContext.styling}\nNotes: ${brandContext.styleNotes}`
    : "";
  const exclusions = existingTitles.length
    ? `Avoid titles that are similar to: ${existingTitles.join('; ')}.`
    : "";
  const fullPrompt = `Generate ONE unique lead magnet idea for: "${topic}".\n${exclusions}\n${brandPrompt}\nReturn a fresh angle that does not overlap with the excluded titles.`;

  const payload = {
    systemInstruction: PT_BIZ_SYSTEM_INSTRUCTION,
    prompt: fullPrompt,
    responseSchema: {
      type: "object",
      properties: {
        id: { type: "string" },
        title: { type: "string" },
        hook: { type: "string" },
        outline: { type: "array", items: { type: "string" } },
        rationale: { type: "string" },
      },
      required: ["id", "title", "hook", "outline", "rationale"]
    }
  };

  try {
    return await callAIProxy('text', payload);
  } catch (e) {
    console.error("Failed to refresh a lead magnet suggestion", e);
    const message = e instanceof Error ? e.message : "Failed to refresh a lead magnet suggestion";
    throw new Error(message);
  }
};

export const generateLeadMagnetContent = async (idea: LeadMagnetIdea, brandContext?: BrandContext): Promise<LeadMagnetContent | null> => {
  const fullPrompt = `${CONTENT_PROMPT(idea)}`;

  const payload = {
    systemInstruction: PT_BIZ_SYSTEM_INSTRUCTION,
    prompt: fullPrompt,
    responseSchema: {
      type: "object",
      properties: {
        title: { type: "string" },
        subtitle: { type: "string" },
        introduction: { type: "string" },
        sections: {
          type: "array",
          items: {
            type: "object",
            properties: {
              heading: { type: "string" },
              content: { type: "string" },
              type: { type: "string" },
              items: { type: "array", items: { type: "string" } }
            },
            required: ["heading", "content", "type"]
          }
        },
        conclusion: { type: "string" },
        cta: { type: "string" },
      },
      required: ["title", "subtitle", "introduction", "sections", "conclusion", "cta"]
    }
  };

  try {
    return await callAIProxy('text', payload);
  } catch (e) {
    console.error("Failed to generate lead magnet content", e);
    const message = e instanceof Error ? e.message : "Failed to generate lead magnet content";
    throw new Error(message);
  }
};

export const analyzeHubspotData = async (rawContent: string, brandContext?: BrandContext): Promise<HubspotAnalysis | null> => {
  const prompt = `Analyze HubSpot Data: ${rawContent}`;

  const payload = {
    systemInstruction: PT_BIZ_SYSTEM_INSTRUCTION,
    prompt: prompt,
    responseSchema: {
      type: "object",
      properties: {
        summary: { type: "string" },
        whatIsWorking: { type: "array", items: { type: "string" } },
        whatIsNotWorking: { type: "array", items: { type: "string" } },
        strategicSuggestions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              title: { type: "string" },
              hook: { type: "string" },
              outline: { type: "array", items: { type: "string" } },
              rationale: { type: "string" }
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
    const message = e instanceof Error ? e.message : "Failed to analyze HubSpot data";
    throw new Error(message);
  }
};
