
import React, { useState, useRef, useEffect } from 'react';
import { HubspotAnalysis, LeadMagnetIdea, BrandContext } from '../types';
import { analyzeHubspotData } from '../services/geminiService';

interface HubspotInsightsProps {
  brandContext?: BrandContext;
  analysis?: HubspotAnalysis | null;
  onAnalysisComplete: (analysis: HubspotAnalysis) => void;
  onSelectIdea: (idea: LeadMagnetIdea) => void;
}

const HubspotInsights: React.FC<HubspotInsightsProps> = ({ brandContext, analysis: initialAnalysis, onAnalysisComplete, onSelectIdea }) => {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<HubspotAnalysis | null>(initialAnalysis || null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialAnalysis) {
      setAnalysis(initialAnalysis);
    }
  }, [initialAnalysis]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setLoading(true);
    setErrorMessage(null);

    try {
      const text = await file.text();
      const result = await analyzeHubspotData(text.substring(0, 50000), brandContext);
      if (result) {
        setAnalysis(result);
        onAnalysisComplete(result);
      }
    } catch (e: any) {
      console.error(e);
      setErrorMessage(`Error parsing or analyzing file: ${e.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
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
            <p className="text-slate-500 mb-8 max-w-lg mx-auto">Upload your report. Gemini 3 Flash will identify winners and suggest your next strategic lead magnet.</p>
            
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 rounded-2xl p-12 hover:border-blue-400 transition cursor-pointer bg-slate-50 group mb-6"
            >
              {loading ? (
                <div className="space-y-4">
                  <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="font-bold text-blue-600 heading-font animate-pulse">Analyzing Performance Data...</p>
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
