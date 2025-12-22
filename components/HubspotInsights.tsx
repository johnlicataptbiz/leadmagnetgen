
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
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="bg-orange-50 border-b border-orange-100 p-6 flex items-center space-x-4">
              <div className="w-12 h-12 bg-orange-500 text-white rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.8,11c-0.4,0-0.7,0.3-0.7,0.7v7.5c0,0.4,0.3,0.7,0.7,0.7c0.4,0,0.7-0.3,0.7-0.7v-7.5C19.5,11.3,19.2,11,18.8,11z M15,11 c-0.4,0-0.7,0.3-0.7,0.7v7.5c0,0.4,0.3,0.7,0.7,0.7c0.4,0,0.7-0.3,0.7-0.7v-7.5C15.7,11.3,15.4,11,15,11z M11.2,14 c-0.4,0-0.7,0.3-0.7,0.7v4.5c0,0.4,0.3,0.7,0.7,0.7c0.4,0,0.7-0.3,0.7-0.7v-4.5C11.9,14.3,11.6,14,11.2,14z M7.5,14 c-0.4,0-0.7,0.3-0.7,0.7v4.5c0,0.4,0.3,0.7,0.7,0.7c0.4,0,0.7-0.3,0.7-0.7v-4.5C8.2,14.3,7.9,14,7.5,14z M20.2,4H3.8 C2.8,4,2,4.8,2,5.8v12.5c0,1,0.8,1.8,1.8,1.8h16.5c1,0,1.8-0.8,1.8-1.8V5.8C22,4.8,21.2,4,20.2,4z M20.5,18.2 c0,0.2-0.1,0.3-0.3,0.3H3.8c-0.2,0-0.3-0.1-0.3-0.3V5.8c0-0.2,0.1-0.3,0.3-0.3h16.5c0.2,0,0.3,0.1,0.3,0.3V18.2z M12,11.2V7 c0-0.4-0.3-0.7-0.7-0.7c-0.4,0-0.7,0.3-0.7,0.7v4.2c-0.8,0.2-1.5,0.9-1.5,1.8c0,1,0.8,1.8,1.8,1.8c1,0,1.8-0.8,1.8-1.8 C12.7,12,12.4,11.4,12,11.2z"/>
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-black heading-font text-slate-900">Market Intelligence Export</h2>
                <p className="text-sm text-slate-600">Analyze HubSpot performance data to identify your next winning play.</p>
              </div>
            </div>
            
            <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-3">
                <div className="w-8 h-8 bg-slate-900 text-white rounded-full flex items-center justify-center font-bold text-sm">1</div>
                <h3 className="font-bold text-slate-900 uppercase text-xs tracking-widest">Analytics Tools</h3>
                <p className="text-sm text-slate-600 leading-relaxed">Go to <strong>Reports &gt; Traffic Analytics</strong> in your HubSpot portal.</p>
              </div>
              <div className="space-y-3">
                <div className="w-8 h-8 bg-slate-900 text-white rounded-full flex items-center justify-center font-bold text-sm">2</div>
                <h3 className="font-bold text-slate-900 uppercase text-xs tracking-widest">30 Day Filter</h3>
                <p className="text-sm text-slate-600 leading-relaxed">Set range to <strong>"Last 30 Days"</strong> and select "Pages" or "Campaigns".</p>
              </div>
              <div className="space-y-3">
                <div className="w-8 h-8 bg-slate-900 text-white rounded-full flex items-center justify-center font-bold text-sm">3</div>
                <h3 className="font-bold text-slate-900 uppercase text-xs tracking-widest">Export CSV</h3>
                <p className="text-sm text-slate-600 leading-relaxed">Click <strong>Export</strong> and choose <strong>CSV</strong> format. Ensure all columns are included.</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-10 text-center">
            <h2 className="text-2xl font-black heading-font text-slate-900 mb-2 uppercase">Analyze & Pivot</h2>
            <p className="text-slate-500 mb-8 max-w-lg mx-auto">Upload your HubSpot export to see real KPI snapshots and top performers. Then optionally generate AI strategy ideas from that data.</p>
            
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
