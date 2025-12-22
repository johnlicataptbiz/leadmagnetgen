
import React from 'react';
import { ArchiveItem, BrandColors } from '../types';

interface MemoryBankProps {
  items: ArchiveItem[];
  onOpen: (item: ArchiveItem) => void;
  onDelete: (id: string) => void;
  brandColors: BrandColors;
}

const MemoryBank: React.FC<MemoryBankProps> = ({ items, onOpen, onDelete, brandColors }) => {

  if (items.length === 0) {
    return (
      <div className="text-center py-24 bg-white rounded-3xl border-2 border-dashed border-slate-200">
        <svg className="w-16 h-16 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
        </svg>
        <h3 className="text-xl font-bold text-slate-900 heading-font uppercase">Vault is Empty</h3>
        <p className="text-slate-500 mt-2">Generate your first lead magnet to see it appear here.</p>
      </div>
    );
  }

  return (
    <div className="memory-bank-root grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <style>{`
        .memory-bank-root { --brand-primary: ${brandColors.primary}; --brand-secondary: ${brandColors.secondary}; --brand-accent: ${brandColors.accent}; }
        .vault-primary-swatch { background-color: var(--brand-primary); }
        .vault-secondary-swatch { background-color: var(--brand-secondary); }
        .vault-accent-swatch { background-color: var(--brand-accent); }
        .vault-open-btn { background-color: var(--brand-secondary); }
      `}</style>
      {items.map((item) => (
        <div key={item.id} className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden group hover:border-blue-400 transition-all flex flex-col">
          <div className="p-6 flex-grow">
            <div className="flex justify-between items-start mb-4">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
              <button 
                onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
                className="text-slate-300 hover:text-red-500 transition-colors"
                title="Delete from Vault"
                aria-label="Delete from Vault"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
            
            <h4 className="text-xl font-bold text-slate-900 heading-font uppercase tracking-tight mb-2 group-hover:text-blue-600 transition">
              {item.content.title}
            </h4>
            <p className="text-sm text-slate-500 italic line-clamp-2">"{item.content.subtitle}"</p>
            
            <div className="mt-6 flex gap-2">
               <div className="w-4 h-4 rounded-full border border-slate-200 shadow-sm vault-primary-swatch"></div>
               <div className="w-4 h-4 rounded-full border border-slate-200 shadow-sm vault-secondary-swatch"></div>
               <div className="w-4 h-4 rounded-full border border-slate-200 shadow-sm vault-accent-swatch"></div>
            </div>
          </div>
          
          <button 
            onClick={() => onOpen(item)}
            className="w-full py-4 text-white font-black heading-font uppercase text-xs tracking-[0.2em] transition-opacity vault-open-btn"
          >
            Open & Download
          </button>
        </div>
      ))}
    </div>
  );
};

export default MemoryBank;
