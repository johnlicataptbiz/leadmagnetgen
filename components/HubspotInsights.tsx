import React, { useState, useRef } from 'react';
import { BrandContext, SmartMarketReport, SmartChart, SmartChartSeries } from '../types';
import { generateSmartMarketReport } from '../services/geminiService';
import { TrendingUp, Info, AlertTriangle, FileText, Upload, Sparkles, X, Check, Loader2, ChevronRight, BarChart3, LineChart as LineChartIcon, Table as TableIcon } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  LineChart, Line, AreaChart, Area, CartesianGrid, Cell, Legend
} from 'recharts';

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
  sampleCsv: string; 
  numericStats?: Record<string, { sum: number; max: number; min: number }>;
  status: 'pending' | 'processing' | 'complete' | 'error';
}

const HubspotInsights: React.FC<HubspotInsightsProps> = ({ brandContext, report, onReportChange }) => {
  const [uploads, setUploads] = useState<UploadedFilePreview[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState("Correlating Data...");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const LOADING_MESSAGES = [
    "Reading Hubspot data structures...",
    "Correlating campaigns across files...",
    "Analyzing form submission trends...",
    "Identifying market anomalies...",
    "Extracting strategic KPIs...",
    "Building data visualizations...",
    "Finalizing analyst memo...",
    "Polishing dashboard..."
  ];

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
        const sampleLimit = Math.min(lines.length, 20); // reduced sample size to avoid AI timeouts
        const sampleCsv = lines.slice(0, sampleLimit).join('\n');

        // Basic numeric stats for heuristic context
        const numericStats: Record<string, { sum: number; max: number; min: number }> = {};
        
        // Only compute stats if file isn't huge to match performance constraints
        if (rowCount < 5000) {
           // Pre-split data rows once to save O(N^2) work
           const dataRows = lines.slice(1).map(line => line.split(','));

           headers.forEach((h, idx) => {
             // Simple heuristic: check first 10 rows to see if numeric
             const isNumericCol = dataRows.slice(0, 10).every(parts => {
                const val = parseFloat(parts[idx]);
                return !isNaN(val);
             });
             
             if (isNumericCol) {
                let sum = 0;
                let max = -Infinity;
                let min = Infinity;
                
                // Scan pre-split rows for stats
                for (const parts of dataRows) {
                   const val = parseFloat(parts[idx]);
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
            numericStats,
            status: 'complete'
          });
      };
      reader.onerror = () => reject('Read error');
      reader.readAsText(file);
    });
  };

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    setErrorMessage(null);
    
    const selectedFiles = Array.from(e.target.files).slice(0, 10 - uploads.length) as File[];
    
    // 1. Add them all as pending first
    const pendingFiles: UploadedFilePreview[] = selectedFiles.map(f => ({
      id: crypto.randomUUID(),
      name: f.name,
      rowCount: 0,
      headers: [],
      sampleCsv: '',
      status: 'pending'
    }));
    
    setUploads(prev => [...prev, ...pendingFiles]);

    // 2. Process them one by one
    for (const pFile of pendingFiles) {
       // Find the real browser file object
       const realFile = selectedFiles.find(f => (f as File).name === pFile.name);
       if (!realFile) continue;

       // Set to processing
       setUploads(prev => prev.map(u => u.id === pFile.id ? { ...u, status: 'processing' } : u));

       try {
         const processed = await processFile(realFile as File);
         setUploads(prev => prev.map(u => u.id === pFile.id ? { ...processed, id: pFile.id } : u));
       } catch (err) {
         console.error('File skip:', pFile.name, err);
         setUploads(prev => prev.map(u => u.id === pFile.id ? { ...u, status: 'error' } : u));
       }
    }
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (id: string) => {
    setUploads(prev => prev.filter(u => u.id !== id));
  };

  const handleGenerate = async () => {
    if (uploads.length === 0) return;
    if (uploads.some(u => u.status !== 'complete')) return;

    setIsProcessing(true);
    setErrorMessage(null);
    
    // Logic to cycle messages
    let msgIdx = 0;
    const msgInterval = setInterval(() => {
      msgIdx = (msgIdx + 1) % LOADING_MESSAGES.length;
      setProcessingMessage(LOADING_MESSAGES[msgIdx]);
    }, 2500);

    try {
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
        setUploads([]); 
      }
    } catch (err: any) {
       console.error(err);
       setErrorMessage(err.message || "Failed to generate analyst report.");
    } finally {
       setIsProcessing(false);
       clearInterval(msgInterval);
    }
  };

  // --- RENDERERS ---

  const renderChart = (chart: SmartChart, idx: number) => {
    const hasData = chart.series && chart.series.length > 0 && chart.series[0].points && chart.series[0].points.length > 0;

    if (!hasData) {
       return (
          <div key={idx} className="bg-white/50 border border-slate-200 rounded-2xl p-8 mb-6 break-inside-avoid flex flex-col items-center justify-center min-h-[300px] text-center backdrop-blur-sm">
             <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6 text-slate-400" />
             </div>
             <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wider mb-2">{chart.title || 'Visual Analysis'}</h4>
             <p className="text-xs text-slate-500 max-w-[200px] leading-relaxed">This visual could not be generated from the current dataset. Check file headers.</p>
          </div>
       );
    }

    // Transform data for Recharts (Format: [{ x: '...', series1: 10, series2: 20 }])
    const dataPoints = chart.series![0].points.map((p, pIdx) => {
       const obj: any = { x: p.x };
       chart.series!.forEach(s => {
          obj[s.name] = s.points[pIdx]?.y || 0;
       });
       return obj;
    });

    const colors = [brandContext.colors.primary, brandContext.colors.secondary, brandContext.colors.accent, '#94a3b8', '#64748b'];

    return (
      <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-6 mb-6 break-inside-avoid shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-8">
              <div className="flex-1">
                 <div className="flex items-center gap-2 mb-1">
                    {chart.type === 'bar' ? <BarChart3 className="w-4 h-4 text-slate-400" /> : <LineChartIcon className="w-4 h-4 text-slate-400" />}
                    <h4 className="font-black text-slate-900 text-sm uppercase tracking-tight">{chart.title}</h4>
                 </div>
                 {chart.note && (
                   <div className="flex items-start gap-1.5 mt-2">
                     <Info className="w-3 h-3 text-slate-400 mt-0.5 shrink-0" />
                     <p className="text-[11px] text-slate-500 italic leading-snug">{chart.note}</p>
                   </div>
                 )}
              </div>
              <div className="flex flex-col items-end gap-1">
                 <span className="text-[9px] font-black uppercase text-slate-400 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-full">{chart.type}</span>
              </div>
          </div>
          
          <div className="w-full relative">
             <ResponsiveContainer width="100%" aspect={1.8} debounce={50} minWidth={0}>
                {chart.type === 'line' ? (
                  <LineChart data={dataPoints} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="x" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#64748b' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#64748b' }} />
                    <Tooltip 
                       contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '11px', fontWeight: 'bold' }}
                       cursor={{ stroke: '#e2e8f0', strokeWidth: 2 }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '10px' }} />
                    {chart.series!.map((s, si) => (
                       <Line key={s.name} type="monotone" dataKey={s.name} stroke={colors[si % colors.length]} strokeWidth={3} dot={{ r: 4, fill: colors[si % colors.length], strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                    ))}
                  </LineChart>
                ) : (
                  <BarChart data={dataPoints} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="x" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#64748b' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#64748b' }} />
                    <Tooltip 
                       cursor={{ fill: '#f8fafc' }}
                       contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '11px', fontWeight: 'bold' }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '10px' }} />
                    {chart.series!.map((s, si) => (
                       <Bar key={s.name} dataKey={s.name} fill={colors[si % colors.length]} radius={[4, 4, 0, 0]} barSize={chart.series!.length > 1 ? undefined : 30} />
                    ))}
                  </BarChart>
                )}
             </ResponsiveContainer>
          </div>
          {chart.xLabel && <p className="text-center text-[10px] font-bold text-slate-400 mt-4 uppercase tracking-widest">{chart.xLabel}</p>}
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
                  <div key={file.id} className={`bg-white border rounded-2xl flex items-center justify-between group p-4 transition-all ${
                    file.status === 'complete' ? 'border-green-100 shadow-sm' : 
                    file.status === 'processing' ? 'border-blue-200 animate-pulse bg-blue-50/30' : 
                    'border-slate-200'
                  }`}>
                     <div className="flex items-center gap-3 overflow-hidden">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs shadow-sm border transition-colors ${
                          file.status === 'complete' ? 'bg-green-50 border-green-100 text-green-600' : 
                          file.status === 'processing' ? 'bg-blue-50 border-blue-100 text-blue-600' :
                          'bg-slate-50 border-slate-100 text-slate-400'
                        }`}>
                           {file.status === 'complete' ? (
                             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                           ) : file.status === 'processing' ? (
                             <div className="w-4 h-4 border-2 border-blue-500/30 border-t-blue-600 rounded-full animate-spin"></div>
                           ) : 'CSV'}
                        </div>
                        <div className="min-w-0">
                           <p className={`font-bold text-sm truncate ${file.status === 'complete' ? 'text-slate-800' : 'text-slate-500'}`}>{file.name}</p>
                           {file.status === 'complete' ? (
                              <p className="text-[10px] text-green-600 uppercase tracking-wider font-extrabold flex items-center gap-1">
                                Ready: {file.rowCount} rows
                              </p>
                           ) : (
                              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">{file.status}...</p>
                           )}
                        </div>
                     </div>
                     <button 
                        onClick={() => removeFile(file.id)}
                        className="text-slate-300 hover:text-red-500 p-2 transition-colors"
                        title="Remove file"
                     >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
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
                           {processingMessage}
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
