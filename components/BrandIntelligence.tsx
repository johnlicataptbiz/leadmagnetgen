
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Accessibility: Handle keyboard interactions for the custom "buttons"
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
        
        // Map palette to our primary/secondary/accent structure
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
      // 1. Handle Images (Logo & Colors)
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const logoUrl = reader.result as string;
          try {
            const extractedColors = await extractColorsFromImage(logoUrl);
            onChange({ 
              ...context, 
              logoUrl,
              colors: extractedColors,
              referenceDocNames: [...context.referenceDocNames, `Logo: ${file.name}`]
            });
          } catch (err) {
            console.error("Failed to extract colors", err);
            onChange({ ...context, logoUrl });
          } finally {
            setAnalyzing(false);
          }
        };
        reader.onerror = () => {
          setAnalyzing(false);
          alert("Failed to read image file.");
        };
        reader.readAsDataURL(file);
        return; 
      }

      // 2. Handle Documents (Tonality & Style)
      let text = '';
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      
      if (isPdf) {
        text = await extractTextFromPdf(file);
      } else {
        text = await file.text();
        if (text.slice(0, 100).includes('\ufffd') || text.slice(0, 100).includes('\0')) {
          alert("For the most accurate 'Brand DNA' extraction, please upload a plain text (.txt) export or a PDF.");
          setAnalyzing(false);
          return;
        }
      }

      if (!text || text.trim().length < 10) {
        throw new Error("No readable text found in the document. Please try a different file.");
      }

      const extractedBrand = await analyzeStyleReference(text, file.name, context.logoUrl);
      
      onChange({
        ...context,
        colors: extractedBrand.colors || context.colors,
        tonality: extractedBrand.tonality || context.tonality,
        styling: extractedBrand.styling || context.styling,
        styleNotes: (context.styleNotes + "\n\n" + (extractedBrand.styleNotes || "")).trim(),
        referenceDocNames: [...context.referenceDocNames, file.name]
      });
      setAnalyzing(false);
    } catch (err: any) {
      console.error(err);
      alert(`Analysis failed: ${err.message || 'Unknown error'}.`);
      setAnalyzing(false);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const inputClass = "w-full p-4 bg-[#1e293b] text-white border-none rounded-xl text-sm font-medium opacity-90 cursor-default shadow-inner transition-all hover:bg-[#2d3a4f] flex items-center min-h-[56px]";
  const labelClass = "text-xs font-black text-slate-400 uppercase tracking-widest block mb-3 flex items-center justify-between";

  const isPending = (val: string) => val === 'Pending extraction...';

  return (
    <div className="max-w-6xl mx-auto py-8">
      <input 
        type="file" 
        ref={fileInputRef} 
        id="universal-upload"
        className="hidden" 
        accept="image/*,.pdf,application/pdf,.txt,text/plain,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" 
        onChange={handleFileUpload} 
      />

      <div className="glass-effect rounded-[3.5rem] p-1 shadow-2xl shadow-slate-900/20 overflow-hidden border border-white/50">
        <div className="bg-white/40 backdrop-blur-3xl rounded-[3.4rem] overflow-hidden">
          <div className="dark-glass text-white p-10 flex flex-col md:flex-row justify-between items-center gap-6 border-b border-white/5 relative overflow-hidden group">
            <div className="shimmer-active absolute inset-0 opacity-10 pointer-events-none"></div>
            <div className="flex items-center gap-6 relative z-10">
               <div className="bg-white p-4 rounded-3xl shadow-xl hover:scale-110 transition-transform">
                 <img src="/pt-biz-logo.png" className="h-10 object-contain" alt="PT Biz" />
               </div>
               <div>
                 <h2 className="text-4xl font-black heading-font uppercase tracking-tight">Brand Intelligence</h2>
                 <p className="text-slate-300 text-base mt-1 font-medium">Extract DNA from legacy assets for consistent content generation.</p>
               </div>
            </div>
            <button 
              onClick={onClose} 
              className="w-full md:w-auto bg-blue-600 hover:bg-blue-500 text-white px-10 py-5 rounded-[2rem] font-black uppercase text-xs transition-all shadow-2xl shadow-blue-900/40 active:scale-95 flex items-center justify-center gap-3 shine-on-hover"
            >
              Confirm DNA Profile
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            </button>
          </div>

        <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-16">
          <div className="space-y-10">
            <div className="flex items-center gap-4 border-b border-slate-100 pb-5">
              <span className="w-8 h-8 rounded-full bg-slate-900 text-white text-xs flex items-center justify-center font-bold">1</span>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Ingest Branding Assets</h3>
            </div>
            <div className="space-y-8">
              <div 
                role="button"
                tabIndex={0}
                aria-label="Upload Brand Asset"
                onClick={() => !analyzing && fileInputRef.current?.click()}
                onKeyDown={(e) => handleKeyDown(e, () => !analyzing && fileInputRef.current?.click())}
                className="border-2 border-dashed border-slate-200 rounded-[3rem] p-12 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50/30 transition-all bg-white/50 min-h-[400px] flex flex-col items-center justify-center group relative overflow-hidden focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xl"
              >
                {analyzing ? (
                  <div className="space-y-8 text-center">
                    <div className="relative">
                      <div className="w-24 h-24 border-8 border-slate-100 rounded-full mx-auto"></div>
                      <div className="absolute inset-0 w-24 h-24 border-8 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    </div>
                    <div className="space-y-2">
                       <p className="text-xl font-black text-slate-900 uppercase tracking-tighter">AI Analysis in Progress</p>
                       <p className="text-blue-600 font-bold text-sm animate-pulse uppercase tracking-widest">Absorbing Legacy DNA...</p>
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
                      <p className="text-3xl font-black text-slate-900 uppercase leading-none tracking-tighter">Brand DNA Ingest</p>
                      <p className="text-slate-500 font-medium leading-relaxed text-lg">
                        Upload your logo or any supporting documents. Our AI will analyze them and extract your brand elements to the right.
                      </p>
                    </div>

                    <div className="flex flex-col items-center gap-4">
                       <span className="bg-blue-600 text-white px-10 py-5 rounded-2xl font-black uppercase text-xs shadow-2xl active:scale-95 transition-all inline-block hover:bg-blue-500 hover:scale-105 shine-on-hover">
                         Select Assets
                       </span>
                       <div className="flex items-center gap-2 px-3 py-1 bg-green-50 text-green-600 rounded-full border border-green-100 text-[9px] font-black uppercase tracking-widest">
                         <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                         Universal Compatibility Mode
                       </div>
                    </div>
                    
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">
                       Logo / PDF / TXT / DOCX / JPG
                    </p>
                  </div>
                )}
                
                {context.logoUrl && !analyzing && (
                  <div className="absolute top-6 right-6">
                    <img src={context.logoUrl} className="h-12 w-12 object-contain rounded-lg border-2 border-white shadow-lg bg-white" alt="Active Logo" />
                  </div>
                )}
              </div>
            </div>

            {context.referenceDocNames.length > 0 && (
              <div className="bg-slate-900 p-8 rounded-[2rem] shadow-xl animate-fade-in">
                <p className="text-xs font-black text-blue-400 uppercase tracking-[0.3em] mb-5">Synced Sources:</p>
                <div className="space-y-3">
                  {context.referenceDocNames.map((name, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm text-slate-300 font-medium overflow-hidden">
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

          <div className="space-y-10 bg-slate-50/80 p-10 rounded-[3rem] border border-slate-200">
            <div className="flex items-center gap-4 border-b border-slate-200 pb-5">
              <span className="w-8 h-8 rounded-full bg-slate-900 text-white text-xs flex items-center justify-center font-bold">2</span>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Verified DNA Profile</h3>
              <div 
                className={`ml-auto flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all ${isPending(context.tonality) ? 'bg-slate-100 text-slate-400 border-slate-200' : 'bg-green-50 text-green-600 border-green-200'}`}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" /></svg>
                {isPending(context.tonality) ? 'Awaiting Upload' : 'AI Verified'}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-6">
              <div className="space-y-3 text-center">
                <div className="w-full h-16 rounded-2xl shadow-lg border-2 border-white transition-all" style={{ backgroundColor: context.colors.primary }}></div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Primary</p>
                <div className="text-xs font-bold text-slate-600 py-1.5 bg-white rounded-lg border border-slate-200 shadow-sm">{context.colors.primary}</div>
              </div>
              <div className="space-y-3 text-center">
                <div className="w-full h-16 rounded-2xl shadow-lg border-2 border-white transition-all" style={{ backgroundColor: context.colors.secondary }}></div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Secondary</p>
                <div className="text-xs font-bold text-slate-600 py-1.5 bg-white rounded-lg border border-slate-200 shadow-sm">{context.colors.secondary}</div>
              </div>
              <div className="space-y-3 text-center">
                <div className="w-full h-16 rounded-2xl shadow-lg border-2 border-white transition-all" style={{ backgroundColor: context.colors.accent }}></div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Accent</p>
                <div className="text-xs font-bold text-slate-600 py-1.5 bg-white rounded-lg border border-slate-200 shadow-sm">{context.colors.accent}</div>
              </div>
            </div>

            <div className="space-y-8">
              <div>
                <label className={labelClass}>
                  Extracted Tonality
                  <span className="text-[10px] text-blue-500 font-bold tracking-normal italic flex items-center gap-1">
                    {!isPending(context.tonality) ? 'AI Extracted' : 'Awaiting Scan'}
                  </span>
                </label>
                <div className={`${inputClass} ${isPending(context.tonality) ? 'italic opacity-30' : ''}`}>
                  {context.tonality}
                </div>
              </div>
              <div>
                <label className={labelClass}>
                  Derived Styling Rules
                  <span className="text-[10px] text-blue-500 font-bold tracking-normal italic flex items-center gap-1">
                    {!isPending(context.styling) ? 'Synced' : 'Awaiting Scan'}
                  </span>
                </label>
                <div className={`${inputClass} ${isPending(context.styling) ? 'italic opacity-30' : ''}`}>
                  {context.styling}
                </div>
              </div>
              <div>
                <label className={labelClass}>
                  Core Style Nuances
                </label>
                <div className={`${inputClass} min-h-[160px] whitespace-pre-wrap leading-relaxed ${!context.styleNotes ? 'italic opacity-30' : 'text-slate-300'}`}>
                  {context.styleNotes || "Waiting for your first document upload to derive clinical nuances..."}
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
