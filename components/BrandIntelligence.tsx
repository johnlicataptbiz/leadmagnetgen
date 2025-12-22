
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
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  // Derived state: Is there any data?
  const hasData = context.referenceDocNames.length > 0 || context.logoUrl;

  const extractColors = async (dataUrl: string) => {
    return new Promise<{primary: string, secondary: string, accent: string}>((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const colorThief = new ColorThief();
          // Get more colors to filter from
          const palette = colorThief.getPalette(img, 8);
          const rgbToHex = (r: number, g: number, b: number) => 
            "#" + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
          
          // Separate vibrant colors from near-white/black
          const vibrantColors: number[][] = [];
          const neutralColors: number[][] = [];
          
          palette.forEach(([r, g, b]) => {
            const brightness = (r + g + b) / 3;
            const isNearWhite = brightness > 240;
            const isNearBlack = brightness < 15;
            
            if (isNearWhite || isNearBlack) {
              neutralColors.push([r, g, b]);
            } else {
              vibrantColors.push([r, g, b]);
            }
          });

          // Prioritize vibrant colors, but use neutrals if we don't have enough
          const finalPalette = [...vibrantColors, ...neutralColors].slice(0, 3);
          
          // Ensure we have at least 3 colors
          while (finalPalette.length < 3) {
            finalPalette.push(palette[finalPalette.length] || [128, 128, 128]);
          }

          resolve({
            primary: rgbToHex(finalPalette[0][0], finalPalette[0][1], finalPalette[0][2]),
            secondary: rgbToHex(finalPalette[1][0], finalPalette[1][1], finalPalette[1][2]),
            accent: rgbToHex(finalPalette[2][0], finalPalette[2][1], finalPalette[2][2]),
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
                prompt: `Analyze this lead magnet and extract brand voice:\n\n${sample}`,
                systemInstruction: `Extract: 1) Tonality (voice/tone), 2) Styling (formatting patterns), 3) Style Notes (unique characteristics). Be concise.`,
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

    setIsProcessing(true);
    try {
      if (file.type.startsWith('image/')) {
        // Image: Extract colors locally with ColorThief
        const reader = new FileReader();
        reader.onloadend = async () => {
          const logoUrl = reader.result as string;
          const colors = await extractColors(logoUrl);
          onChange({
             ...context,
             logoUrl,
             colors,
             referenceDocNames: [...context.referenceDocNames, `Logo: ${file.name}`]
          });
          setIsProcessing(false);
        };
        reader.readAsDataURL(file);
      } else if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        const analysis = await analyzePDF(file);
        onChange({
          ...context,
          tonality: analysis.tonality,
          styling: analysis.styling,
          styleNotes: analysis.styleNotes,
          referenceDocNames: [...context.referenceDocNames, `Lead Magnet: ${file.name}`]
        });
        setIsProcessing(false);
      } else {
        onChange({
          ...context,
          referenceDocNames: [...context.referenceDocNames, `Doc: ${file.name}`]
        });
        setIsProcessing(false);
      }
    } catch (err) {
      console.error(err);
      alert("File processing failed. Please try a different file.");
      setIsProcessing(false);
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
              
              <div 
                onClick={() => !isProcessing && fileInputRef.current?.click()}
                className={`border-4 border-dashed rounded-[2rem] p-12 text-center cursor-pointer transition-all ${isProcessing ? 'border-blue-500 bg-blue-50 animate-pulse' : 'border-slate-100 hover:border-blue-200 hover:bg-slate-50'}`}
              >
                {isProcessing ? (
                  <div className="space-y-4">
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="font-bold text-blue-600 uppercase text-xs tracking-widest">Processing...</p>
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
                      <p className="text-slate-400 text-sm mt-1">Colors will be extracted automatically</p>
                    </div>
                  </div>
                )}
              </div>

              {/* PDF / Lead Magnet Upload */}
              <div 
                onClick={() => !isProcessing && pdfInputRef.current?.click()}
                className={`border-4 border-dashed rounded-[2rem] p-8 text-center cursor-pointer transition-all ${isProcessing ? 'border-blue-500 bg-blue-50 opacity-50' : 'border-slate-100 hover:border-blue-200 hover:bg-slate-50'}`}
              >
                 <div className="space-y-3">
                    <div className="w-12 h-12 bg-white border-2 border-slate-100 text-slate-400 rounded-xl flex items-center justify-center mx-auto shadow-sm">
                       <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    </div>
                    <div>
                      <p className="text-sm font-black uppercase text-slate-700">Upload Lead Magnet PDF</p>
                      <p className="text-slate-400 text-[10px] mt-1">AI will extract tonality & style</p>
                    </div>
                 </div>
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
