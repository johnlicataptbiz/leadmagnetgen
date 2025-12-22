import { PT_BIZ_SYSTEM_INSTRUCTION, SUGGESTION_PROMPT, CONTENT_PROMPT } from "../constants";
import { LeadMagnetIdea, LeadMagnetContent, HubspotAnalysis, BrandContext, SmartMarketReport } from "../types";

const marketReportToPrompt = (report?: SmartMarketReport | null) => {
  if (!report) return "";
  const kpis = (report.kpis || []).slice(0, 10).map(k => `- ${k.label}: ${k.value}${k.note ? ` (${k.note})` : ""}`).join("\n");
  const insights = (report.insights || []).slice(0, 8).map(i => `- ${i}`).join("\n");
  const cautions = (report.cautions || []).slice(0, 5).map(c => `- ${c.caution} (Action: ${c.action})`).join("\n");

  return `Market Intelligence (auto-generated dashboard):
Title: ${report.title}
Summary: ${report.summary}
KPIs:
${kpis || "- (none)"}
Insights:
${insights || "- (none)"}
Cautions:
${cautions || "- (none)"}`;
};

/**
 * PROXY MODE: Securely call Vercel Backend
 * This avoids bundling the Google SDK in the frontend, which triggers browser security warnings
 * and makes the application more robust.
 */
const callAIProxy = async (action: 'text' | 'multimodal' | 'image' | 'analyze', payload: any) => {
  const response = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, payload })
  });
  
  if (!response.ok) {
    let errorMsg = "Server failed to process AI request";
    try {
      const err = await response.json();
      errorMsg = err.error || errorMsg;
      if (response.status === 504) errorMsg = "The analysis timed out. Your data might be too complex for a single pass—try uploading fewer files.";
    } catch (e) {
      if (response.status === 504) errorMsg = "The analysis timed out. Try uploading fewer files.";
    }
    console.error("AI Proxy Error:", errorMsg);
    throw new Error(errorMsg);
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
  3. COLORS: Identify primary, secondary, and accent colors. ALWAYS return valid HEX codes (e.g. #000000), NEVER color names.
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
    throw e;
  }
};

export const getLeadMagnetSuggestions = async (topic: string, brandContext?: BrandContext, marketReport?: SmartMarketReport | null): Promise<LeadMagnetIdea[]> => {
  const brandPrompt = brandContext ? `Tone: ${brandContext.tonality}\nStyle: ${brandContext.styling}` : "";
  const marketPrompt = marketReportToPrompt(marketReport);
  const fullPrompt = `${SUGGESTION_PROMPT(topic)}\n\n${brandPrompt}\n\n${marketPrompt}`;

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

export const getSingleLeadMagnetSuggestion = async (topic: string, existingTitles: string[], brandContext?: BrandContext, marketReport?: SmartMarketReport | null): Promise<LeadMagnetIdea | null> => {
  const brandPrompt = brandContext
    ? `Tone: ${brandContext.tonality}\nStyle: ${brandContext.styling}\nNotes: ${brandContext.styleNotes}`
    : "";
  const marketPrompt = marketReportToPrompt(marketReport);
  const exclusions = existingTitles.length
    ? `Avoid titles that are similar to: ${existingTitles.join('; ')}.`
    : "";
  const fullPrompt = `Generate ONE unique lead magnet idea for: "${topic}".\n${exclusions}\n${brandPrompt}\n\n${marketPrompt}\nReturn a fresh angle that does not overlap with the excluded titles and uses market data when relevant.`;

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

export const generateLeadMagnetContent = async (idea: LeadMagnetIdea, brandContext?: BrandContext, marketReport?: SmartMarketReport | null): Promise<LeadMagnetContent | null> => {
  const brandPrompt = brandContext
    ? `Brand Context:\nTone: ${brandContext.tonality}\nStyle: ${brandContext.styling}\nNotes: ${brandContext.styleNotes}`
    : "";
  const marketPrompt = marketReportToPrompt(marketReport);
  const fullPrompt = `${CONTENT_PROMPT(idea)}\n\n${brandPrompt}\n\n${marketPrompt}`;

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
  const brandPrompt = brandContext
    ? `Brand Context:\nTone: ${brandContext.tonality}\nStyle: ${brandContext.styling}\nNotes: ${brandContext.styleNotes}`
    : "";
  const prompt = `Analyze HubSpot Data: ${rawContent}\n\n${brandPrompt}`;

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

export const generateSmartMarketReport = async (
  reports: Array<{
    name: string;
    headers: string[];
    rowCount: number;
    sampleCsv: string;
    numericColumnStats?: Record<string, { sum: number; max: number; min: number }>;
  }>,
  brandContext?: BrandContext
): Promise<SmartMarketReport | null> => {
  const brandPrompt = brandContext
    ? `Brand Context:\nTone: ${brandContext.tonality}\nStyle: ${brandContext.styling}\nNotes: ${brandContext.styleNotes}`
    : "";

  const prompt = `You are a data analyst for a marketing team. You will receive multiple HubSpot CSV exports (different schemas).
Your job: produce ONE unified "Smart Market Report" that cross-references all reports and suggests clear dashboard visuals.

Rules:
- Infer what each report represents from column names (pages/campaigns/forms/sources/etc).
- Cross-reference reports when possible (e.g., same URL/title/campaign appearing in multiple exports).
- IDENTIFY AND SELECT THE TOP 10 MOST IMPACTFUL KPIs. Prioritize metrics that reveal high-level strategic insights rather than simple row counts.
- KPI LABELS MUST BE ULTRA-SPECIFIC: Never use vague, abbreviated, or generic labels (e.g., avoid "Manual", "Total", "Count").
- Use the FULL name of the campaign, form, or asset when naming a KPI (e.g., "Cash Basis Field Manual Leads" instead of "Manual Leads").
- Ensure the label clearly states WHAT is being measured and for WHICH specific asset/campaign (e.g. "Conversion Rate: [Form Name]").
- Differentiate between manual processes and specific named assets (guides/manuals). If a metric refers to a 'Manual' as a document, include its full title.
- For each KPI, include an insightful note explaining its strategic significance.
- Prefer actionable insights for marketing decisions.
- If data is incomplete/ambiguous, call it out in cautions and provide a specific, remedial ACTION step.
- ALWAYS include at least 2 charts. 
- FOR CHARTS: Prioritize using the provided "Numeric stats (sum/min/max)" to create comparisons across different files or categories.
- Each chart MUST have a 'series' with at least 5-10 'points' to ensure the visual is meaningful.
- Output charts with small, readable datasets (top 8-10 items).
- If a chart compares files, use the file names as X-axis labels.

DATA (each report includes headers + a CSV sample):
${reports
  .map((r, idx) => {
    const stats = r.numericColumnStats
      ? `Numeric stats (sum/min/max): ${JSON.stringify(r.numericColumnStats)}`
      : "";
    return `\n--- REPORT ${idx + 1}: ${r.name} ---\nRowCount: ${r.rowCount}\nHeaders: ${r.headers.join(
      " | "
    )}\n${stats}\nSample:\n${r.sampleCsv.substring(0, 4000)}`;
  })
  .join("\n")}

${brandPrompt}
`;

  const payload = {
    systemInstruction: PT_BIZ_SYSTEM_INSTRUCTION,
    prompt,
    responseSchema: {
      type: "object",
      properties: {
        title: { type: "string" },
        summary: { type: "string" },
        kpis: {
          type: "array",
          items: {
            type: "object",
            properties: {
              label: { type: "string" },
              value: { type: "string" },
              note: { type: "string" }
            },
            required: ["label", "value"]
          }
        },
        insights: { type: "array", items: { type: "string" } },
        charts: {
          type: "array",
          items: {
            type: "object",
            properties: {
              type: { type: "string" },
              title: { type: "string" },
              xLabel: { type: "string" },
              yLabel: { type: "string" },
              note: { type: "string" },
              series: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    points: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          x: { type: "string" },
                          y: { type: "number" }
                        },
                        required: ["x", "y"]
                      }
                    }
                  },
                  required: ["name", "points"]
                }
              },
              columns: { type: "array", items: { type: "string" } },
              rows: {
                type: "array",
                items: { type: "array", items: { type: "string" } }
              }
            },
            required: ["type", "title"]
          }
        },
        cautions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              caution: { type: "string" },
              action: { type: "string" }
            },
            required: ["caution", "action"]
          }
        }
      },
      required: ["title", "summary", "kpis", "insights", "charts", "cautions"]
    }
  };

  try {
    // Use 'analyze' action to trigger Gemini 1.5 Pro on the backend
    return await callAIProxy("analyze", payload);
  } catch (e) {
    console.error("Failed to generate smart market report", e);
    const message = e instanceof Error ? e.message : "Failed to generate smart market report";
    throw new Error(message);
  }
};
export const generateNanoBananaImage = async (prompt: string, precision: "high" | "standard" = "standard"): Promise<{ url: string } | null> => {
  const payload = {
    prompt: `Generate a professional, high-fidelity marketing asset for: ${prompt}. Style: Clean, modern, business-oriented. No text, focus on concept.`,
    precision,
    resolution: "ultra"
  };

  try {
    return await callAIProxy("image", payload);
  } catch (e) {
    console.error("Nano Banana Image Generation Failed", e);
    return null;
  }
};
