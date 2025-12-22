
import React, { useState } from 'react';
import { LeadMagnetIdea, BrandColors } from '../types';

interface SuggestionListProps {
  topic: string;
  suggestions: LeadMagnetIdea[];
  onSelect: (idea: LeadMagnetIdea) => void;
  onRefresh: (ideaId: string) => Promise<void>;
  brandColors?: BrandColors;
}

const SuggestionList: React.FC<SuggestionListProps> = ({ suggestions, onSelect, onRefresh, brandColors }) => {
  const primary = brandColors?.primary || '#101828';
  const secondary = brandColors?.secondary || '#2563EB';
  const [refreshingId, setRefreshingId] = useState<string | null>(null);

  const handleRefresh = async (e: React.MouseEvent, ideaId: string) => {
    e.stopPropagation();
    setRefreshingId(ideaId);
    try {
      await onRefresh(ideaId);
    } finally {
      setRefreshingId(null);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {suggestions.map((idea) => {
        const isRefreshing = refreshingId === idea.id;
        
        return (
          <div 
            key={idea.id}
            className={`glass-effect rounded-[2rem] shadow-xl border border-white/50 overflow-hidden hover:border-blue-400/50 transition-all hover:shadow-2xl hover:shadow-blue-900/10 group flex flex-col relative ${isRefreshing ? 'opacity-70 pointer-events-none' : ''}`}
          >
            {isRefreshing && (
              <div className="absolute inset-0 bg-white/40 z-10 flex items-center justify-center backdrop-blur-sm">
                <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: `${secondary} transparent transparent transparent` }}></div>
              </div>
            )}

            <div className="p-8 flex-grow relative overflow-hidden">
              <div className="shimmer-active absolute inset-0 opacity-[0.03] pointer-events-none"></div>
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                  <span 
                    className="text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-[0.2em] shadow-sm border border-white"
                    style={{ backgroundColor: `${secondary}15`, color: secondary }}
                  >
                    Idea Candidate
                  </span>
                  <button 
                    onClick={(e) => handleRefresh(e, idea.id)}
                    className="p-2 rounded-xl bg-white/50 hover:bg-white text-slate-400 hover:text-blue-600 transition-all active:scale-95 group/refresh shadow-sm"
                    title="Generate a different idea"
                  >
                    <svg className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : 'group-hover/refresh:rotate-180 transition-transform duration-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                </div>
                <h3 className="text-3xl font-black text-slate-900 mb-3 heading-font group-hover:text-blue-600 transition tracking-tight">
                  {idea.title}
                </h3>
                <p className="text-slate-500 italic font-medium mb-6 text-base leading-relaxed">"{idea.hook}"</p>
                
                <div className="space-y-4 mb-8">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em]">Included In Resource:</h4>
                  <ul className="space-y-2">
                    {idea.outline.map((item, idx) => (
                      <li key={idx} className="flex items-center text-sm text-slate-600 font-medium">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center mr-3 flex-shrink-0" style={{ backgroundColor: `${secondary}10` }}>
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" style={{ color: secondary }}>
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className="p-4 bg-white/50 backdrop-blur-sm rounded-2xl text-xs text-slate-500 border border-white shadow-inner leading-relaxed">
                  <span className="font-black text-slate-800 uppercase tracking-widest text-[9px] block mb-1">Rationale:</span> {idea.rationale}
                </div>
              </div>
            </div>
            
            <button 
              onClick={() => onSelect(idea)}
              className="w-full text-white py-5 font-black heading-font transition uppercase tracking-[0.2em] text-xs flex items-center justify-center space-x-3 group shine-on-hover"
              style={{ backgroundColor: primary }}
            >
              <span>Select & Generate</span>
              <svg className="w-5 h-5 group-hover:translate-x-2 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default SuggestionList;
