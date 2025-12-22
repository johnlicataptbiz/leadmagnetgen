
export interface LeadMagnetIdea {
  id: string;
  title: string;
  hook: string;
  outline: string[];
  rationale: string;
}

export interface LeadMagnetContent {
  title: string;
  subtitle: string;
  introduction: string;
  sections: Array<{
    heading: string;
    content: string;
    type: 'text' | 'checklist' | 'worksheet' | 'steps' | 'box' | 'qa' | 'case_study';
    items?: string[];
  }>;
  conclusion: string;
  cta: string;
}

export interface ArchiveItem {
  id: string;
  date: string;
  content: LeadMagnetContent;
  brandContext: BrandContext;
}

export interface HubspotAnalysis {
  summary: string;
  whatIsWorking: string[];
  whatIsNotWorking: string[];
  strategicSuggestions: LeadMagnetIdea[];
}

export interface BrandColors {
  primary: string;
  secondary: string;
  accent: string;
}

export interface BrandContext {
  logoUrl?: string;
  colors: BrandColors;
  tonality: string;
  styling: string;
  styleNotes: string;
  referenceDocNames: string[];
}

export type AppStep = 'input' | 'suggestions' | 'generating' | 'preview' | 'archive' | 'insights' | 'branding';
