
import React, { useState, useRef } from 'react';
import { BrandContext } from '../types';
import { analyzeStyleReference } from '../services/geminiService';
// @ts-ignore
import ColorThief from 'colorthief';
import * as pdfjs from 'pdfjs-dist';

// Configure PDF.js worker using a more reliable CDN link
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface BrandIntelligenceProps {
  context: BrandContext;
  onChange: (context: BrandContext) => void;
  onClose: () => void;
}

const BrandIntelligence: React.FC<BrandIntelligenceProps> = ({ context, onChange, onClose }) => {
  const [analyzing, setAnalyzing] = useState(false);
  const [lastAction, setLastAction] = useState<'none' | 'logo' | 'doc'>('none');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      action();
    }
  };

  const rgbToHex = (r: number, g: number, b: number) => {
    const componentToHex = (c: number) => {
      const hex = c.toString(16);
      return hex.length === 1 ? "0" + hex : hex;
    };
    return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
  };

  const extractColorsFromImage = (dataUrl: string): Promise<{primary: string, secondary: string, accent: string}> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const colorThief = new ColorThief();
        const palette = colorThief.getPalette(img, 5);
        const colors = {
          primary: rgbToHex(palette[0][0], palette[0][1], palette[0][2]),
          secondary: rgbToHex(palette[1][0], palette[1][1], palette[1][2]),
          accent: rgbToHex(palette[2][0], palette[2][1], palette[2][2]),
        };
        resolve(colors);
      };
      img.src = dataUrl;
    });
  };

  const extractTextFromPdf = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => ('str' in item ? item.str : ''))
        .join(' ');
      fullText += pageText + '\n';
    }
    return fullText;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAnalyzing(true);

    try {
      if (file.type.startsWith('image/')) {
        setLastAction('logo');
        const reader = new FileReader();
        reader.onloadend = async () => {
          const logoUrl = reader.result as string;
          try {
            const extractedColors = await extractColorsFromImage(logoUrl);
            onChange({ 
              ...context, 
              logoUrl,
              colors: extractedColors,
              referenceDocNames: [...context.referenceDocNames, `Visual: ${file.name}`]
            });
          } catch (err) {
            console.error("Failed to extract colors", err);
            onChange({ ...context, logoUrl });
          } finally {
            setAnalyzing(false);
          }
        };
        reader.readAsDataURL(file);
        return; 
      }

      setLastAction('doc');
      let text = '';
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      
      if (isPdf) {
        text = await extractTextFromPdf(file);
      } else {
        text = await file.text();
      }

      const extracted = await analyzeStyleReference(text, file.name, context.logoUrl);
      
      // Update context with extracted values, but keep existing logo colors if AI didn't find clearly better ones
      onChange({
        ...context,
        colors: extracted.colors || context.colors,
        tonality: extracted.tonality || context.tonality,
        styling: extracted.styling || context.styling,
        styleNotes: (context.styleNotes + "\n\n" + (extracted.styleNotes || "")).trim(),
        referenceDocNames: [...context.referenceDocNames, `Style: ${file.name}`]
      });
      
    } catch (err: any) {
      console.error(err);
      alert(`Analysis failed: ${err.message || 'Unknown error'}.`);
    } finally {
      setAnalyzing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const isPending = (val: string) => val === 'Pending extraction...';

  return (
    <div className="max-w-6xl mx-auto py-8">
      <input type="file" ref={fileInputRef} id="universal-upload" className="hidden" onChange={handleFileUpload} />

      <div className="glass-effect rounded-[3.5rem] p-1 shadow-2xl border border-white/50">
        <div className="bg-white/40 backdrop-blur-3xl rounded-[3.4rem] overflow-hidden">
          <div className="dark-glass text-white p-10 flex flex-col md:flex-row justify-between items-center gap-6 border-b border-white/5 relative overflow-hidden group">
            <div className="flex items-center gap-6 relative z-10">
               <div className="bg-white p-4 rounded-3xl shadow-xl hover:rotate-3 transition-transform">
                 <img src="/pt-biz-logo.png" className="h-10 object-contain" alt="PT Biz" />
               </div>
               <div>
                 <h2 className="text-4xl font-black heading-font uppercase tracking-tight">Brand Intelligence</h2>
                 <p className="text-slate-300 text-base mt-1 font-medium italic">Absorbing clinical tonality and visual cues...</p>
               </div>
            </div>
            <button 
              onClick={onClose} 
              className="w-full md:w-auto bg-blue-600 hover:bg-blue-500 text-white px-10 py-5 rounded-[2rem] font-black uppercase text-xs transition-all shadow-2xl active:scale-95 flex items-center justify-center gap-3 shine-on-hover"
            >
              Confirm DNA Profile
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            </button>
          </div>

        <div className="p-10 grid grid-cols-1 lg:grid-cols-2 gap-16">
          <div className="space-y-10">
            <div className="flex items-center gap-4 border-b border-slate-100 pb-5">
              <span className="w-8 h-8 rounded-full bg-slate-900 text-white text-xs flex items-center justify-center font-bold">1</span>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Ingest Branding Assets</h3>
            </div>
            <div 
              role="button" tabIndex={0}
              onClick={() => !analyzing && fileInputRef.current?.click()}
              onKeyDown={(e) => handleKeyDown(e, () => !analyzing && fileInputRef.current?.click())}
              className="border-2 border-dashed border-slate-200 rounded-[3rem] p-12 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50/30 transition-all bg-white/50 min-h-[420px] flex flex-col items-center justify-center group relative overflow-hidden focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xl"
            >
              {analyzing ? (
                <div className="space-y-8 text-center animate-pulse">
                  <div className="relative w-24 h-24 mx-auto">
                    <div className="absolute inset-0 border-8 border-slate-100 rounded-full"></div>
                    <div className="absolute inset-0 border-8 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                  <div className="space-y-2">
                     <p className="text-xl font-black text-slate-900 uppercase tracking-tighter">
                       {lastAction === 'logo' ? 'Extracting Visual Palette...' : 'Mapping Stylistic DNA...'}
                     </p>
                     <p className="text-blue-600 font-bold text-sm uppercase tracking-widest">Absorbing context via Gemini 2.0</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-8 max-w-sm mx-auto">
                  <div className="flex -space-x-4 justify-center">
                     <div className="w-20 h-20 bg-blue-600 text-white rounded-[1.5rem] flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform relative z-20">
                        <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                     </div>
                     <div className="w-20 h-20 bg-slate-900 text-white rounded-[1.5rem] flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform relative z-10 translate-y-4">
                        <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                     </div>
                  </div>
                  <div className="space-y-4">
                    <p className="text-3xl font-black text-slate-900 uppercase leading-none tracking-tighter">Brand Ingest Engine</p>
                    <p className="text-slate-500 font-medium leading-relaxed text-lg">Upload logos or clinical references to verify your unique DNA profile.</p>
                  </div>
                  <span className="bg-blue-600 text-white px-10 py-5 rounded-2xl font-black uppercase text-xs shadow-2xl inline-block hover:scale-105 shine-on-hover transition-transform">
                     Select Reference File
                  </span>
                </div>
              )}
            </div>

            {context.referenceDocNames.length > 0 && (
              <div className="bg-slate-900 p-8 rounded-[2rem] shadow-xl animate-fade-in relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl"></div>
                <p className="text-xs font-black text-blue-400 uppercase tracking-[0.3em] mb-5">Verified Sources:</p>
                <div className="space-y-3">
                  {context.referenceDocNames.map((name, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm text-slate-300 font-medium">
                       <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                         <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" /></svg>
                       </div>
                       <span className="truncate">{name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-10 bg-slate-50/80 p-10 rounded-[3rem] border border-slate-200 shadow-inner">
            <div className="flex items-center gap-4 border-b border-slate-200 pb-5">
              <span className="w-8 h-8 rounded-full bg-slate-900 text-white text-xs flex items-center justify-center font-bold">2</span>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">AI Verified Profile</h3>
              <div 
                className={`ml-auto flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all ${isPending(context.tonality) ? 'bg-slate-100 text-slate-400 border-slate-200' : 'bg-green-50 text-green-600 border-green-200'}`}
              >
                <div className={`w-1.5 h-1.5 rounded-full ${isPending(context.tonality) ? 'bg-slate-400' : 'bg-green-500 animate-pulse'}`}></div>
                {isPending(context.tonality) ? 'Awaiting Scan' : 'Sync Active'}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-6">
              {[
                { label: 'Primary', color: context.colors.primary },
                { label: 'Secondary', color: context.colors.secondary },
                { label: 'Accent', color: context.colors.accent }
              ].map((c, i) => (
                <div key={i} className="space-y-3 text-center group">
                  <div className="w-full h-16 rounded-2xl shadow-lg border-2 border-white transition-all group-hover:scale-105" style={{ backgroundColor: c.color }}></div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{c.label}</p>
                  <div className="text-[10px] font-bold text-slate-600 py-1.5 bg-white rounded-lg border border-slate-200 shadow-sm font-mono">{c.color}</div>
                </div>
              ))}
            </div>

            <div className="space-y-8">
              {[
                { label: 'Extracted Tonality', value: context.tonality },
                { label: 'Stylistic Rules', value: context.styling }
              ].map((f, i) => (
                <div key={i}>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-3 flex items-center justify-between">
                    {f.label}
                    <span className="text-[9px] text-blue-500 font-bold italic">
                      {isPending(f.value) ? 'Awaiting Scan' : 'Verified by Gemini'}
                    </span>
                  </label>
                  <div className={`w-full p-4 bg-[#1e293b] text-white rounded-xl text-sm font-medium shadow-inner min-h-[56px] flex items-center ${isPending(f.value) ? 'italic opacity-30' : 'animate-fade-in'}`}>
                    {f.value}
                  </div>
                </div>
              ))}
              <div>
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-3">Clinical Nuances</label>
                <div className={`w-full p-6 bg-[#1e293b] text-slate-300 rounded-xl text-sm font-medium shadow-inner min-h-[160px] whitespace-pre-wrap leading-relaxed ${!context.styleNotes ? 'italic opacity-30 text-white' : 'animate-fade-in'}`}>
                  {context.styleNotes || "Awaiting scan to derive clinical nuances..."}
                </div>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};

export default BrandIntelligence;
