
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
            className={`bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden hover:border-blue-400 transition-all hover:shadow-2xl group flex flex-col relative ${isRefreshing ? 'opacity-70 pointer-events-none' : ''}`}
            style={{ borderColor: '#e2e8f0' }}
          >
            {isRefreshing && (
              <div className="absolute inset-0 bg-white/40 z-10 flex items-center justify-center backdrop-blur-[1px]">
                <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: `${secondary} transparent transparent transparent` }}></div>
              </div>
            )}

            <div className="p-6 flex-grow">
              <div className="flex justify-between items-start mb-4">
                <span 
                  className="text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest"
                  style={{ backgroundColor: `${secondary}15`, color: secondary }}
                >
                  Idea Candidate
                </span>
                <button 
                  onClick={(e) => handleRefresh(e, idea.id)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-all active:scale-95 group/refresh"
                  title="Generate a different idea"
                >
                  <svg className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : 'group-hover/refresh:rotate-180 transition-transform duration-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2 heading-font group-hover:text-blue-600 transition">
                {idea.title}
              </h3>
              <p className="text-slate-600 italic font-medium mb-4">"{idea.hook}"</p>
              
              <div className="space-y-3 mb-6">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Included In Resource:</h4>
                <ul className="space-y-1">
                  {idea.outline.map((item, idx) => (
                    <li key={idx} className="flex items-center text-sm text-slate-600">
                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20" style={{ color: secondary }}>
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-500 border-l-4" style={{ borderLeftColor: secondary }}>
                <span className="font-black text-slate-700 uppercase">Rationale:</span> {idea.rationale}
              </div>
            </div>
            
            <button 
              onClick={() => onSelect(idea)}
              className="w-full text-white py-4 font-black heading-font transition uppercase tracking-widest flex items-center justify-center space-x-2 group"
              style={{ backgroundColor: primary }}
            >
              <span>Select & Generate Content</span>
              <svg className="w-5 h-5 group-hover:translate-x-1 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default SuggestionList;
