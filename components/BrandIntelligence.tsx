
import React, { useState, useRef } from 'react';
import { BrandContext } from '../types';
import { analyzeStyleReference } from '../services/geminiService';
// @ts-ignore
import ColorThief from 'colorthief';
import * as pdfjs from 'pdfjs-dist';

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface BrandIntelligenceProps {
  context: BrandContext;
  onChange: (context: BrandContext) => void;
  onClose: () => void;
}

const BrandIntelligence: React.FC<BrandIntelligenceProps> = ({ context, onChange, onClose }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Derived state: Is there any data?
  const hasData = context.referenceDocNames.length > 0;

  const extractColors = async (dataUrl: string) => {
    return new Promise<{primary: string, secondary: string, accent: string}>((resolve) => {
      const img = new Image();
      img.onload = () => {
        const colorThief = new ColorThief();
        const palette = colorThief.getPalette(img, 3);
        const rgbToHex = (r: number, g: number, b: number) => 
          "#" + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
        
        resolve({
          primary: rgbToHex(palette[0][0], palette[0][1], palette[0][2]),
          secondary: rgbToHex(palette[1][0], palette[1][1], palette[1][2]),
          accent: rgbToHex(palette[2][0], palette[2][1], palette[2][2]),
        });
      };
      img.src = dataUrl;
    });
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    try {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const logoUrl = reader.result as string;
          const colors = await extractColors(logoUrl);
          onChange({
             ...context,
             logoUrl,
             colors,
             referenceDocNames: [...context.referenceDocNames, `Asset: ${file.name}`]
          });
          setIsAnalyzing(false);
        };
        reader.readAsDataURL(file);
      } else {
        // PDF or Text
        let text = '';
        if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
          const arr = await file.arrayBuffer();
          const pdf = await pdfjs.getDocument({ data: arr }).promise;
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            text += content.items.map((it: any) => it.str).join(' ') + '\n';
          }
        } else {
          text = await file.text();
        }

        // FORCE Gemini to analyze
        const dna = await analyzeStyleReference(text, file.name, context.logoUrl);
        
        // Critical: Only update if we got valid data back
        if (dna && dna.tonality) {
          onChange({
            ...context,
            tonality: dna.tonality,
            styling: dna.styling || context.styling,
            styleNotes: dna.styleNotes || context.styleNotes,
            colors: dna.colors || context.colors,
            referenceDocNames: [...context.referenceDocNames, `Scan: ${file.name}`]
          });
        } else {
           // Fallback for failed analysis
           onChange({
             ...context,
             referenceDocNames: [...context.referenceDocNames, `Scan: ${file.name} (Incomplete)`]
           });
           alert("AI was unable to extract specific DNA from this document. Please try a more text-heavy reference.");
        }
        setIsAnalyzing(false);
      }
    } catch (err) {
      console.error(err);
      alert("Extraction failed. Please try a different file.");
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-6">
      <input 
        id="dna-file-upload"
        name="dna-file-upload"
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        onChange={handleFile} 
        aria-label="Upload brand asset for DNA extraction"
      />
      
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Left Column: Input */}
        <div className={`transition-all duration-700 ${hasData ? 'lg:w-1/3' : 'w-full'}`}>
          <div className="bg-white rounded-[2.5rem] p-10 shadow-xl border border-slate-200 h-full">
            <div className="space-y-8">
              <div className="flex items-center gap-4">
                 <img src="/pt-biz-logo.png" className="h-8" alt="PT Biz" />
                 <h2 className="text-2xl font-black uppercase tracking-tight">DNA Ingest</h2>
              </div>
              
              <div 
                onClick={() => !isAnalyzing && fileInputRef.current?.click()}
                className={`border-4 border-dashed rounded-[2rem] p-12 text-center cursor-pointer transition-all ${isAnalyzing ? 'border-blue-500 bg-blue-50 animate-pulse' : 'border-slate-100 hover:border-blue-200 hover:bg-slate-50'}`}
              >
                {isAnalyzing ? (
                  <div className="space-y-4">
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="font-bold text-blue-600 uppercase text-xs tracking-widest">Absorbing DNA...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="w-16 h-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center mx-auto shadow-lg">
                       <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                    </div>
                    <div>
                      <p className="text-lg font-black uppercase">Upload Reference</p>
                      <p className="text-slate-400 text-sm mt-1">Logo, PDF, or Transcript</p>
                    </div>
                  </div>
                )}
              </div>

              {hasData && (
                <div className="animate-fade-in pt-8 border-t border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Ingested Sources:</p>
                  <div className="space-y-2">
                    {context.referenceDocNames.map((n, i) => (
                      <div key={i} className="flex items-center gap-3 text-sm font-bold text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <span className="truncate">{n}</span>
                      </div>
                    ))}
                  </div>
                  <button 
                    onClick={onClose}
                    className="w-full mt-8 bg-slate-900 text-white py-4 rounded-xl font-black uppercase text-xs hover:bg-blue-600 transition-colors shadow-lg"
                  >
                    Confirm & Unlock Studio
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: DNA Result (Hidden until data exists) */}
        {hasData && (
          <div className="lg:w-2/3 animate-slide-in">
            <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[100px]"></div>
              
              <div className="relative z-10 space-y-10">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-black uppercase tracking-widest text-blue-400">AI Verified Profile</h3>
                  <div className="flex items-center gap-2 px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-[10px] font-black uppercase">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></div>
                    Engine Synced
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {['primary', 'secondary', 'accent'].map((key) => (
                    <div key={key} className="space-y-3">
                       <div className="w-full h-20 rounded-2xl shadow-xl border-4 border-white/10" style={{ backgroundColor: (context.colors as any)[key] }}></div>
                       <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] text-center">{key}</p>
                       <div className="bg-white/5 p-2 rounded-lg text-center font-mono text-xs border border-white/5">{(context.colors as any)[key]}</div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6">
                  <div className="space-y-3">
                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Tonality</p>
                    <div className="bg-white/5 p-6 rounded-2xl border border-white/5 min-h-[100px] leading-relaxed">
                      {context.tonality}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Styling Rules</p>
                    <div className="bg-white/5 p-6 rounded-2xl border border-white/5 min-h-[100px] leading-relaxed">
                      {context.styling}
                    </div>
                  </div>
                </div>

                <div className="space-y-3 pt-4">
                  <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Clinical Nuances</p>
                  <div className="bg-white/5 p-6 rounded-2xl border border-white/5 min-h-[140px] whitespace-pre-wrap leading-relaxed text-slate-400">
                    {context.styleNotes}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BrandIntelligence;
