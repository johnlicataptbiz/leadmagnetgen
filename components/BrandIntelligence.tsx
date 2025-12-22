
import React, { useState, useRef } from 'react';
import { BrandContext } from '../types';
import { analyzeStyleReference } from '../services/geminiService';
// @ts-ignore
import ColorThief from 'colorthief';

let pdfWorkerSrc: string | null = null;
let pdfjsModulePromise: Promise<any> | null = null;

const loadPdfjs = async () => {
  if (!pdfjsModulePromise) {
    pdfjsModulePromise = import('pdfjs-dist');
  }
  const mod = await pdfjsModulePromise;
  if (!pdfWorkerSrc) {
    // @ts-ignore
    const workerMod = await import('pdfjs-dist/build/pdf.worker?url');
    pdfWorkerSrc = workerMod.default || workerMod;
  }
  mod.GlobalWorkerOptions.workerSrc = pdfWorkerSrc;
  return mod;
};

interface BrandIntelligenceProps {
  context: BrandContext;
  onChange: (context: BrandContext) => void;
  onClose: () => void;
}

const ensureHex = (color: string | undefined, fallback: string): string => {
  if (!color) return fallback;
  const hexRegex = /^#([A-Fa-f0-9]{3}){1,2}$/;
  if (hexRegex.test(color)) return color;
  
  // Basic named color to hex map (for common AI hallucinations)
  const map: Record<string, string> = {
    'navy': '#101828',
    'navy blue': '#101828',
    'black': '#000000',
    'white': '#FFFFFF',
    'electric blue': '#2563EB',
    'blue': '#2563EB',
    'red': '#EF4444',
    'green': '#22C55E'
  };
  
  const lower = color.toLowerCase().trim();
  return map[lower] || fallback;
};

const BrandIntelligence: React.FC<BrandIntelligenceProps> = ({ context, onChange, onClose }) => {
  const [processingState, setProcessingState] = useState<{type: 'logo' | 'pdf' | null, progress: number}>({ type: null, progress: 0 });
  const [pdfName, setPdfName] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPdfEngineLoading, setIsPdfEngineLoading] = useState(false);
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  // Derived state: Is there any data?
  const hasData = context.referenceDocNames.length > 0 || context.logoUrl;
  const isProcessing = processingState.type !== null;

  const simulateProgress = () => {
    setProcessingState(prev => ({ ...prev, progress: 0 }));
    const interval = setInterval(() => {
      setProcessingState(prev => {
        if (prev.progress >= 90) {
          clearInterval(interval);
          return prev;
        }
        // Fast at first, slower at end
        const increment = prev.progress < 50 ? 5 : prev.progress < 80 ? 2 : 0.5;
        return { ...prev, progress: Math.min(90, prev.progress + increment) };
      });
    }, 100);
    return interval;
  };

  const extractColors = async (dataUrl: string) => {
    return new Promise<{primary: string, secondary: string, accent: string}>((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const colorThief = new ColorThief();
          // Get 10 colors to choose from
          const palette = colorThief.getPalette(img, 10);
          const rgbToHex = (r: number, g: number, b: number) => 
            "#" + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
          
          // Simple distinctness filter
          const uniqueColors: string[] = [];
          
          // Helper to check if color is too similar to existing ones
          const isDistinct = (r: number, g: number, b: number) => {
            if (uniqueColors.length === 0) return true;
            return uniqueColors.every(hex => {
              const r2 = parseInt(hex.substring(1, 3), 16);
              const g2 = parseInt(hex.substring(3, 5), 16);
              const b2 = parseInt(hex.substring(5, 7), 16);
              const dist = Math.sqrt(Math.pow(r - r2, 2) + Math.pow(g - g2, 2) + Math.pow(b - b2, 2));
              return dist > 30; // Threshold for distinctness
            });
          }

          // Pick top 3 distinct colors (allowing white/black)
          for (const [r, g, b] of palette) {
             if (isDistinct(r, g, b) && uniqueColors.length < 3) {
                uniqueColors.push(rgbToHex(r, g, b));
             }
          }
          
          // Fill if less than 3
          while (uniqueColors.length < 3) {
            uniqueColors.push('#ffffff'); // Fallback to white
          }

          resolve({
            primary: uniqueColors[0],
            secondary: uniqueColors[1],
            accent: uniqueColors[2],
          });
        } catch (err) {
          console.error('Color extraction failed:', err);
          resolve(context.colors);
        }
      };
      img.onerror = () => resolve(context.colors);
      img.src = dataUrl;
    });
  };

  const extractPdfText = async (file: File): Promise<string> => {
    try {
      const needsInit = !pdfjsModulePromise;
      if (needsInit) {
        setIsPdfEngineLoading(true);
      }
      const { getDocument } = await loadPdfjs();
      if (needsInit) {
        setIsPdfEngineLoading(false);
      }
      const data = await file.arrayBuffer();
      const pdf = await getDocument({ data }).promise;
      const pageCount = Math.min(pdf.numPages, 6);
      let text = '';
      for (let i = 1; i <= pageCount; i += 1) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items.map((item: any) => item.str).join(' ');
        text += `\n${pageText}`;
        if (text.length > 20000) break;
      }
      const normalized = text.replace(/\s+/g, ' ').trim();
      if (normalized.length > 0) return normalized;
    } catch (err) {
      console.warn('PDF text extraction failed, falling back to raw text', err);
      setIsPdfEngineLoading(false);
    }

    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  const analyzePDF = async (file: File): Promise<Partial<BrandContext>> => {
    const text = await extractPdfText(file);
    return await analyzeStyleReference(text, file.name, context.logoUrl);
  };

  const addReferenceDoc = (label: string, nextContext: BrandContext) => {
    // Smart-filter: If adding a Logo or Lead Magnet, remove previous ones to keep context clean
    let nextList = nextContext.referenceDocNames;
    if (label.startsWith('Logo:')) {
       nextList = nextList.filter(n => !n.startsWith('Logo:'));
    } else if (label.startsWith('Lead Magnet:')) {
       nextList = nextList.filter(n => !n.startsWith('Lead Magnet:'));
    }
    const next = Array.from(new Set([...nextList, label]));
    onChange({ ...nextContext, referenceDocNames: next });
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMessage(null);

    if (e.target.name === 'dna-file-upload') {
        // LOGO UPLOAD
        setProcessingState({ type: 'logo', progress: 0 });
        const interval = simulateProgress();
        
        try {
            const reader = new FileReader();
            reader.onloadend = async () => {
              const logoUrl = reader.result as string;
              const colors = await extractColors(logoUrl);
              clearInterval(interval);
              setProcessingState({ type: 'logo', progress: 100 });
              
              setTimeout(() => {
                  const nextContext = {
                     ...context,
                     logoUrl,
                     colors
                  };
                  addReferenceDoc(`Logo: ${file.name}`, nextContext);
                  setProcessingState({ type: null, progress: 0 });
              }, 500);
            };
            reader.readAsDataURL(file);
        } catch (err) {
            clearInterval(interval);
            console.error(err);
            setErrorMessage("Logo analysis failed. Please try a different file.");
            setProcessingState({ type: null, progress: 0 });
        }
    } else {
        // PDF UPLOAD
        setProcessingState({ type: 'pdf', progress: 0 });
        const interval = simulateProgress();
        
        try {
            const analysis = await analyzePDF(file);
            clearInterval(interval);
            setProcessingState({ type: 'pdf', progress: 100 });
            setPdfName(file.name);

            setTimeout(() => {
                const nextContext = {
                  ...context,
                  tonality: analysis.tonality || context.tonality,
                  styling: analysis.styling || context.styling,
                  styleNotes: analysis.styleNotes || context.styleNotes,
                  colors: {
                    primary: ensureHex(analysis.colors?.primary, context.colors.primary),
                    secondary: ensureHex(analysis.colors?.secondary, context.colors.secondary),
                    accent: ensureHex(analysis.colors?.accent, context.colors.accent),
                  }
                };
                addReferenceDoc(`Lead Magnet: ${file.name}`, nextContext);
                setProcessingState({ type: null, progress: 0 });
            }, 500);
        } catch (err) {
            clearInterval(interval);
            console.error(err);
            setErrorMessage(err instanceof Error ? err.message : "PDF analysis failed. Please try again.");
            setProcessingState({ type: null, progress: 0 });
        }
    }
  };

  const updateField = (field: keyof BrandContext, value: string) => {
    onChange({ ...context, [field]: value });
  };

  const updateColor = (colorKey: 'primary' | 'secondary' | 'accent', value: string) => {
    // Only set if it looks like a hex code or color name (input color will handle it)
    onChange({
      ...context,
      colors: { ...context.colors, [colorKey]: value }
    });
  };

  return (
    <div className="max-w-7xl mx-auto py-6">
      {errorMessage && (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-700 flex items-start justify-between gap-6">
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
            title="Dismiss error message"
          >
            Dismiss
          </button>
        </div>
      )}
      <input 
        id="dna-file-upload"
        name="dna-file-upload"
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        onChange={handleFile}
        accept="image/*"
        aria-label="Upload brand logo"
      />
      <input 
        id="pdf-upload"
        name="pdf-upload"
        type="file" 
        ref={pdfInputRef} 
        className="hidden" 
        onChange={handleFile}
        accept=".pdf"
        aria-label="Upload lead magnet PDF"
      />
      
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Left Column: Upload */}
        <div className={`transition-all duration-500 ${hasData ? 'lg:w-1/3' : 'w-full max-w-xl mx-auto'}`}>
          <div className="bg-white rounded-[2.5rem] p-10 shadow-xl border border-slate-200 h-full">
            <div className="space-y-8">
              <div className="flex items-center gap-4">
                 <img src="/pt-biz-logo.png" className="h-8" alt="PT Biz" />
                 <h2 className="text-2xl font-black uppercase tracking-tight">Brand Setup</h2>
              </div>

              {hasData && (
                <button 
                  onClick={onClose}
                  className="w-full bg-slate-900 text-white py-4 rounded-xl font-black uppercase text-xs hover:bg-blue-600 transition-colors shadow-lg"
                >
                  Save & Continue
                </button>
              )}
              
              {/* Logo Upload UI */}
              <div 
                onClick={() => !isProcessing && fileInputRef.current?.click()}
                className={`border-4 border-dashed rounded-[2rem] p-12 text-center cursor-pointer transition-all ${isProcessing && processingState.type === 'logo' ? 'border-blue-500 bg-blue-50' : 'border-slate-100 hover:border-blue-200 hover:bg-slate-50 relative overflow-hidden'}`}
              >
                {isProcessing && processingState.type === 'logo' ? (
                  <div className="space-y-4 brand-progress-container">
                     <style>{`
                        .brand-progress-container { --progress: ${processingState.progress}%; }
                        .brand-progress-bar { width: var(--progress); }
                     `}</style>
                     <div className="w-full h-2 bg-blue-200 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-600 transition-all duration-300 ease-out brand-progress-bar"></div>
                     </div>
                     <p className="font-bold text-blue-600 uppercase text-xs tracking-widest">Analyzing Logo... {Math.round(processingState.progress)}%</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {context.logoUrl ? (
                      <img src={context.logoUrl} className="h-20 object-contain mx-auto" alt="Uploaded Logo" />
                    ) : (
                      <div className="w-16 h-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center mx-auto shadow-lg">
                         <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                      </div>
                    )}
                    <div>
                      <p className="text-lg font-black uppercase">{context.logoUrl ? 'Change Logo' : 'Upload Logo'}</p>
                      <p className="text-slate-400 text-sm mt-1">Extracts colors automatically</p>
                    </div>
                  </div>
                )}
              </div>

              {/* PDF / Lead Magnet Upload UI */}
              <div 
                onClick={() => !isProcessing && pdfInputRef.current?.click()}
                className={`border-4 border-dashed rounded-[2rem] p-8 text-center cursor-pointer transition-all ${isProcessing && processingState.type === 'pdf' ? 'border-blue-500 bg-blue-50' : 'border-slate-100 hover:border-blue-200 hover:bg-slate-50'}`}
              >
                  {isProcessing && processingState.type === 'pdf' ? (
                    <div className="space-y-4 brand-progress-container">
                      <style>{`
                        .brand-progress-container { --progress: ${processingState.progress}%; }
                        .brand-progress-bar { width: var(--progress); }
                      `}</style>
                      {isPdfEngineLoading && (
                        <div className="flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                          <div className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                          Initializing PDF engine...
                        </div>
                      )}
                       <div className="w-full h-2 bg-blue-200 rounded-full overflow-hidden">
                           <div className="h-full bg-blue-600 transition-all duration-300 ease-out brand-progress-bar"></div>
                        </div>
                        <p className="font-bold text-blue-600 uppercase text-xs tracking-widest">Scanning Document... {Math.round(processingState.progress)}%</p>
                    </div>
                 ) : (
                     <div className="space-y-3">
                        <div className={`w-12 h-12 ${pdfName ? 'bg-green-100 text-green-600' : 'bg-white text-slate-400'} border-2 border-slate-100 rounded-xl flex items-center justify-center mx-auto shadow-sm transition-colors`}>
                           {pdfName ? (
                               <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                           ) : (
                               <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                           )}
                        </div>
                        <div>
                          <p className="text-sm font-black uppercase text-slate-700">{pdfName ? 'Change Lead Magnet' : 'Upload Lead Magnet PDF'}</p>
                          {pdfName ? (
                              <p className="text-green-600 text-[10px] mt-1 font-bold truncate max-w-[200px] mx-auto">{pdfName}</p>
                          ) : (
                              <p className="text-slate-400 text-[10px] mt-1">AI extracts tonality & style</p>
                          )}
                        </div>
                     </div>
                 )}
              </div>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest text-center">
                Best results with text-based PDFs under 5MB. Scanned images may be less accurate.
              </p>

              {hasData && (
                <div className="animate-fade-in pt-8 border-t border-slate-100">
                  {context.referenceDocNames.length > 0 && (
                    <>
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Context Sources</p>
                        <button 
                          onClick={() => onChange({ ...context, referenceDocNames: [] })}
                          className="text-[10px] font-bold text-slate-300 uppercase hover:text-red-500 transition-colors"
                        >
                          Clear History
                        </button>
                      </div>
                      <div className="space-y-2">
                        {context.referenceDocNames.map((n, i) => (
                          <div key={i} className="flex items-center justify-between text-sm font-bold text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 group hover:border-blue-200 transition-all">
                            <div className="flex items-center gap-3 overflow-hidden">
                              <div className={`w-2 h-2 rounded-full ${n.toLowerCase().includes('logo') ? 'bg-purple-500' : 'bg-blue-500'}`}></div>
                              <span className="truncate">{n}</span>
                            </div>
                            <button 
                              onClick={() => {
                                const next = context.referenceDocNames.filter((_, idx) => idx !== i);
                                onChange({ ...context, referenceDocNames: next });
                              }}
                              className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all p-1"
                              title="Remove from context"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Brand Profile Editor */}
        {hasData && (
          <div className="lg:w-2/3 animate-slide-in">
            <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[100px]"></div>
              
              <div className="relative z-10 space-y-8">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-black uppercase tracking-widest text-blue-400">Brand Profile</h3>
                  <div className="flex items-center gap-2 px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-[10px] font-black uppercase">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></div>
                    Ready
                  </div>
                </div>

                {/* Color Pickers */}
                <div className="space-y-4">
                  <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Brand Colors</p>
                  <div className="grid grid-cols-3 gap-4">
                    {(['primary', 'secondary', 'accent'] as const).map((key) => (
                      <div key={key} className="space-y-3">
                         <label className="block">
                           <span className="sr-only">{key} color picker</span>
                           <input 
                             type="color" 
                             value={context.colors[key]}
                             onChange={(e) => updateColor(key, e.target.value)}
                             className="w-full h-16 rounded-xl cursor-pointer border-4 border-white/10"
                             title={`Select ${key} color`}
                             aria-label={`${key} color picker`}
                           />
                         </label>
                         <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] text-center">{key}</p>
                         <input
                           type="text"
                           value={context.colors[key]}
                           onChange={(e) => updateColor(key, e.target.value)}
                           className="w-full bg-white/5 p-2 rounded-lg text-center font-mono text-xs border border-white/5 text-white"
                           placeholder="#000000"
                           title={`${key} hex color value`}
                           aria-label={`${key} hex color value`}
                         />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tonality & Styling */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="block text-[10px] font-black text-blue-400 uppercase tracking-widest">
                      Brand Voice / Tonality
                    </label>
                    <textarea
                      value={context.tonality}
                      onChange={(e) => updateField('tonality', e.target.value)}
                      placeholder="e.g., Professional, authoritative, data-driven with a focus on results..."
                      className="w-full bg-white/5 p-4 rounded-2xl border border-white/5 min-h-[120px] text-white placeholder-slate-500 resize-none"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="block text-[10px] font-black text-blue-400 uppercase tracking-widest">
                      Style Guidelines
                    </label>
                    <textarea
                      value={context.styling}
                      onChange={(e) => updateField('styling', e.target.value)}
                      placeholder="e.g., Bold headlines, clean layouts, plenty of white space..."
                      className="w-full bg-white/5 p-4 rounded-2xl border border-white/5 min-h-[120px] text-white placeholder-slate-500 resize-none"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-3">
                  <label className="block text-[10px] font-black text-blue-400 uppercase tracking-widest">
                    Additional Notes
                  </label>
                  <textarea
                    value={context.styleNotes}
                    onChange={(e) => updateField('styleNotes', e.target.value)}
                    placeholder="Any specific terms, phrases, or formatting rules to follow..."
                    className="w-full bg-white/5 p-4 rounded-2xl border border-white/5 min-h-[100px] text-white placeholder-slate-500 resize-none"
                  />
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
