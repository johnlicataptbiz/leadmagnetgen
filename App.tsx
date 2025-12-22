
import React, { useState, useEffect } from 'react';
import { AppStep, LeadMagnetIdea, LeadMagnetContent, HubspotAnalysis, BrandContext, ArchiveItem } from './types';
import { getLeadMagnetSuggestions, generateLeadMagnetContent, getSingleLeadMagnetSuggestion } from './services/geminiService';
import Header from './components/Header';
import TopicForm from './components/TopicForm';
import SuggestionList from './components/SuggestionList';
import LeadMagnetPreview from './components/LeadMagnetPreview';
import HubspotInsights from './components/HubspotInsights';
import BrandIntelligence from './components/BrandIntelligence';
import MemoryBank from './components/MemoryBank';

const BRAND_STORAGE_KEY = 'pt_biz_brand_context';
const ARCHIVE_STORAGE_KEY = 'pt_biz_memory_bank';

const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>('input');
  const [topic, setTopic] = useState('');
  const [suggestions, setSuggestions] = useState<LeadMagnetIdea[]>([]);
  const [selectedIdea, setSelectedIdea] = useState<LeadMagnetIdea | null>(null);
  const [content, setContent] = useState<LeadMagnetContent | null>(null);
  const [analysis, setAnalysis] = useState<HubspotAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [isExporting, setIsExporting] = useState(false);

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
        primary: '#64748B',
        secondary: '#94A3B8',
        accent: '#CBD5E1'
      },
      tonality: 'Pending extraction...',
      styling: 'Pending extraction...',
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

  const handleTopicSubmit = async (val: string) => {
    setTopic(val);
    setIsLoading(true);
    setLoadingMessage('Strategizing ideas using Brand Memory...');
    setStep('suggestions');
    try {
      const ideas = await getLeadMagnetSuggestions(val, brandContext);
      setSuggestions(ideas);
    } catch (error: any) {
      console.error(error);
      alert(error.message || "Something went wrong brainstorming. Try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshIdea = async (ideaId: string) => {
    const existingTitles = suggestions.map(s => s.title);
    try {
      const newIdea = await getSingleLeadMagnetSuggestion(topic, existingTitles, brandContext);
      if (newIdea) {
        setSuggestions(prev => prev.map(s => s.id === ideaId ? newIdea : s));
      }
    } catch (error: any) {
      console.error(error);
      alert(error.message || "Failed to refresh this idea. Try again later.");
    }
  };

  const handleSelectIdea = async (idea: LeadMagnetIdea) => {
    setSelectedIdea(idea);
    setIsLoading(true);
    setStep('generating');
    
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
      const fullContent = await generateLeadMagnetContent(idea, brandContext);
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
        setArchive(prev => [newItem, ...prev]);
        
        setStep('preview');
      }
    } catch (error: any) {
      clearInterval(interval);
      console.error(error);
      alert(error.message || "Failed to generate content.");
      setStep('suggestions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInsightsAnalysis = (data: HubspotAnalysis) => {
    setAnalysis(data);
    setSuggestions(data.strategicSuggestions);
    setStep('insights');
  };

  const handleExportPDF = () => {
    const element = document.getElementById('preview-doc');
    if (!element) return;
    setIsExporting(true);
    const opt = {
      margin: 0,
      filename: `${content?.title.toLowerCase().replace(/\s+/g, '-') || 'pt-biz-lead-magnet'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true, windowWidth: 800 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };
    // @ts-ignore
    window.html2pdf().set(opt).from(element).save().then(() => setIsExporting(false)).catch(() => setIsExporting(false));
  };

  const reset = () => {
    setStep('input');
    setTopic('');
    setSuggestions([]);
    setSelectedIdea(null);
    setContent(null);
    setAnalysis(null);
  };

  const openArchiveItem = (item: ArchiveItem) => {
    setContent(item.content);
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
        <div className="glass-effect rounded-[3rem] p-1 shadow-2xl shadow-slate-200/50">
          <div className="bg-white/40 rounded-[2.8rem] backdrop-blur-sm p-4 md:p-12 min-h-[70vh]">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
            <div 
              className="w-16 h-16 border-4 border-t-transparent rounded-full animate-spin" 
              style={{ borderTopColor: brandContext.colors.secondary }}
            ></div>
            <div className="text-center">
              <h2 className="text-2xl font-bold text-slate-900 heading-font">{loadingMessage}</h2>
              <p className="text-slate-500 mt-2">Leveraging Brand Context & Gemini 2.0 Flash...</p>
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
                  
                  {/* Brand Status Indicator */}
                  {brandContext.referenceDocNames.length > 0 && (
                    <div className="inline-block bg-white rounded-2xl shadow-xl border border-slate-200 p-6 max-w-2xl mx-auto">
                      <div className="flex items-center justify-center gap-6">
                        {brandContext.logoUrl && (
                          <img src={brandContext.logoUrl} className="h-12 object-contain" alt="Brand Logo" />
                        )}
                        <div className="flex items-center gap-3">
                          <div className="flex gap-2">
                            {(['primary', 'secondary', 'accent'] as const).map((colorKey) => (
                              <div 
                                key={colorKey}
                                className="w-8 h-8 rounded-lg border-2 border-white shadow-lg"
                                style={{ backgroundColor: brandContext.colors[colorKey] }}
                                title={`${colorKey}: ${brandContext.colors[colorKey]}`}
                              />
                            ))}
                          </div>
                          <div className="border-l-2 border-slate-200 pl-4">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                              <span className="text-xs font-black text-slate-900 uppercase tracking-widest">Brand DNA Active</span>
                            </div>
                            <p className="text-[10px] text-slate-500 mt-1">{brandContext.referenceDocNames.length} source{brandContext.referenceDocNames.length !== 1 ? 's' : ''} loaded</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest px-2">Action A: Create New Resource</h2>
                    <TopicForm onSubmit={handleTopicSubmit} />
                  </div>
                  <div className="space-y-4">
                    <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest px-2">Action B: Market Data Analysis</h2>
                    <div className="bg-white p-6 rounded-2xl shadow-xl border border-slate-200 h-full flex flex-col justify-center text-center">
                       <p className="text-slate-600 mb-6">Analyze your HubSpot data to determine the next strategic lead magnet needed.</p>
                       <button 
                        onClick={() => setStep('insights')}
                        className="text-white py-4 rounded-lg font-bold heading-font transition flex items-center justify-center space-x-2 hover:opacity-90 shadow-lg"
                        style={{ backgroundColor: brandContext.colors.secondary }}
                       >
                        <span>Analyze HubSpot Report</span>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                       </button>
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
                <div className="mb-8 flex items-center justify-between">
                  <h2 className="text-3xl font-black text-slate-900 heading-font uppercase">Market Insights</h2>
                  <button onClick={() => setStep('input')} className="font-bold uppercase text-xs" style={{ color: brandContext.colors.secondary }}>← Back</button>
                </div>
                <HubspotInsights 
                  brandContext={brandContext}
                  onAnalysisComplete={handleInsightsAnalysis} 
                  onSelectIdea={handleSelectIdea}
                />
              </div>
            )}

            {step === 'suggestions' && (
              <div className="animate-fade-in">
                <div className="mb-8 flex items-center justify-between">
                  <h2 className="text-3xl font-black text-slate-900 heading-font uppercase">Strategic Candidates</h2>
                  <button onClick={reset} className="font-bold uppercase text-xs" style={{ color: brandContext.colors.secondary }}>← Start Over</button>
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
                      className="px-6 py-2 border-2 text-slate-700 font-bold heading-font uppercase text-xs"
                      style={{ borderColor: '#cbd5e1' }}
                    >
                      Close
                    </button>
                    <button 
                      onClick={handleExportPDF}
                      className="px-8 py-2 text-white font-bold heading-font uppercase text-xs flex items-center gap-2 shadow-lg"
                      style={{ backgroundColor: brandContext.colors.secondary }}
                      disabled={isExporting}
                    >
                      {isExporting ? 'Exporting...' : 'Download Branded PDF'}
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
                  <button onClick={() => setStep('input')} className="font-bold uppercase text-xs" style={{ color: brandContext.colors.secondary }}>← Dashboard</button>
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

      <footer className="py-6 border-t bg-white no-print">
        <div className="container mx-auto px-4 text-center text-slate-400 text-[10px] font-black uppercase tracking-widest">
          &copy; {new Date().getFullYear()} Physical Therapy Biz. AI Engine & Memory Active.
        </div>
      </footer>
    </div>
  );
};

export default App;
