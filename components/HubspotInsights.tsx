
import React, { useState, useRef, useEffect } from 'react';
import { HubspotAnalysis, LeadMagnetIdea, BrandContext } from '../types';
import { analyzeHubspotData } from '../services/geminiService';

interface HubspotInsightsProps {
  brandContext?: BrandContext;
  analysis?: HubspotAnalysis | null;
  onAnalysisComplete: (analysis: HubspotAnalysis) => void;
  onSelectIdea: (idea: LeadMagnetIdea) => void;
}

type CsvRow = Record<string, string>;

const normalizeHeader = (h: string) => h.toLowerCase().replace(/[^a-z0-9]+/g, '');

const parseNumber = (value: string): number | null => {
  if (!value) return null;
  const cleaned = value.replace(/[$,%]/g, '').replace(/,/g, '').trim();
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
};

const parseCsv = (text: string): { headers: string[]; rows: CsvRow[] } => {
  const rows: string[][] = [];
  let currentField = '';
  let currentRow: string[] = [];
  let inQuotes = false;

  const pushField = () => {
    currentRow.push(currentField);
    currentField = '';
  };
  const pushRow = () => {
    // Ignore trailing empty lines
    if (currentRow.length === 1 && currentRow[0].trim() === '' && rows.length > 0) return;
    rows.push(currentRow);
    currentRow = [];
  };

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = i + 1 < text.length ? text[i + 1] : '';
    if (ch === '"') {
      if (inQuotes && next === '"') {
        currentField += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (!inQuotes && ch === ',') {
      pushField();
      continue;
    }
    if (!inQuotes && (ch === '\n' || ch === '\r')) {
      // Handle CRLF
      if (ch === '\r' && next === '\n') i += 1;
      pushField();
      pushRow();
      continue;
    }
    currentField += ch;
  }
  pushField();
  if (currentRow.length) pushRow();

  const headers = (rows[0] || []).map(h => h.trim());
  const dataRows = rows.slice(1).filter(r => r.some(v => v.trim() !== ''));
  const mapped: CsvRow[] = dataRows.map((r) => {
    const row: CsvRow = {};
    headers.forEach((h, idx) => {
      row[h] = (r[idx] ?? '').trim();
    });
    return row;
  });

  return { headers, rows: mapped };
};

const pickColumn = (headers: string[], candidates: string[]): string | null => {
  const normalized = headers.map(h => ({ raw: h, n: normalizeHeader(h) }));
  for (const c of candidates) {
    const target = normalizeHeader(c);
    const found = normalized.find(h => h.n === target) || normalized.find(h => h.n.includes(target));
    if (found) return found.raw;
  }
  return null;
};

const getTop = <T,>(items: T[], count: number) => items.slice(0, count);

const BarRow: React.FC<{ label: string; value: number; max: number; colorClass: string; suffix?: string }> = ({ label, value, max, colorClass, suffix }) => {
  const width = max > 0 ? Math.max(2, (value / max) * 100) : 0;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold text-slate-700 truncate max-w-[70%]">{label}</span>
        <span className="font-mono text-slate-500">{value.toLocaleString()}{suffix || ''}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full ${colorClass}`} style={{ width: `${Math.min(100, width)}%` }}></div>
      </div>
    </div>
  );
};

const HubspotInsights: React.FC<HubspotInsightsProps> = ({ brandContext, analysis: initialAnalysis, onAnalysisComplete, onSelectIdea }) => {
  const breezePrompt =
    'Create HubSpot AI report: Pages performance last 30 days. Columns: Page URL (or Page title), Sessions (or Visits), Conversions (New contacts or Form submissions). Include all rows. Export as CSV.';
  const hubspotPagesReportUrl =
    'https://app.hubspot.com/reports-list/22001532/templates/marketing/pages?config=JTdCJTIyY3VzdG9taXplZCUyMiUzQWZhbHNlJTJDJTIycHJvY2Vzc29ycyUyMiUzQSU1QiU1RCUyQyUyMm1ldHJpY3MlMjIlM0ElNUIlN0IlMjJwcm9wZXJ0eSUyMiUzQSUyMnJhd1ZpZXdzJTIyJTJDJTIybWV0cmljVHlwZXMlMjIlM0ElNUIlMjJTVU0lMjIlNUQlMkMlMjJwZXJjZW50aWxlcyUyMiUzQSU1QiU1RCU3RCU1RCUyQyUyMmRhdGFUeXBlJTIyJTNBJTIyQU5BTFlUSUNTX0FMTF9QQUdFUyUyMiUyQyUyMmNvbXBhcmUlMjIlM0FudWxsJTJDJTIydW5pZmllZEV2ZW50JTIyJTNBbnVsbCUyQyUyMmV4dGVybmFsRGF0YVR5cGVTb3VyY2UlMjIlM0FudWxsJTJDJTIydW5pZmllZEV2ZW50VHlwZU5hbWUlMjIlM0FudWxsJTJDJTIyZGltZW5zaW9ucyUyMiUzQSU1QiUyMmJyZWFrZG93biUyMiU1RCUyQyUyMmdlbmVyYXRlZCUyMiUzQWZhbHNlJTJDJTIyZXZlbnRGdW5uZWwlMjIlM0FudWxsJTJDJTIyb2JqZWN0VHlwZUlkJTIyJTNBbnVsbCUyQyUyMnRlbXBsYXRlJTIyJTNBbnVsbCUyQyUyMmxpbWl0JTIyJTNBbnVsbCUyQyUyMmZpbHRlcnMlMjIlM0ElN0IlMjJkYXRlUmFuZ2UlMjIlM0ElN0IlMjJwcm9wZXJ0eSUyMiUzQSUyMnNlc3Npb25EYXRlJTIyJTJDJTIydmFsdWUlMjIlM0ElN0IlMjJyYW5nZVR5cGUlMjIlM0ElMjJST0xMSU5HJTIyJTJDJTIyc3RhcnREYXRlJTIyJTNBJTIyMjAyNC0wMS0zMSUyMiUyQyUyMmVuZERhdGUlMjIlM0ElMjIyMDI0LTAyLTI5JTIyJTJDJTIycm9sbGluZ0RhdGVzJTIyJTNBbnVsbCUyQyUyMnJvbGxpbmdEYXlzJTIyJTNBMzAlMkMlMjJkYXRlJTIyJTNBbnVsbCUyQyUyMmVudGlyZUN1cnJlbnRVbml0JTIyJTNBdHJ1ZSU3RCUyQyUyMnVzZUZpc2NhbFllYXIlMjIlM0FmYWxzZSU3RCUyQyUyMm93bmVycyUyMiUzQSU1QiU1RCUyQyUyMnRlYW1zJTIyJTNBJTVCJTVEJTJDJTIyY3VzdG9tJTIyJTNBJTVCJTVEJTdEJTJDJTIyZnJlcXVlbmN5JTIyJTNBbnVsbCUyQyUyMmNvbmZpZ1R5cGUlMjIlM0ElMjJBR0dSRUdBVElPTiUyMiUyQyUyMnNvcnQlMjIlM0ElNUIlNUQlN0Q%3D&displayParams=JTdCJTIyc3RhY2tlZCUyMiUzQXRydWUlMkMlMjJoaWRlRGF0YUxhYmVscyUyMiUzQXRydWUlMkMlMjJjb2xvcnMlMjIlM0ElN0IlN0QlMkMlMjJzZXJpZXNPcmRlciUyMiUzQSU3QiUyMnR5cGUlMjIlM0ElMjJyYW5rZWQlMjIlN0QlMkMlMjJhbGxvd0RyaWxsZG93biUyMiUzQWZhbHNlJTJDJTIyc2FsZXNBbmFseXRpY3MlMjIlM0ElN0IlMjJzdWJBcHBLZXklMjIlM0ElMjJwYWdlcyUyMiU3RCU3RA%3D%3D&chartType=AREA&editors=JTVCJTdCJTIydHlwZSUyMiUzQSUyMkRJTUVOU0lPTiUyMiUyQyUyMnByb3BlcnRpZXMlMjIlM0ElNUIlMjJzZXNzaW9uRGF0ZSUyMiUyQyUyMmJyZWFrZG93biUyMiU1RCU3RCUyQyU3QiUyMnR5cGUlMjIlM0ElMjJCUkVBS0RPV04lMjIlMkMlMjJwcm9wZXJ0aWVzJTIyJTNBJTVCJTIyYnJlYWtkb3duJTIyJTVEJTdEJTJDJTdCJTIydHlwZSUyMiUzQSUyMk1FVFJJQyUyMiUyQyUyMm1ldHJpY3MlMjIlM0ElNUIlMjJTVU0lN0NyYXdWaWV3cyUyMiUyQyUyMlNVTSU3Q3N1Ym1pc3Npb25zJTIyJTJDJTIyU1VNJTdDY29udGFjdHMlMjIlMkMlMjJTVU0lN0NjdXN0b21lcnMlMjIlMkMlMjJQRVJDRU5USUxFUyU3Q3N1Ym1pc3Npb25zUGVyUGFnZXZpZXclMjIlMkMlMjJQRVJDRU5USUxFUyU3Q2NvbnRhY3RzUGVyUGFnZXZpZXclMjIlMkMlMjJQRVJDRU5USUxFUyU3Q2N1c3RvbWVyc1BlclBhZ2V2aWV3JTIyJTJDJTIyUEVSQ0VOVElMRVMlN0Njb250YWN0VG9DdXN0b21lclJhdGUlMjIlMkMlMjJTVU0lN0NlbnRyYW5jZXMlMjIlMkMlMjJTVU0lN0NleGl0cyUyMiUyQyUyMlBFUkNFTlRJTEVTJTdDdGltZVBlclBhZ2V2aWV3JTIyJTJDJTIyUEVSQ0VOVElMRVMlN0NwYWdlQm91bmNlUmF0ZSUyMiUyQyUyMlBFUkNFTlRJTEVTJTdDZXhpdHNQZXJQYWdldmlldyUyMiUyQyUyMlNVTSU3Q2N0YVZpZXdzJTIyJTJDJTIyU1VNJTdDY3RhQ2xpY2tzJTIyJTJDJTIyU1VNJTdDYW1wVmlld3MlMjIlMkMlMjJQRVJDRU5USUxFUyU3Q2N0YVJhdGUlMjIlNUQlN0QlMkMlN0IlMjJ0eXBlJTIyJTNBJTIyT1ZFUlRJTUVfVE9UQUxTJTIyJTdEJTJDJTdCJTIydHlwZSUyMiUzQSUyMlRBQkxFX01FVFJJQyUyMiUyQyUyMm1ldHJpY3MlMjIlM0ElNUIlMjJTVU0lN0NyYXdWaWV3cyUyMiUyQyUyMlNVTSU3Q3N1Ym1pc3Npb25zJTIyJTJDJTIyU1VNJTdDY29udGFjdHMlMjIlMkMlMjJTVU0lN0NjdXN0b21lcnMlMjIlMkMlMjJQRVJDRU5USUxFUyU3Q3N1Ym1pc3Npb25zUGVyUGFnZXZpZXclMjIlMkMlMjJQRVJDRU5USUxFUyU3Q2NvbnRhY3RzUGVyUGFnZXZpZXclMjIlMkMlMjJQRVJDRU5USUxFUyU3Q2N1c3RvbWVyc1BlclBhZ2V2aWV3JTIyJTJDJTIyUEVSQ0VOVElMRVMlN0Njb250YWN0VG9DdXN0b21lclJhdGUlMjIlMkMlMjJTVU0lN0NlbnRyYW5jZXMlMjIlMkMlMjJTVU0lN0NleGl0cyUyMiUyQyUyMlBFUkNFTlRJTEVTJTdDdGltZVBlclBhZ2V2aWV3JTIyJTJDJTIyUEVSQ0VOVElMRVMlN0NwYWdlQm91bmNlUmF0ZSUyMiUyQyUyMlBFUkNFTlRJTEVTJTdDZXhpdHNQZXJQYWdldmlldyUyMiUyQyUyMlNVTSU3Q2N0YVZpZXdzJTIyJTJDJTIyU1VNJTdDY3RhQ2xpY2tzJTIyJTJDJTIyU1VNJTdDYW1wVmlld3MlMjIlMkMlMjJQRVJDRU5USUxFUyU3Q2N0YVJhdGUlMjIlMkMlMjJDT1VOVCU3Q0NSRUFURURfVElNRVNUQU1QJTIyJTJDJTIyQ09VTlQlN0NQVUJMSVNIRURfVElNRVNUQU1QJTIyJTJDJTIyQ09VTlQlN0NQVUJMSVNIX1NUQVRVU19JRCUyMiUyQyUyMkNPVU5UJTdDRE9NQUlOX0lEJTIyJTJDJTIyQ09VTlQlN0NDT05URU5UX0dST1VQX0lEJTIyJTJDJTIyQ09VTlQlN0NCTE9HX0FVVEhPUl9JRCUyMiUyQyUyMkNPVU5UJTdDTEFOR1VBR0UlMjIlMkMlMjJDT1VOVCU3Q1VSTCUyMiUyQyUyMkNPVU5UJTdDSFRNTF9USVRMRSUyMiUyQyUyMkNPVU5UJTdDQ09OVEVOVF9UWVBFX0NPREUlMjIlMkMlMjJDT1VOVCU3Q1RBR19JRFMlMjIlNUQlMkMlMjJzZWxlY3RlZE1ldHJpY3MlMjIlM0ElNUIlNUQlN0QlNUQ%3D&dateRange=JTdCJTIycmFuZ2VUeXBlJTIyJTNBJTIyUk9MTElORyUyMiUyQyUyMnN0YXJ0RGF0ZSUyMiUzQSUyMjIwMjQtMDEtMzElMjIlMkMlMjJlbmREYXRlJTIyJTNBJTIyMjAyNC0wMi0yOSUyMiUyQyUyMnJvbGxpbmdEYXRlcyUyMiUzQW51bGwlMkMlMjJyb2xsaW5nRGF5cyUyMiUzQTMwJTJDJTIyZGF0ZSUyMiUzQW51bGwlMkMlMjJlbnRpcmVDdXJyZW50VW5pdCUyMiUzQXRydWUlN0Q%3D&configType=AGGREGATION&dimensions=breakdown&metrics=JTVCJTdCJTIycHJvcGVydHklMjIlM0ElMjJyYXdWaWV3cyUyMiUyQyUyMm1ldHJpY1R5cGVzJTIyJTNBJTVCJTIyU1VNJTIyJTVEJTJDJTIycGVyY2VudGlsZXMlMjIlM0ElNUIlNUQlN0QlNUQ%3D';
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<HubspotAnalysis | null>(initialAnalysis || null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<CsvRow[]>([]);
  const [kpis, setKpis] = useState<{ totalSessions: number; totalConversions: number; conversionRate: number; rows: number } | null>(null);
  const [topBySessions, setTopBySessions] = useState<Array<{ label: string; sessions: number; conversions: number; rate: number }>>([]);
  const [topByRate, setTopByRate] = useState<Array<{ label: string; sessions: number; conversions: number; rate: number }>>([]);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialAnalysis) {
      setAnalysis(initialAnalysis);
    }
  }, [initialAnalysis]);

  const computeDashboard = (headers: string[], rows: CsvRow[]) => {
    const labelCol = pickColumn(headers, ['page', 'page title', 'title', 'url', 'page url', 'campaign', 'source', 'name']) || headers[0] || null;
    const sessionsCol = pickColumn(headers, ['sessions', 'visits', 'pageviews', 'views']);
    const conversionsCol = pickColumn(headers, ['submissions', 'conversions', 'contacts', 'new contacts', 'form submissions']);

    const enriched = rows.map((r) => {
      const label = labelCol ? (r[labelCol] || '(unknown)') : '(unknown)';
      const sessions = sessionsCol ? (parseNumber(r[sessionsCol]) ?? 0) : 0;
      const conversions = conversionsCol ? (parseNumber(r[conversionsCol]) ?? 0) : 0;
      const rate = sessions > 0 ? conversions / sessions : 0;
      return { label, sessions, conversions, rate };
    });

    const totalSessions = enriched.reduce((sum, r) => sum + r.sessions, 0);
    const totalConversions = enriched.reduce((sum, r) => sum + r.conversions, 0);
    const conversionRate = totalSessions > 0 ? totalConversions / totalSessions : 0;

    const bySessions = [...enriched].sort((a, b) => b.sessions - a.sessions);
    const byRate = [...enriched]
      .filter(r => r.sessions >= 25)
      .sort((a, b) => b.rate - a.rate);

    setKpis({ totalSessions, totalConversions, conversionRate, rows: rows.length });
    setTopBySessions(getTop(bySessions, 6));
    setTopByRate(getTop(byRate, 6));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setLoading(true);
    setErrorMessage(null);
    setAnalysis(null);
    setCsvHeaders([]);
    setCsvRows([]);
    setKpis(null);
    setTopBySessions([]);
    setTopByRate([]);

    try {
      const text = await file.text();
      const trimmed = text.length > 2_000_000 ? text.substring(0, 2_000_000) : text;
      const parsed = parseCsv(trimmed);
      setCsvHeaders(parsed.headers);
      setCsvRows(parsed.rows);
      computeDashboard(parsed.headers, parsed.rows);
    } catch (e: any) {
      console.error(e);
      setErrorMessage(`Error parsing or analyzing file: ${e.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const generateAI = async () => {
    if (!fileName || csvRows.length === 0) return;
    if (isGeneratingAI) return;
    setIsGeneratingAI(true);
    setErrorMessage(null);
    try {
      // Give the model a compact slice of the raw CSV (headers + first N rows) to stay within limits.
      const headerLine = csvHeaders.join(',');
      const sampleRows = csvRows.slice(0, 200).map(r => csvHeaders.map(h => JSON.stringify(r[h] || '')).join(',')).join('\n');
      const sample = `${headerLine}\n${sampleRows}`;
      const result = await analyzeHubspotData(sample.substring(0, 50000), brandContext);
      if (result) {
        setAnalysis(result);
        onAnalysisComplete(result);
      }
    } catch (e: any) {
      console.error(e);
      setErrorMessage(e.message || 'Failed to generate AI insights.');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const copyBreezePrompt = async () => {
    try {
      await navigator.clipboard.writeText(breezePrompt);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setErrorMessage('Copy failed. Please select the prompt and copy manually.');
    }
  };

  return (
    <div className="space-y-8">
      {errorMessage && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-700 flex items-start justify-between gap-6">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 inline-flex h-2 w-2 rounded-full bg-red-500"></span>
            <div>
              <p className="font-black uppercase text-[10px] tracking-widest text-red-600">AI Error</p>
              <p className="mt-1">{errorMessage}</p>
            </div>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-red-600 font-bold uppercase text-[10px] tracking-widest"
          >
            Dismiss
          </button>
        </div>
      )}
      {!analysis ? (
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-10">
            <div className="flex items-start justify-between gap-6 flex-wrap">
              <div>
                <h2 className="text-2xl font-black heading-font text-slate-900 uppercase">Insights Dashboard</h2>
                <p className="text-slate-500 mt-2 max-w-2xl">
                  Upload a HubSpot CSV to generate a KPI dashboard. Optional: generate AI strategy ideas from your export.
                </p>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 min-w-[320px] flex-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Breeze AI export (recommended)</p>
                <ol className="mt-3 space-y-1.5 text-sm text-slate-700 list-decimal list-inside">
                  <li>HubSpot → <strong>Reports</strong> → <strong>Create report</strong> → <strong>AI-generated report</strong>.</li>
                  <li>Paste prompt → <strong>Generate report</strong>.</li>
                  <li><strong>Export → CSV</strong> and upload here.</li>
                </ol>
                <a
                  href={hubspotPagesReportUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-blue-600 hover:underline"
                >
                  Open the Pages report template
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 3h7v7m0-7L10 14m-4 7h7a2 2 0 002-2v-7" />
                  </svg>
                </a>
                <p className="mt-2 text-[11px] text-slate-500">
                  Works for teammates in this HubSpot portal (22001532) with report access. Other portals should use the same navigation path.
                </p>
                <div className="mt-4 bg-white border border-slate-200 rounded-xl p-4">
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Prompt (≤ 250 chars)</p>
                    <button
                      type="button"
                      onClick={copyBreezePrompt}
                      className="text-xs font-black uppercase tracking-widest text-blue-600 hover:underline"
                    >
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <p className="mt-3 font-mono text-[12px] text-slate-700 whitespace-pre-wrap break-words">
                    {breezePrompt}
                  </p>
                </div>
                <details className="mt-4">
                  <summary className="cursor-pointer text-xs font-black uppercase tracking-widest text-slate-500 hover:text-slate-700">
                    Troubleshooting
                  </summary>
                  <div className="mt-3 space-y-2 text-sm text-slate-700">
                    <p>
                      Your export should include a label column (Page/URL/Title) and traffic (Sessions or Visits/Views/Pageviews). Conversions are optional.
                    </p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>If Sessions show <strong>0</strong>, you likely exported a Forms/Contacts report instead of Pages/Traffic.</li>
                      <li>If “Top by Conversion Rate” is empty, the export is missing Sessions or Conversions, or each row has under 25 sessions.</li>
                    </ul>
                  </div>
                </details>
              </div>
            </div>
            
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 rounded-2xl p-12 hover:border-blue-400 transition cursor-pointer bg-slate-50 group mb-6"
            >
              {loading ? (
                <div className="space-y-4">
                  <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="font-bold text-blue-600 heading-font animate-pulse">Parsing report & building dashboard...</p>
                </div>
              ) : fileName ? (
                <div className="space-y-2">
                  <p className="text-slate-900 font-bold">{fileName}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <svg className="w-16 h-16 text-slate-300 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                  <p className="text-lg font-bold text-slate-700">Drop HubSpot CSV here</p>
                </div>
              )}
              <input type="file" ref={fileInputRef} hidden accept=".csv,.txt" onChange={handleFileUpload} disabled={loading} />
            </div>

            {kpis && (
              <div className="text-left space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white rounded-xl border border-slate-100 p-4">
                    <p className="text-[10px] uppercase tracking-widest text-slate-400">Rows</p>
                    <p className="mt-2 text-2xl font-black heading-font text-slate-900">{kpis.rows.toLocaleString()}</p>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-100 p-4">
                    <p className="text-[10px] uppercase tracking-widest text-slate-400">Sessions</p>
                    <p className="mt-2 text-2xl font-black heading-font text-slate-900">{kpis.totalSessions.toLocaleString()}</p>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-100 p-4">
                    <p className="text-[10px] uppercase tracking-widest text-slate-400">Conversions</p>
                    <p className="mt-2 text-2xl font-black heading-font text-slate-900">{kpis.totalConversions.toLocaleString()}</p>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-100 p-4">
                    <p className="text-[10px] uppercase tracking-widest text-slate-400">Conv. Rate</p>
                    <p className="mt-2 text-2xl font-black heading-font text-slate-900">{(kpis.conversionRate * 100).toFixed(1)}%</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-2xl border border-slate-200 p-6">
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4">Top By Sessions</h3>
                    <div className="space-y-4">
                      {topBySessions.length === 0 ? (
                        <p className="text-sm text-slate-500">Couldn’t find a sessions column in this export.</p>
                      ) : (
                        (() => {
                          const max = topBySessions[0]?.sessions || 0;
                          return topBySessions.map((r, idx) => (
                            <BarRow key={idx} label={r.label} value={r.sessions} max={max} colorClass="bg-blue-600" />
                          ));
                        })()
                      )}
                    </div>
                  </div>
                  <div className="bg-white rounded-2xl border border-slate-200 p-6">
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4">Top By Conversion Rate</h3>
                    <div className="space-y-4">
                      {topByRate.length === 0 ? (
                        <p className="text-sm text-slate-500">Need sessions + conversions columns (and at least 25 sessions per row) to compute rates.</p>
                      ) : (
                        (() => {
                          const max = topByRate[0]?.rate || 0;
                          return topByRate.map((r, idx) => (
                            <BarRow key={idx} label={r.label} value={Number((r.rate * 100).toFixed(1))} max={max * 100} colorClass="bg-green-500" suffix="%" />
                          ));
                        })()
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <p className="text-[11px] text-slate-500">
                    Dashboard is computed locally from the CSV. AI strategy is optional and uses a compact sample of your export.
                  </p>
                  <button
                    onClick={generateAI}
                    disabled={isGeneratingAI}
                    className="px-6 py-3 bg-slate-900 text-white rounded-xl font-black uppercase text-xs tracking-widest disabled:opacity-60"
                  >
                    {isGeneratingAI ? 'Generating AI Insights…' : 'Generate AI Strategy'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-8 animate-fade-in">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-slate-900 text-white p-8 rounded-2xl shadow-xl">
                <h3 className="text-xl font-black heading-font uppercase mb-4 text-blue-400">Analysis Summary</h3>
                <p className="text-slate-300 leading-relaxed italic">"{analysis.summary}"</p>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b pb-2">Performance Mix</h4>
                <div className="mt-4 space-y-4">
                  <div>
                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-500">
                      <span>Working</span>
                      <span>{analysis.whatIsWorking.length}</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full bg-green-500"
                        style={{ width: `${Math.min(100, (analysis.whatIsWorking.length / Math.max(1, analysis.whatIsWorking.length + analysis.whatIsNotWorking.length)) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-500">
                      <span>Needs Work</span>
                      <span>{analysis.whatIsNotWorking.length}</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full bg-red-400"
                        style={{ width: `${Math.min(100, (analysis.whatIsNotWorking.length / Math.max(1, analysis.whatIsWorking.length + analysis.whatIsNotWorking.length)) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Ratio is based on extracted insights from the CSV. Upload a larger range to improve accuracy.
                  </p>
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b pb-2">Winning Themes</h4>
                <ul className="mt-4 space-y-3">
                  {analysis.whatIsWorking.map((w, i) => (
                    <li key={i} className="text-sm text-slate-700 font-medium">● {w}</li>
                  ))}
                </ul>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b pb-2">Friction Points</h4>
                <ul className="mt-4 space-y-3">
                  {analysis.whatIsNotWorking.map((w, i) => (
                    <li key={i} className="text-sm text-slate-700 font-medium">● {w}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-black heading-font text-slate-900 uppercase">Strategic Ideas</h3>
                <button onClick={() => { setAnalysis(null); setFileName(null); }} className="text-blue-600 text-xs font-bold uppercase hover:underline">New Report</button>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-500">Report Snapshot</h4>
                <div className="mt-4 grid grid-cols-2 gap-4 text-sm text-slate-700">
                  <div className="bg-white rounded-xl p-4 border border-slate-100">
                    <p className="text-[10px] uppercase tracking-widest text-slate-400">Themes Identified</p>
                    <p className="mt-2 text-2xl font-black heading-font text-slate-900">{analysis.whatIsWorking.length + analysis.whatIsNotWorking.length}</p>
                  </div>
                  <div className="bg-white rounded-xl p-4 border border-slate-100">
                    <p className="text-[10px] uppercase tracking-widest text-slate-400">Ideas Generated</p>
                    <p className="mt-2 text-2xl font-black heading-font text-slate-900">{analysis.strategicSuggestions.length}</p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {analysis.strategicSuggestions.map((suggestion) => (
                  <div 
                    key={suggestion.id} 
                    className="bg-white p-8 rounded-xl border-2 border-slate-100 hover:border-blue-400 transition cursor-pointer flex flex-col group shadow-lg" 
                    onClick={() => onSelectIdea(suggestion)}
                  >
                    <h4 className="text-xl font-bold text-slate-900 mb-2 heading-font group-hover:text-blue-600 transition leading-tight">{suggestion.title}</h4>
                    <p className="text-sm text-slate-500 italic mb-6">"{suggestion.hook}"</p>
                    <div className="mt-auto pt-6 border-t border-slate-50">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rationale:</p>
                      <p className="text-xs text-slate-700">{suggestion.rationale}</p>
                    </div>
                    <button className="mt-6 w-full py-3 bg-slate-900 text-white rounded font-bold heading-font uppercase text-xs tracking-widest group-hover:bg-blue-600 transition">Build This Resource</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HubspotInsights;
