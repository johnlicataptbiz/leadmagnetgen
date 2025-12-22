
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

export type SmartChartType = 'bar' | 'line' | 'table';

export interface SmartChartSeries {
  name: string;
  points: Array<{ x: string; y: number }>;
}

export interface SmartChart {
  type: SmartChartType;
  title: string;
  xLabel?: string;
  yLabel?: string;
  series?: SmartChartSeries[];
  columns?: string[];
  rows?: string[][];
  note?: string;
}

export interface SmartKpi {
  label: string;
  value: string;
  note?: string;
}

export interface SmartMarketReport {
  title: string;
  summary: string;
  kpis: SmartKpi[];
  insights: string[];
  charts: SmartChart[];
  cautions?: Array<{ caution: string; action: string }>;
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
