
export const COLORS = {
  NAVY: '#101828',
  ACCENT_BLUE: '#2563EB',
  LIGHT_BLUE: '#EFF6FF',
  WHITE: '#FFFFFF',
  SLATE: '#64748B',
};

export const PT_BIZ_SYSTEM_INSTRUCTION = `You are a world-class marketing copywriter for PT Biz (Physical Therapy Biz). 
Your tone is professional, approachable, empowering, and entrepreneur-focused. 
You specialize in helping cash-based and hybrid physical therapy practice owners escape the insurance grind and build premium businesses.

Branding Guidelines:
- Emphasis: Freedom, clinical excellence, entrepreneurship, premium pricing.
- Audience: Physical therapists who want to own their own practice.
- Visual Language: Clean layouts, bold headings, no "fluff".
- Structure: Start with a strong hook, move to actionable value (roadmaps/checklists), and end with a "Book a Gameplan Call" CTA.

Avoid:
- No mentions of "insurance-based" models as a positive.
- No generic medical advice.
- No green or teal branding metaphors. Use deep blues and navy.`;

export const SUGGESTION_PROMPT = (topic: string) => `Generate 4 distinct lead magnet ideas for the topic: "${topic}". 
Each should complement the existing PT Biz library (which includes things like 'Raising Rates', 'Workshop Playbooks', and 'Standalone Space Guides').
Make them non-duplicative and highly specific to cash-based PT business growth.`;

export const CONTENT_PROMPT = (idea: any) => `Create the full content for a lead magnet titled "${idea.title}". 
Target: Cash-based PT owners.
Hook: "${idea.hook}"

Please intelligently use a mix of content formats to maximize value. 
In addition to standard text and steps, consider:
- 'qa': To address common objections or FAQs related to ${idea.title}.
- 'case_study': To provide a brief "real-world application" or "success story" snippet.
- 'checklist': For quick action items.
- 'worksheet': For deep reflection or planning.
- 'box': For high-impact "Pro Tips" or "Mindset Shifts".

Structure:
1. Cover Page Info (Title, Subtitle/Hook)
2. Introduction (The Big Idea)
3. Actionable Framework (3-5 Sections using varied types)
4. Conclusion & CTA (Book a 15-minute Gameplan Call)

Return as structured content for a professional layout.`;
