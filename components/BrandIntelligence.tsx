
import React, { useState, useRef, useEffect } from 'react';
import { BrandContext } from '../types';
import { analyzeStyleReference } from '../services/geminiService';
// @ts-ignore
import ColorThief from 'colorthief';
import * as pdfjs from 'pdfjs-dist';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

interface BrandIntelligenceProps {
  context: BrandContext;
  onChange: (context: BrandContext) => void;
  onClose: () => void;
}

const BrandIntelligence: React.FC<BrandIntelligenceProps> = ({ context, onChange, onClose }) => {
  const [analyzing, setAnalyzing] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

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

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const logoUrl = reader.result as string;
        setAnalyzing(true);
        try {
          const extractedColors = await extractColorsFromImage(logoUrl);
          onChange({ 
            ...context, 
            logoUrl,
            colors: extractedColors
          });
        } catch (err) {
          console.error("Failed to extract colors", err);
          onChange({ ...context, logoUrl });
        } finally {
          setAnalyzing(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const extractTextFromPdf = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += pageText + '\n';
    }
    return fullText;
  };

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAnalyzing(true);
      try {
        let text = '';
        if (file.type === 'application/pdf') {
          text = await extractTextFromPdf(file);
        } else {
          text = await file.text();
          // Basic check for binary signatures to prevent corrupt extraction attempts for non-PDF binary files
          if (text.slice(0, 100).includes('\ufffd') || text.slice(0, 100).includes('\0')) {
             alert("For the most accurate 'Brand DNA' extraction, please upload a plain text (.txt) export or a PDF.");
             setAnalyzing(false);
             return;
          }
        }

        const extractedBrand = await analyzeStyleReference(text, file.name);
        
        onChange({
          ...context,
          colors: extractedBrand.colors || context.colors,
          tonality: extractedBrand.tonality || context.tonality,
          styling: extractedBrand.styling || context.styling,
          styleNotes: (context.styleNotes + "\n\n" + (extractedBrand.styleNotes || "")).trim(),
          referenceDocNames: [...context.referenceDocNames, file.name]
        });
      } catch (err) {
        console.error(err);
        alert("Extraction failed. Please try a standard text (.txt) file or valid PDF.");
      } finally {
        setAnalyzing(false);
      }
    }
  };

  const inputClass = "w-full p-4 bg-[#1e293b] text-white border-none rounded-xl text-sm font-medium opacity-90 cursor-default shadow-inner transition-all hover:bg-[#2d3a4f]";
  const labelClass = "text-xs font-black text-slate-400 uppercase tracking-widest block mb-3 flex items-center justify-between";

  return (
    <div className="max-w-6xl mx-auto py-8">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-[#101828] text-white p-10 flex flex-col md:flex-row justify-between items-center gap-6 border-b border-slate-800">
          <div>
            <h2 className="text-4xl font-black heading-font uppercase tracking-tight">Brand Intelligence Profile</h2>
            <p className="text-slate-400 text-base mt-2">Gemini extracts your DNA from legacy assets for consistent content generation.</p>
          </div>
          <button 
            onClick={onClose} 
            className="w-full md:w-auto bg-blue-600 hover:bg-blue-500 text-white px-10 py-4 rounded-2xl font-bold uppercase text-sm transition-all shadow-xl shadow-blue-900/40 active:scale-95 flex items-center justify-center gap-2"
          >
            Confirm Brand Profile
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          </button>
        </div>

        <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-16">
          {/* STEP 1: ASSET INGESTION */}
          <div className="space-y-10">
            <div className="flex items-center gap-4 border-b border-slate-100 pb-5">
              <span className="w-8 h-8 rounded-full bg-slate-900 text-white text-xs flex items-center justify-center font-bold">1</span>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Ingest Branding Assets</h3>
            </div>
            
            <div className="space-y-8">
              {/* Logo Picker */}
              <div 
                role="button"
                tabIndex={0}
                aria-label="Upload Brand Logo"
                onClick={() => logoInputRef.current?.click()}
                onKeyDown={(e) => handleKeyDown(e, () => logoInputRef.current?.click())}
                className="border-2 border-dashed border-slate-200 rounded-[2.5rem] p-8 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50/50 transition-all bg-slate-50 h-52 flex flex-col items-center justify-center group relative overflow-hidden focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                {context.logoUrl ? (
                  <div className="relative h-full w-full flex items-center justify-center">
                    <img src={context.logoUrl} className="max-h-full max-w-full object-contain p-4 drop-shadow-md" alt="Brand Logo" />
                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                      <span className="text-white text-xs font-black uppercase tracking-widest bg-blue-600 px-5 py-2 rounded-lg">Update Logo</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-slate-400 space-y-3">
                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto shadow-sm group-hover:text-blue-500 transition-colors">
                      <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <p className="font-bold text-xs uppercase tracking-widest">Select Brand Logo</p>
                    <p className="text-[10px] opacity-60">PNG, JPG, SVG supported</p>
                  </div>
                )}
                <input 
                  type="file" 
                  ref={logoInputRef} 
                  hidden 
                  accept="image/png, image/jpeg, image/jpg, image/svg+xml, image/webp" 
                  onChange={handleLogoUpload} 
                />
              </div>

              {/* Document/Resource Picker */}
              <div 
                role="button"
                tabIndex={0}
                aria-label="Upload Resource Document"
                onClick={() => docInputRef.current?.click()}
                onKeyDown={(e) => handleKeyDown(e, () => docInputRef.current?.click())}
                className="border-2 border-dashed border-slate-200 rounded-[2.5rem] p-8 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50/50 transition-all bg-slate-50 h-52 flex flex-col items-center justify-center group focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                {analyzing ? (
                  <div className="space-y-5">
                    <div className="w-14 h-14 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="text-xs font-black text-blue-600 animate-pulse uppercase tracking-[0.2em]">Extracting Brand DNA...</p>
                  </div>
                ) : (
                  <div className="text-slate-400 space-y-3 px-6">
                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto shadow-sm group-hover:text-blue-500 transition-colors">
                      <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <p className="font-bold text-xs uppercase tracking-widest">Upload Resource Doc</p>
                    <p className="text-[10px] uppercase tracking-tighter opacity-70">PDF, DOCX, or TXT preferred</p>
                  </div>
                )}
                <input 
                  type="file" 
                  ref={docInputRef} 
                  hidden 
                  accept=".txt,.csv,.pdf,.doc,.docx,text/plain,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" 
                  onChange={handleDocUpload} 
                  disabled={analyzing} 
                />
              </div>
            </div>

            {context.referenceDocNames.length > 0 && (
              <div className="bg-slate-900 p-8 rounded-[2rem] shadow-xl animate-fade-in">
                <p className="text-xs font-black text-blue-400 uppercase tracking-[0.3em] mb-5">Synced Knowledge Source:</p>
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

          {/* STEP 2: VERIFIED DNA PROFILE */}
          <div className="space-y-10 bg-slate-50/80 p-10 rounded-[3rem] border border-slate-200">
            <div className="flex items-center gap-4 border-b border-slate-200 pb-5">
              <span className="w-8 h-8 rounded-full bg-slate-900 text-white text-xs flex items-center justify-center font-bold">2</span>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Verified Brand Profile</h3>
              <div className="ml-auto flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-green-100 shadow-sm animate-pulse">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" /></svg>
                Active Memory
              </div>
            </div>

            {/* Extracted Colors */}
            <div className="grid grid-cols-3 gap-6">
              <div className="space-y-3 text-center">
                <div className="w-full h-16 rounded-2xl shadow-lg border-2 border-white transition-transform hover:scale-105" style={{ backgroundColor: context.colors.primary }}></div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Primary</p>
                <div className="text-xs font-bold text-slate-600 py-1.5 bg-white rounded-lg border border-slate-200 shadow-sm">{context.colors.primary}</div>
              </div>
              <div className="space-y-3 text-center">
                <div className="w-full h-16 rounded-2xl shadow-lg border-2 border-white transition-transform hover:scale-105" style={{ backgroundColor: context.colors.secondary }}></div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Secondary</p>
                <div className="text-xs font-bold text-slate-600 py-1.5 bg-white rounded-lg border border-slate-200 shadow-sm">{context.colors.secondary}</div>
              </div>
              <div className="space-y-3 text-center">
                <div className="w-full h-16 rounded-2xl shadow-lg border-2 border-white transition-transform hover:scale-105" style={{ backgroundColor: context.colors.accent }}></div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Accent</p>
                <div className="text-xs font-bold text-slate-600 py-1.5 bg-white rounded-lg border border-slate-200 shadow-sm">{context.colors.accent}</div>
              </div>
            </div>

            {/* Extracted Voice & Nuance */}
            <div className="space-y-8">
              <div>
                <label className={labelClass}>
                  Extracted Tonality
                  <span className="text-[10px] text-blue-500 font-bold tracking-normal italic flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1a1 1 0 112 0v1a1 1 0 11-2 0zM13 16v-1a1 1 0 112 0v1a1 1 0 11-2 0zM14.5 12a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" /></svg>
                    AI Extracted
                  </span>
                </label>
                <div className={inputClass}>{context.tonality}</div>
              </div>
              <div>
                <label className={labelClass}>
                  Derived Styling Rules
                  <span className="text-[10px] text-blue-500 font-bold tracking-normal italic flex items-center gap-1">
                     <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1a1 1 0 112 0v1a1 1 0 11-2 0zM13 16v-1a1 1 0 112 0v1a1 1 0 11-2 0zM14.5 12a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" /></svg>
                    Synced
                  </span>
                </label>
                <div className={inputClass}>{context.styling}</div>
              </div>
              <div>
                <label className={labelClass}>
                  Core Style Nuances
                </label>
                <div className={`${inputClass} min-h-[160px] whitespace-pre-wrap leading-relaxed text-slate-300`}>
                  {context.styleNotes || "Upload a document to automatically populate style notes. We use these for all future asset generation to ensure clinical excellence and brand consistency."}
                </div>
              </div>
            </div>

            <div className="text-center pt-6 border-t border-slate-200">
               <p className="text-xs text-slate-400 italic">
                Your Brand DNA is automatically saved and applied to all future generations.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrandIntelligence;
