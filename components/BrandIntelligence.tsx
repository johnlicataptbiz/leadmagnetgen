
import React, { useState, useRef } from 'react';
import { BrandContext } from '../types';
// @ts-ignore
import ColorThief from 'colorthief';

interface BrandIntelligenceProps {
  context: BrandContext;
  onChange: (context: BrandContext) => void;
  onClose: () => void;
}

const BrandIntelligence: React.FC<BrandIntelligenceProps> = ({ context, onChange, onClose }) => {
  const [processingState, setProcessingState] = useState<{type: 'logo' | 'pdf' | null, progress: number}>({ type: null, progress: 0 });
  const [pdfName, setPdfName] = useState<string | null>(null);
  
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

  const analyzePDF = async (file: File): Promise<{tonality: string, styling: string, styleNotes: string}> => {
    const reader = new FileReader();
    return new Promise((resolve, reject) => {
      reader.onload = async () => {
        try {
          const text = reader.result as string;
          const sample = text.substring(0, 10000);
          
          const response = await fetch('/api/ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'text',
              payload: {
                prompt: `Analyze this lead magnet context. Extract brand voice/tone, visual style guide, and any inferred color palette hints (e.g. "uses blue and orange").\n\n${sample}`,
                systemInstruction: `Extract: 
1. Tonality (voice/tone), 
2. Styling (formatting patterns), 
3. Style Notes (unique characteristics + any color hints found in text). 
Be concise.`,
                responseSchema: {
                  type: 'object',
                  properties: {
                    tonality: { type: 'string' },
                    styling: { type: 'string' },
                    styleNotes: { type: 'string' }
                  }
                }
              }
            })
          });

          if (!response.ok) throw new Error('AI analysis failed');
          const result = await response.json();
          resolve(result);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
                  onChange({
                     ...context,
                     logoUrl,
                     colors,
                     referenceDocNames: [...context.referenceDocNames, `Logo: ${file.name}`]
                  });
                  setProcessingState({ type: null, progress: 0 });
              }, 500);
            };
            reader.readAsDataURL(file);
        } catch (err) {
            clearInterval(interval);
            console.error(err);
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
                onChange({
                  ...context,
                  tonality: analysis.tonality,
                  styling: analysis.styling,
                  styleNotes: analysis.styleNotes,
                  referenceDocNames: [...context.referenceDocNames, `Lead Magnet: ${file.name}`]
                });
                setProcessingState({ type: null, progress: 0 });
            }, 500);
        } catch (err) {
            clearInterval(interval);
            console.error(err);
            alert("Analysis failed. Please try again.");
            setProcessingState({ type: null, progress: 0 });
        }
    }
  };

  const updateField = (field: keyof BrandContext, value: string) => {
    onChange({ ...context, [field]: value });
  };

  const updateColor = (colorKey: 'primary' | 'secondary' | 'accent', value: string) => {
    onChange({
      ...context,
      colors: { ...context.colors, [colorKey]: value }
    });
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
              
              {/* Logo Upload UI */}
              <div 
                onClick={() => !isProcessing && fileInputRef.current?.click()}
                className={`border-4 border-dashed rounded-[2rem] p-12 text-center cursor-pointer transition-all ${isProcessing && processingState.type === 'logo' ? 'border-blue-500 bg-blue-50' : 'border-slate-100 hover:border-blue-200 hover:bg-slate-50 relative overflow-hidden'}`}
              >
                {isProcessing && processingState.type === 'logo' ? (
                  <div className="space-y-4">
                     <div className="w-full h-2 bg-blue-200 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-600 transition-all duration-300 ease-out" style={{ width: `${processingState.progress}%` }}></div>
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
                    <div className="space-y-4">
                       <div className="w-full h-2 bg-blue-200 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-600 transition-all duration-300 ease-out" style={{ width: `${processingState.progress}%` }}></div>
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

              {hasData && (
                <div className="animate-fade-in pt-8 border-t border-slate-100">
                  {context.referenceDocNames.length > 0 && (
                    <>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Loaded Assets:</p>
                      <div className="space-y-2 mb-6">
                        {context.referenceDocNames.map((n, i) => (
                          <div key={i} className="flex items-center gap-3 text-sm font-bold text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                            <span className="truncate">{n}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                  <button 
                    onClick={onClose}
                    className="w-full bg-slate-900 text-white py-4 rounded-xl font-black uppercase text-xs hover:bg-blue-600 transition-colors shadow-lg"
                  >
                    Save & Continue
                  </button>
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
