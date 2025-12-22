
import React from 'react';
import { AppStep } from '../types';

interface HeaderProps {
  onLogoClick: () => void;
  onMemoryBankClick: () => void;
  onInsightsClick: () => void;
  onBrandingClick: () => void;
  currentStep: AppStep;
}

const Header: React.FC<HeaderProps> = ({ onLogoClick, onMemoryBankClick, onInsightsClick, onBrandingClick, currentStep }) => {
  return (
    <header className="bg-[#101828] text-white py-4 px-6 sticky top-0 z-50 shadow-md no-print">
      <div className="container mx-auto flex justify-between items-center">
        <div 
          onClick={onLogoClick} 
          className="cursor-pointer flex items-center space-x-2"
        >
          <span className="text-3xl font-black italic tracking-tighter heading-font border-r-4 border-blue-600 pr-3 mr-1">
            PT<span className="text-blue-500">BIZ</span>
          </span>
          <span className="hidden sm:inline-block font-bold tracking-widest text-xs uppercase text-slate-400">
            Memory Hub
          </span>
        </div>
        <div className="flex items-center space-x-6">
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
          <button 
            onClick={onBrandingClick}
            className={`text-xs font-black uppercase tracking-widest transition ${currentStep === 'branding' ? 'text-blue-400' : 'hover:text-blue-400 text-slate-300'}`}
          >
            Brand DNA
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
