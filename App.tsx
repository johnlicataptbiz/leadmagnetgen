
import React, { useState, useEffect } from 'react';
import { AppStep, LeadMagnetIdea, LeadMagnetContent, BrandContext, ArchiveItem, SmartMarketReport } from './types';
import { getLeadMagnetSuggestions, generateLeadMagnetContent, analyzeStyleReference, getSingleLeadMagnetSuggestion, generateSmartMarketReport, generateNanoBananaImage } from './services/geminiService';
import Header from './components/Header';
import TopicForm from './components/TopicForm';
import SuggestionList from './components/SuggestionList';
import LeadMagnetPreview from './components/LeadMagnetPreview';
import HubspotInsights from './components/HubspotInsights';
import BrandIntelligence from './components/BrandIntelligence';
import MemoryBank from './components/MemoryBank';
import { Sparkles } from 'lucide-react'; // Assuming Sparkles icon is available from lucide-react

const BRAND_STORAGE_KEY = 'pt_biz_brand_context';
const ARCHIVE_STORAGE_KEY = 'pt_biz_memory_bank';
const MARKET_REPORT_STORAGE_KEY = 'pt_biz_smart_market_report';

const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>('input');
  const [topic, setTopic] = useState('');
  const [suggestions, setSuggestions] = useState<LeadMagnetIdea[]>([]);
  const [selectedIdea, setSelectedIdea] = useState<LeadMagnetIdea | null>(null);
  const [content, setContent] = useState<LeadMagnetContent | null>(null);
  const [marketReport, setMarketReport] = useState<SmartMarketReport | null>(() => {
    const saved = localStorage.getItem(MARKET_REPORT_STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse saved market report", e);
      }
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);


  // Initialize Archive from LocalStorage
  const [archive, setArchive] = useState<ArchiveItem[]>(() => {
    const saved = localStorage.getItem(ARCHIVE_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  // Initialize Brand Memory State from LocalStorage or Defaults
  const [brandContext, setBrandContext] = useState<BrandContext>(() => {
    const saved = localStorage.getItem(BRAND_STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse saved brand context", e);
      }
    }
    return {
      logoUrl: undefined,
      colors: {
        primary: '#1e293b',
        secondary: '#3b82f6',
        accent: '#10b981'
      },
      tonality: '',
      styling: '',
      styleNotes: '',
      referenceDocNames: []
    };
  });

  // Persist Data
  useEffect(() => {
    localStorage.setItem(BRAND_STORAGE_KEY, JSON.stringify(brandContext));
  }, [brandContext]);

  useEffect(() => {
    localStorage.setItem(ARCHIVE_STORAGE_KEY, JSON.stringify(archive));
  }, [archive]);

  useEffect(() => {
    localStorage.setItem(MARKET_REPORT_STORAGE_KEY, JSON.stringify(marketReport));
  }, [marketReport]);

  const handleTopicSubmit = async (val: string) => {
    setTopic(val);
    setIsLoading(true);
    setLoadingMessage('Strategizing ideas using Brand Memory...');
    setStep('suggestions');
    setErrorMessage(null);
    try {
      const ideas = await getLeadMagnetSuggestions(val, brandContext, marketReport);
      setSuggestions(ideas);
    } catch (error: any) {
      console.error(error);
      setErrorMessage(error.message || "Something went wrong brainstorming. Try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshIdea = async (ideaId: string) => {
    const existingTitles = suggestions.map(s => s.title);
    setErrorMessage(null);
    try {
      const newIdea = await getSingleLeadMagnetSuggestion(topic, existingTitles, brandContext, marketReport);
      if (newIdea) {
        setSuggestions(prev => prev.map(s => s.id === ideaId ? newIdea : s));
      }
    } catch (error: any) {
      console.error(error);
      setErrorMessage(error.message || "Failed to refresh this idea. Try again later.");
    }
  };

  const handleSelectIdea = async (idea: LeadMagnetIdea) => {
    setSelectedIdea(idea);
    setIsLoading(true);
    setStep('generating');
    setErrorMessage(null);
    
    const messages = [
      'Engaging Brand DNA Mimicry Engine...',
      'Synthesizing Clinical Nuances...',
      'Drafting Strategic Growth Framework...',
      'Polishing Entrepreneur-Focused Copy...',
      'Finalizing Premium Asset Layout...'
    ];
    
    let msgIdx = 0;
    const interval = setInterval(() => {
      setLoadingMessage(messages[msgIdx] || 'Almost ready...');
      msgIdx++;
    }, 2500);

    try {
      const fullContent = await generateLeadMagnetContent(idea, brandContext, marketReport);
      clearInterval(interval);
      if (fullContent) {
        setContent(fullContent);
        
        // Auto-Archive the new creation
        const newItem: ArchiveItem = {
          id: crypto.randomUUID(),
          date: new Date().toISOString(),
          content: fullContent,
          brandContext: JSON.parse(JSON.stringify(brandContext)) 
        };
        setArchive(prev => {
           // Prevent duplicates if any
           if (prev.some(p => p.content.title === fullContent.title && new Date(p.date).toDateString() === new Date().toDateString())) {
             return prev;
           }
           return [newItem, ...prev];
        });
        
        console.log("Auto-archived:", newItem.id);
        
        setStep('preview');
      }
    } catch (error: any) {
      clearInterval(interval);
      console.error(error);
      setErrorMessage(error.message || "Failed to generate content.");
      setStep('suggestions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportPDF = async () => {
    const element = document.getElementById('preview-doc');
    // @ts-ignore
    if (!window.html2pdf) {
      alert("PDF generation library not loaded. Please refresh the page.");
      return;
    }
    if (!element) {
      alert("Preview content not found. Please try regenerating.");
      return;
    }
    
    setIsExporting(true);
    
    // Allow UI to update before heavy sync work
    await new Promise(resolve => setTimeout(resolve, 800));

    const opt = {
      margin: [0.3, 0.4, 0.3, 0.4], 
      filename: `${content?.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'pt-biz-lead-magnet'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2, 
        useCORS: true, 
        letterRendering: true,
        scrollY: 0,
        ignoreElements: (element: Element) => element.classList.contains('no-print')
      },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    try {
      // @ts-ignore
      await window.html2pdf().set(opt).from(element).save();
    } catch (err: any) {
      console.error("PDF Export failed:", err);
      setErrorMessage("Failed to generate PDF. Please try again or use the new 'Copy HTML' feature.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleGenerateImage = async () => {
    if (!content) return;
    setIsGeneratingImage(true);
    try {
      const result = await generateNanoBananaImage(content.title);
      if (result?.url) {
        setContent({ ...content, coverImageUrl: result.url });
      }
    } catch (e) {
      console.error(e);
      alert("Failed to generate AI art. Check console for details.");
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleExportHTML = () => {
    const element = document.getElementById('preview-doc');
    if (!element) return;
    
    // Clone to clean up for export
    const clone = element.cloneNode(true) as HTMLElement;
    
    // Inline key styles for email/web portability if needed (basic)
    // For now, we just grab outerHTML, but we could add a wrapper.
    const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${content?.title || 'Lead Magnet'}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    /* Essential resets */
    body { margin: 0; padding: 0; font-family: sans-serif; }
    img { max-width: 100%; height: auto; }
    .heading-font { font-family: 'Inter', sans-serif; font-weight: 900; }
  </style>
  <!-- Tailwind CDN for decent portable rendering if hosted -->
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-50">
  <div class="max-w-4xl mx-auto my-10">
    ${clone.innerHTML}
  </div>
</body>
</html>`;

    navigator.clipboard.writeText(htmlContent).then(() => {
      alert("HTML Code copied to clipboard! You can now paste this into your CMS or email tool.");
    }).catch(err => {
      console.error("Failed to copy HTML", err);
      // Fallback
      setErrorMessage("Could not copy to clipboard. Check console.");
    });
  };

  const reset = () => {
    setStep('input');
    setTopic('');
    setSuggestions([]);
    setSelectedIdea(null);
    setContent(null);
    setErrorMessage(null);
  };

  const openArchiveItem = (item: ArchiveItem) => {
    setContent(item.content);
    setBrandContext(item.brandContext);
    setStep('preview');
  };

  const deleteFromArchive = (id: string) => {
    setArchive(prev => prev.filter(i => i.id !== id));
  };



  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 relative overflow-x-hidden selection:bg-blue-100 selection:text-blue-900 flex flex-col">
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0 overflow-hidden no-print">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-100/40 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-100/20 rounded-full blur-[120px]"></div>
      </div>

      <Header 
        onLogoClick={reset} 
        onMemoryBankClick={() => setStep('archive')} 
        onInsightsClick={() => setStep('insights')}
        onBrandingClick={() => setStep('branding')}
        currentStep={step} 
      />
      
      <main className="flex-grow container mx-auto px-4 py-8 max-w-6xl no-print relative z-10">
        <div className="glass-effect rounded-[3rem] p-1 shadow-2xl shadow-slate-200/50 app-root">
          <style>{`
            .app-root { 
              --app-secondary: ${brandContext.colors.secondary}; 
            }
            .dynamic-bg-secondary { background-color: var(--app-secondary); }
            .dynamic-border-secondary { border-top-color: var(--app-secondary); }
            .dynamic-color-secondary { color: var(--app-secondary); }
          `}</style>
          <div className="bg-white/40 rounded-[2.8rem] backdrop-blur-sm p-4 md:p-12 min-h-[70vh]">
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
            >
              Dismiss
            </button>
          </div>
        )}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
            <div 
              className="w-16 h-16 border-4 border-t-transparent rounded-full animate-spin dynamic-border-secondary" 
            ></div>
            <div className="text-center">
              <h2 className="text-2xl font-bold text-slate-900 heading-font">{loadingMessage}</h2>
              <p className="text-slate-500 mt-2">Leveraging Brand Context & Gemini 3 Flash...</p>
            </div>
          </div>
        ) : (
          <>
            {step === 'input' && (
              <div className="max-w-4xl mx-auto mt-12 space-y-12">
                <div className="text-center">
                  <div className="bg-white p-4 rounded-3xl shadow-xl inline-block mb-8 border border-slate-100">
                    <img src="/pt-biz-logo.png" className="h-16 object-contain" alt="PT Biz" />
                  </div>
                  <h1 className="text-5xl font-black text-slate-900 mb-4 heading-font tracking-tight uppercase">
                    Brand Intelligence Studio
                  </h1>
                  <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-8">
                    Centralized platform for creating and storing high-converting PT practice assets.
                  </p>
                </div>

                <div className="max-w-4xl mx-auto">
                  {/* Strategic Workflow Sequence */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-16 relative">
                    {/* Vertical Connector Line for Mobile, Horizontal for Desktop */}
                    <div className="absolute top-1/2 left-0 w-full h-px bg-slate-200 hidden md:block -z-10"></div>
                    
                    {/* Step 1: Branding */}
                    <div className="flex flex-col items-center text-center group">
                      <div 
                        onClick={() => setStep('branding')}
                        className={`w-16 h-16 rounded-2xl flex items-center justify-center cursor-pointer transition-all border-2 mb-4 shadow-lg ${brandContext.logoUrl ? 'bg-green-50 border-green-200 text-green-600' : 'bg-white border-slate-100 text-slate-400 hover:border-blue-400 hover:text-blue-600'}`}
                      >
                        {brandContext.logoUrl ? (
                          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                        ) : (
                          <span className="text-2xl">✨</span>
                        )}
                      </div>
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] mb-1">Phase 01</h3>
                      <p className="font-bold text-slate-900 text-sm">Brand DNA</p>
                      <button 
                        onClick={() => setStep('branding')}
                        className="mt-3 text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-800 transition"
                      >
                        {brandContext.logoUrl ? "Identified ✓" : "Initialize →"}
                      </button>
                    </div>

                    {/* Step 2: Insights */}
                    <div className="flex flex-col items-center text-center group">
                      <div 
                        onClick={() => setStep('insights')}
                        className={`w-16 h-16 rounded-2xl flex items-center justify-center cursor-pointer transition-all border-2 mb-4 shadow-lg ${marketReport ? 'bg-green-50 border-green-200 text-green-600' : 'bg-white border-slate-100 text-slate-400 hover:border-blue-400 hover:text-blue-600'}`}
                      >
                        {marketReport ? (
                          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                        ) : (
                          <span className="text-2xl">📈</span>
                        )}
                      </div>
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] mb-1">Phase 02</h3>
                      <p className="font-bold text-slate-900 text-sm">Market Intelligence</p>
                      <button 
                        onClick={() => setStep('insights')}
                        className="mt-3 text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-800 transition"
                      >
                        {marketReport ? "Synced ✓" : "Load HubSpot →"}
                      </button>
                    </div>

                    {/* Step 3: Production */}
                    <div className="flex flex-col items-center text-center group">
                      <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-slate-900 border-2 border-slate-800 text-white mb-4 shadow-xl shadow-blue-900/20">
                        <span className="text-2xl">⚛️</span>
                      </div>
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] mb-1">Phase 03</h3>
                      <p className="font-bold text-slate-900 text-sm">Studio Core</p>
                      <span className="mt-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Ready to Gen</span>
                    </div>
                  </div>

                  <div className="bg-slate-50/50 rounded-[2.5rem] p-12 border border-slate-100 shadow-inner">
                    <div className="max-w-2xl mx-auto">
                      <div className="flex items-center space-x-3 mb-8 justify-center">
                         <div className="h-px w-8 bg-slate-200"></div>
                         <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">Resource Production</h2>
                         <div className="h-px w-8 bg-slate-200"></div>
                      </div>
                      <TopicForm onSubmit={handleTopicSubmit} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 'branding' && (
              <div className="animate-fade-in">
                <BrandIntelligence 
                  context={brandContext} 
                  onChange={setBrandContext} 
                  onClose={() => setStep('input')}
                />
              </div>
            )}

            {step === 'insights' && (
              <div className="animate-fade-in">
                <HubspotInsights 
                  brandContext={brandContext}
                  report={marketReport}
                  onReportChange={setMarketReport}
                  onClose={() => setStep('input')}
                />
              </div>
            )}

            {step === 'suggestions' && (
              <div className="animate-fade-in">
                <div className="mb-8 flex items-center justify-between">
                  <h2 className="text-3xl font-black text-slate-900 heading-font uppercase">Strategic Candidates</h2>
                  <button onClick={reset} className="font-bold uppercase text-xs dynamic-color-secondary">← Start Over</button>
                </div>
                <SuggestionList 
                  topic={topic} 
                  suggestions={suggestions} 
                  onSelect={handleSelectIdea} 
                  onRefresh={handleRefreshIdea}
                  brandColors={brandContext.colors}
                />
              </div>
            )}

            {(step === 'preview' && content) && (
              <div className="animate-fade-in">
                <div className="mb-6 flex items-center justify-between no-print">
                  <h2 className="text-3xl font-black text-slate-900 heading-font uppercase">Branded Output</h2>
                  <div className="flex gap-4">
                    <button 
                      onClick={reset}
                      className="px-6 py-2 border-2 border-slate-300 text-slate-700 font-bold heading-font uppercase text-xs hover:bg-slate-50 transition-colors"
                    >
                      Close
                    </button>
                    <button 
                      onClick={handleGenerateImage}
                      className="px-6 py-2 border-2 font-bold heading-font uppercase text-xs flex items-center gap-2 hover:bg-slate-50 transition-all border-blue-400 text-blue-600 dynamic-color-secondary dynamic-border-secondary"
                      disabled={isGeneratingImage}
                    >
                      {isGeneratingImage ? (
                        <>
                          <div className="w-3 h-3 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
                          Rendering Art...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3 h-3" />
                          AI Art (Nano Banana)
                        </>
                      )}
                    </button>
                    <button 
                      onClick={handleExportPDF}
                      className="px-8 py-2 text-white font-bold heading-font uppercase text-xs flex items-center gap-2 shadow-lg dynamic-bg-secondary"
                      disabled={isExporting}
                    >
                      {isExporting ? 'Exporting...' : 'Download Branded PDF'}
                    </button>
                    <button 
                      onClick={handleExportHTML}
                      className="px-6 py-2 border-2 text-slate-700 font-bold heading-font uppercase text-xs hover:bg-slate-50 transition-colors dynamic-border-secondary dynamic-color-secondary"
                    >
                      Copy HTML
                    </button>
                  </div>
                </div>
                <LeadMagnetPreview content={content} brandContext={brandContext} />
              </div>
            )}

            {step === 'archive' && (
              <div className="animate-fade-in">
                <div className="mb-8 flex items-center justify-between">
                  <h2 className="text-3xl font-black text-slate-900 heading-font uppercase tracking-tight">Memory Bank</h2>
                  <button onClick={() => setStep('input')} className="font-bold uppercase text-xs dynamic-color-secondary">← Dashboard</button>
                </div>
                <MemoryBank 
                  items={archive} 
                  onOpen={openArchiveItem} 
                  onDelete={deleteFromArchive}
                  brandColors={brandContext.colors}
                />
              </div>
            )}
          </>
        )}
          </div>
        </div>
      </main>

      <footer className="py-8 border-t bg-white no-print">
        <div className="container mx-auto px-4 text-center space-y-2">
          <div className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
            &copy; {new Date().getFullYear()} Physical Therapy Biz. AI Engine & Memory Active.
          </div>
          <div className="text-slate-300 text-[9px] font-bold uppercase tracking-[0.15em] italic">
            Developed internally by PT Biz's Acquisitions Team
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
