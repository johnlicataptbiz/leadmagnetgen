
import React, { useState, useRef } from 'react';
import { BrandContext, SmartMarketReport, SmartChart, SmartChartSeries } from '../types';
import { generateSmartMarketReport } from '../services/geminiService';

interface HubspotInsightsProps {
  brandContext: BrandContext;
  report: SmartMarketReport | null;
  onReportChange: (report: SmartMarketReport | null) => void;
}

interface UploadedFilePreview {
  id: string;
  name: string;
  rowCount: number;
  headers: string[];
  sampleCsv: string; // First N lines
  numericStats?: Record<string, { sum: number; max: number; min: number }>;
}

const HubspotInsights: React.FC<HubspotInsightsProps> = ({ brandContext, report, onReportChange }) => {
  const [uploads, setUploads] = useState<UploadedFilePreview[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to parse CSV/text
  const processFile = async (file: File): Promise<UploadedFilePreview> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        if (!text) return reject('Empty file');

        const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
        if (lines.length < 1) return reject('No data found');

        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const rowCount = lines.length - 1;
        const sampleLimit = Math.min(lines.length, 50); // increased sample size for better AI context
        const sampleCsv = lines.slice(0, sampleLimit).join('\n');

        // Basic numeric stats for heuristic context
        const numericStats: Record<string, { sum: number; max: number; min: number }> = {};
        
        // Only compute stats if file isn't huge to match performance constraints
        if (rowCount < 5000) {
           headers.forEach((h, idx) => {
             // Simple heuristic: check first 10 rows to see if numeric
             const isNumericCol = lines.slice(1, 11).every(line => {
                const parts = line.split(','); // naive split
                const val = parseFloat(parts[idx]);
                return !isNaN(val);
             });
             
             if (isNumericCol) {
                let sum = 0;
                let max = -Infinity;
                let min = Infinity;
                
                // Scan full dataset for stats
                for (let i = 1; i < lines.length; i++) {
                   const val = parseFloat(lines[i].split(',')[idx]);
                   if (!isNaN(val)) {
                      sum += val;
                      if (val > max) max = val;
                      if (val < min) min = val;
                   }
                }
                numericStats[h] = { sum, max, min };
             }
           });
        }

        resolve({
          id: crypto.randomUUID(),
          name: file.name,
          rowCount,
          headers,
          sampleCsv,
          numericStats
        });
      };
      reader.onerror = () => reject('Read error');
      reader.readAsText(file);
    });
  };

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    setErrorMessage(null);
    const newFiles: UploadedFilePreview[] = [];
    
    // Cap at 10 files
    const limit = 10 - uploads.length;
    const filesToProcess = Array.from(e.target.files).slice(0, limit);

    for (const file of filesToProcess) {
       try {
         const p = await processFile(file as File);
         newFiles.push(p);
       } catch (err) {
         console.error('File skip:', (file as File).name, err);
       }
    }
    
    setUploads(prev => [...prev, ...newFiles]);
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (id: string) => {
    setUploads(prev => prev.filter(u => u.id !== id));
  };

  const handleGenerate = async () => {
    if (uploads.length === 0) return;
    setIsProcessing(true);
    setErrorMessage(null);
    
    try {
      // Massage data for service
      const payload = uploads.map(u => ({
        name: u.name,
        headers: u.headers,
        rowCount: u.rowCount,
        sampleCsv: u.sampleCsv,
        numericColumnStats: u.numericStats
      }));

      const result = await generateSmartMarketReport(payload, brandContext);
      if (result) {
        onReportChange(result);
        setUploads([]); // clear staging on success
      }
    } catch (err: any) {
       console.error(err);
       setErrorMessage(err.message || "Failed to generate analyst report.");
    } finally {
       setIsProcessing(false);
    }
  };

  // --- RENDERERS ---

  const renderChart = (chart: SmartChart, idx: number) => {
    // Robustness check
    if (!chart.series || chart.series.length === 0 || !chart.series[0].points || chart.series[0].points.length === 0) {
       return (
          <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-6 mb-4 break-inside-avoid flex items-center justify-center h-64">
             <div className="text-center text-slate-400">
                <p className="text-xs font-bold uppercase mb-2">Unavailable</p>
                <p className="text-[10px] max-w-[150px] mx-auto opacity-70">Chart data for "{chart.title}" could not be generated from the dataset.</p>
             </div>
          </div>
       );
    }
  
    // Simple visualizer for bar/line
    const maxVal = chart.series.reduce((max, s) => {
        const sMax = Math.max(...s.points.map(p => p.y));
        return sMax > max ? sMax : max;
    }, 0) || 100;

    return (
      <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-6 mb-4 break-inside-avoid">
         <div className="flex items-center justify-between mb-4">
             <div>
                <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wide">{chart.title}</h4>
                {chart.note && <p className="text-xs text-slate-500 mt-1">{chart.note}</p>}
             </div>
             <span className="text-[10px] font-black uppercase text-slate-400 border border-slate-200 px-2 py-1 rounded">{chart.type}</span>
         </div>
         
         {/* Simple Bar/Line Viz Implementation */}
         <div className="h-48 flex items-end gap-2 border-b border-slate-300 pb-2 overflow-x-auto">
            {chart.series[0].points.slice(0, 12).map((p, i) => { // limit dots
               const height = Math.max(5, (p.y / maxVal) * 100);
               return (
                  <div key={i} className="flex-1 min-w-[30px] flex flex-col items-center gap-1 group">
                     <div 
                        className={`w-full rounded-t ${chart.type === 'line' ? 'bg-blue-400 w-1 mx-auto' : 'bg-slate-800'}`} 
                        style={{ height: `${height}%` }}
                     ></div>
                     <span className="text-[9px] text-slate-500 truncate w-full text-center">{p.x}</span>
                     {/* Tooltip */}
                     <div className="absolute opacity-0 group-hover:opacity-100 bg-black text-white text-[10px] p-1 rounded -mt-8 pointer-events-none z-10 whitespace-nowrap">
                        {p.y}
                     </div>
                  </div>
               )
            })}
         </div>
         {chart.xLabel && <p className="text-center text-[10px] font-bold text-slate-400 mt-2 uppercase">{chart.xLabel}</p>}
      </div>
    );
  };

  if (report) {
    return (
      <div className="max-w-5xl mx-auto animate-fade-in">
         {/* Header */}
         <div className="bg-slate-900 text-white p-8 rounded-t-3xl relative overflow-hidden">
            <div className="relative z-10 flex justify-between items-start">
               <div>
                  <div className="flex items-center gap-2 mb-2">
                     <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                     <p className="text-[10px] font-black uppercase tracking-widest text-blue-300">Smart Analyst Report</p>
                  </div>
                  <h2 className="text-3xl font-black heading-font tracking-tight">{report.title}</h2>
                  <p className="text-slate-400 mt-2 max-w-2xl text-sm leading-relaxed">{report.summary}</p>
               </div>
               <button 
                 onClick={() => onReportChange(null)}
                 className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold uppercase py-2 px-4 rounded-lg transition-colors border border-white/10"
               >
                 New Analysis
               </button>
            </div>
            {/* Decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 rounded-full blur-[80px] pointer-events-none"></div>
         </div>

         <div className="bg-white border-x border-b border-slate-200 p-8 rounded-b-3xl shadow-xl space-y-12">
            
            {/* KPIS */}
            <section>
               <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-6 border-b border-slate-100 pb-2">Key Performance Indicators</h3>
               <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {report.kpis.map((k, i) => (
                    <div key={i} className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                       <p className="text-[10px] font-bold uppercase text-slate-500 mb-1">{k.label}</p>
                       <p className="text-xl font-black text-slate-900 truncate" title={k.value}>{k.value}</p>
                       {k.note && <p className="text-[10px] text-green-600 mt-1 font-bold">{k.note}</p>}
                    </div>
                  ))}
               </div>
            </section>

            {/* CHARTS */}
            <section>
               <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-6 border-b border-slate-100 pb-2">Data Visualization</h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {report.charts.map((c, i) => renderChart(c, i))}
               </div>
            </section>

            {/* INSIGHTS */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-12">
               <div>
                  <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-6 border-b border-slate-100 pb-2 flex items-center gap-2">
                     <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                     Strategic Insights
                  </h3>
                  <ul className="space-y-4">
                     {report.insights.map((insight, i) => (
                        <li key={i} className="flex gap-3 text-sm text-slate-700 leading-relaxed">
                           <span className="font-bold text-blue-500 select-none">•</span>
                           {insight}
                        </li>
                     ))}
                  </ul>
               </div>
               
               {report.cautions && report.cautions.length > 0 && (
                 <div>
                    <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-6 border-b border-slate-100 pb-2 text-amber-600">
                       Data Cautions
                    </h3>
                    <ul className="space-y-3">
                       {report.cautions.map((c, i) => (
                          <li key={i} className="text-xs font-medium text-amber-800 bg-amber-50 p-4 rounded-lg border border-amber-100">
                             <div className="flex gap-3 mb-2">
                                <span className="select-none">⚠️</span>
                                <p className="leading-relaxed">{c.caution}</p>
                             </div>
                             <div className="ml-7 pl-3 border-l-2 border-amber-200">
                                <p className="text-[10px] uppercase font-black tracking-widest text-amber-500 mb-1">Recommended Action</p>
                                <p className="text-amber-900 font-bold">{c.action}</p>
                             </div>
                          </li>
                       ))}
                    </ul>
                 </div>
               )}
            </section>

         </div>
      </div>
    );
  }

  // UPLOAD VIEW
  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-[2.5rem] p-10 shadow-xl border border-slate-200">
         <div className="text-center mb-10">
            <h2 className="text-2xl font-black uppercase text-slate-900 tracking-tight mb-2">Market Data Intelligence</h2>
            <p className="text-slate-500 max-w-lg mx-auto text-sm">Upload your exported CSVs from HubSpot (Campaigns, Forms, Landing Pages). Our AI Analyst will correlate the data into a unified dashboard.</p>
         </div>

         {errorMessage && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-bold mb-6 text-center border border-red-100">
               {errorMessage}
            </div>
         )}

         {/* File List */}
         {uploads.length > 0 && (
            <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-4">
               {uploads.map(file => (
                  <div key={file.id} className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex items-center justify-between group">
                     <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-slate-100 text-slate-400 font-bold text-xs shadow-sm">
                           CSV
                        </div>
                        <div className="min-w-0">
                           <p className="font-bold text-sm text-slate-800 truncate">{file.name}</p>
                           <p className="text-xs text-slate-400 uppercase tracking-wider font-bold">{file.rowCount} rows</p>
                        </div>
                     </div>
                     <button 
                        onClick={() => removeFile(file.id)}
                        className="text-slate-300 hover:text-red-500 p-2 transition-colors"
                        title="Remove file"
                     >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                     </button>
                  </div>
               ))}
               
               {/* Add more button */}
               {uploads.length < 10 && (
                   <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center p-4 text-slate-400 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50 transition-all gap-2"
                   >
                      <span className="text-2xl font-light">+</span>
                      <span className="text-xs font-black uppercase tracking-widest">Add another report</span>
                   </button>
               )}
            </div>
         )}
         
         {/* Initial Upload State (if huge list not shown) or Main Action */}
         <div className="space-y-4">
            <input 
               type="file" 
               ref={fileInputRef}
               className="hidden"
               multiple
               accept=".csv,.txt"
               onChange={handleFiles}
            />
            
            {uploads.length === 0 ? (
               <div 
                 onClick={() => fileInputRef.current?.click()}
                 className="cursor-pointer bg-slate-50 border-4 border-dashed border-slate-200 rounded-3xl p-12 text-center hover:border-blue-400 hover:bg-blue-50 transition-all group"
               >
                  <div className="w-16 h-16 bg-white rounded-2xl shadow-lg border border-slate-100 mx-auto flex items-center justify-center text-blue-500 mb-6 group-hover:scale-110 transition-transform">
                     <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                  </div>
                  <h3 className="text-lg font-black text-slate-700 uppercase">Drop Report CSVs Here</h3>
                  <p className="text-slate-400 text-sm mt-2">or click to browse multiple files</p>
               </div>
            ) : (
               <div className="flex flex-col gap-4">
                  <button
                     onClick={handleGenerate}
                     disabled={isProcessing}
                     className="w-full py-4 bg-slate-900 hover:bg-blue-600 text-white rounded-xl font-black uppercase tracking-widest text-sm shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                  >
                     {isProcessing ? (
                        <>
                           <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                           Correlating Data across {uploads.length} files...
                        </>
                     ) : (
                        <>
                           Generate Unified Analyst Report
                           <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        </>
                     )}
                  </button>
                  <button 
                    onClick={() => setUploads([])}
                    className="text-slate-400 text-xs font-bold uppercase tracking-widest hover:text-red-500"
                  >
                    Clear All Uploads
                  </button>
               </div>
            )}
         </div>

      </div>
    </div>
  );
};

export default HubspotInsights;
