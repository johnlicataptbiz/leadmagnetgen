
import React, { useState, useRef } from 'react';
import { BrandContext } from '../types';
import { analyzeStyleReference } from '../services/geminiService';

interface BrandIntelligenceProps {
  context: BrandContext;
  onChange: (context: BrandContext) => void;
  onClose: () => void;
}

const BrandIntelligence: React.FC<BrandIntelligenceProps> = ({ context, onChange, onClose }) => {
  const [analyzing, setAnalyzing] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onChange({ ...context, logoUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAnalyzing(true);
      try {
        // AI extraction handles the text content. 
        // Note: For binary formats like PDF/DOCX, this demo uses basic text reading.
        const text = await file.text();
        
        // Basic check for binary signatures to prevent corrupt extraction attempts
        if (text.slice(0, 100).includes('\ufffd') || text.slice(0, 100).includes('\0')) {
          alert("This file is in a binary format (PDF/DOCX). For the most accurate 'Brand DNA' extraction, please upload a plain text (.txt) export or copy-paste the text content.");
          setAnalyzing(false);
          return;
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
        alert("Extraction failed. Please try a standard text (.txt) file.");
      } finally {
        setAnalyzing(false);
      }
    }
  };

  // UI Styles: Dark, premium inputs for Step 2 that are now read-only to represent "AI Verified" data.
  const inputClass = "w-full p-3 bg-[#1e293b] text-white border-none rounded text-xs font-medium opacity-90 cursor-default shadow-inner";
  const labelClass = "text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 flex items-center justify-between";

  return (
    <div className="max-w-6xl mx-auto py-8">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-[#101828] text-white p-8 flex justify-between items-center border-b border-slate-800">
          <div>
            <h2 className="text-3xl font-black heading-font uppercase tracking-tight">Brand Intelligence Profile</h2>
            <p className="text-slate-400 text-sm">Gemini extracts your DNA from legacy assets for consistent content generation.</p>
          </div>
          <button 
            onClick={onClose} 
            className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl font-bold uppercase text-xs transition-all shadow-lg shadow-blue-900/40 active:scale-95"
          >
            Confirm Brand Profile
          </button>
        </div>

        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* STEP 1: ASSET INGESTION */}
          <div className="space-y-8">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-[10px] flex items-center justify-center font-bold">1</span>
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Ingest Branding Assets</h3>
            </div>
            
            <div className="space-y-6">
              {/* Logo Picker */}
              <div 
                onClick={() => logoInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 rounded-3xl p-6 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50/50 transition-all bg-slate-50 h-44 flex flex-col items-center justify-center group relative overflow-hidden"
              >
                {context.logoUrl ? (
                  <div className="relative h-full w-full flex items-center justify-center">
                    <img src={context.logoUrl} className="max-h-full max-w-full object-contain p-2" alt="Brand Logo" />
                    <div className="absolute inset-0 bg-slate-900/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                      <span className="text-white text-[10px] font-black uppercase tracking-widest bg-blue-600 px-3 py-1 rounded">Update Logo</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-slate-400 space-y-2">
                    <svg className="w-12 h-12 mx-auto opacity-30 group-hover:text-blue-500 group-hover:opacity-100 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="font-bold text-[11px] uppercase tracking-widest">Select Brand Logo</p>
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
                onClick={() => docInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 rounded-3xl p-6 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50/50 transition-all bg-slate-50 h-44 flex flex-col items-center justify-center group"
              >
                {analyzing ? (
                  <div className="space-y-4">
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="text-[10px] font-black text-blue-600 animate-pulse uppercase tracking-[0.2em]">Extracting Brand DNA...</p>
                  </div>
                ) : (
                  <div className="text-slate-400 space-y-2 px-4">
                    <svg className="w-12 h-12 mx-auto opacity-30 group-hover:text-blue-500 group-hover:opacity-100 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="font-bold text-[11px] uppercase tracking-widest">Upload Resource Doc</p>
                    <p className="text-[9px] uppercase tracking-tighter opacity-50">Upload .TXT, .CSV, .PDF, or .DOCX to sync Brand Voice</p>
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
              <div className="bg-slate-900 p-6 rounded-2xl shadow-xl">
                <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] mb-4">Synced Knowledge:</p>
                <div className="space-y-2">
                  {context.referenceDocNames.map((name, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-slate-400 font-medium overflow-hidden">
                       <svg className="w-3 h-3 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" /></svg>
                       <span className="truncate">{name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* STEP 2: VERIFIED DNA PROFILE - READ ONLY PER USER REQUEST */}
          <div className="space-y-8 bg-slate-50/50 p-6 rounded-3xl border border-slate-100">
            <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
              <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-[10px] flex items-center justify-center font-bold">2</span>
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Verified Brand Profile</h3>
              <div className="ml-auto flex items-center gap-1.5 px-2 py-1 bg-green-50 text-green-600 rounded text-[9px] font-black uppercase tracking-widest border border-green-100">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" /></svg>
                AI Verified
              </div>
            </div>

            {/* Extracted Colors */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2 text-center">
                <div className="w-full h-14 rounded-xl shadow-inner border border-slate-200" style={{ backgroundColor: context.colors.primary }}></div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Primary</p>
                <div className="text-[10px] font-bold text-slate-600 py-1 bg-white rounded border border-slate-100">{context.colors.primary}</div>
              </div>
              <div className="space-y-2 text-center">
                <div className="w-full h-14 rounded-xl shadow-inner border border-slate-200" style={{ backgroundColor: context.colors.secondary }}></div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Secondary</p>
                <div className="text-[10px] font-bold text-slate-600 py-1 bg-white rounded border border-slate-100">{context.colors.secondary}</div>
              </div>
              <div className="space-y-2 text-center">
                <div className="w-full h-14 rounded-xl shadow-inner border border-slate-200" style={{ backgroundColor: context.colors.accent }}></div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Accent</p>
                <div className="text-[10px] font-bold text-slate-600 py-1 bg-white rounded border border-slate-100">{context.colors.accent}</div>
              </div>
            </div>

            {/* Extracted Voice & Nuance - Read Only */}
            <div className="space-y-6">
              <div>
                <label className={labelClass}>
                  Extracted Tonality
                  <span className="text-[8px] text-blue-500 font-bold tracking-normal italic">Automated</span>
                </label>
                <div className={inputClass}>{context.tonality}</div>
              </div>
              <div>
                <label className={labelClass}>
                  Derived Styling Rules
                  <span className="text-[8px] text-blue-500 font-bold tracking-normal italic">Automated</span>
                </label>
                <div className={inputClass}>{context.styling}</div>
              </div>
              <div>
                <label className={labelClass}>
                  Core Style Nuances
                  <span className="text-[8px] text-blue-500 font-bold tracking-normal italic">Automated</span>
                </label>
                <div className={`${inputClass} min-h-[120px] whitespace-pre-wrap leading-relaxed`}>
                  {context.styleNotes || "Upload a document to automatically populate style notes..."}
                </div>
              </div>
            </div>

            <p className="text-[10px] text-slate-400 text-center italic border-t pt-4">
              To update this profile, upload a new source material in Step 1.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrandIntelligence;
