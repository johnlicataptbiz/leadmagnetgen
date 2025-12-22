
import React from 'react';
import { AppStep } from '../types';

interface HeaderProps {
  onLogoClick: () => void;
  onMemoryBankClick: () => void;
  onInsightsClick: () => void;
  onBrandingClick: () => void;
  currentStep: AppStep;
}

const Header: React.FC<HeaderProps> = ({ 
  onLogoClick, 
  onMemoryBankClick, 
  onInsightsClick, 
  onBrandingClick, 
  currentStep 
}) => {
  return (
    <header className="dark-glass text-white py-4 px-6 sticky top-0 z-50 shadow-2xl shadow-black/20 no-print border-b border-white/5">
      <div className="container mx-auto flex justify-between items-center">
        <div 
          onClick={onLogoClick} 
          className="cursor-pointer flex items-center space-x-3 group"
        >
          <div className="bg-white p-1.5 rounded-lg shadow-inner group-hover:scale-105 transition-transform">
            <img src="/pt-biz-logo.png" className="h-8 object-contain" alt="PT Biz Logo" />
          </div>
          <span className="hidden sm:inline-block font-black tracking-[0.2em] text-[10px] uppercase text-slate-500">
            Memory Hub
          </span>
        </div>
        <div className="flex items-center space-x-6">
          <button 
            onClick={onBrandingClick}
            className={`group relative py-2 px-1 text-xs font-black uppercase tracking-widest transition ${currentStep === 'branding' ? 'text-blue-400' : 'hover:text-blue-400 text-slate-300'}`}
          >
            <span className="relative z-10">Brand DNA</span>
            <span className="absolute -top-3 -right-6 bg-blue-600 text-[8px] text-white px-2 py-0.5 rounded-full shadow-lg shadow-blue-500/50 animate-pulse whitespace-nowrap">
              Start Here
            </span>
          </button>
          <button 
            onClick={onLogoClick}
            className={`text-xs font-black uppercase tracking-widest transition ${currentStep === 'input' || currentStep === 'suggestions' ? 'text-blue-400' : 'hover:text-blue-400 text-slate-300'}`}
          >
            Creator
          </button>
          <button 
            onClick={onMemoryBankClick}
            className={`text-xs font-black uppercase tracking-widest transition ${currentStep === 'archive' ? 'text-blue-400' : 'hover:text-blue-400 text-slate-300'}`}
          >
            Memory Bank
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
