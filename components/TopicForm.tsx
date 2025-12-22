
import React, { useState } from 'react';

interface TopicFormProps {
  onSubmit: (topic: string) => void;
}

const TopicForm: React.FC<TopicFormProps> = ({ onSubmit }) => {
  const [val, setVal] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (val.trim()) onSubmit(val);
  };

  return (
    <form onSubmit={handleSubmit} className="glass-effect p-8 rounded-3xl shadow-2xl border border-white/50 relative overflow-hidden group">
      <div className="shimmer-active absolute inset-0 opacity-5 pointer-events-none"></div>
      <div className="relative z-10">
        <div className="mb-6">
          <label htmlFor="topic-input" className="block text-slate-700 font-black mb-3 uppercase tracking-[0.15em] text-xs">
            What is the primary topic?
          </label>
          <input 
            id="topic-input"
            name="topic"
            type="text"
            value={val}
            onChange={(e) => setVal(e.target.value)}
            placeholder="e.g., Client retention for hybrid practices"
            className="w-full px-6 py-5 text-xl bg-white/60 border border-slate-200 rounded-2xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-inner"
            required
          />
        </div>
        <button 
          type="submit"
          className="w-full dark-glass text-white py-5 rounded-2xl text-xl font-black heading-font tracking-widest hover:scale-[1.02] transition-all shadow-2xl shadow-blue-900/20 flex items-center justify-center space-x-3 shine-on-hover"
        >
          <span>Generate Strategic Ideas</span>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </button>
        <div className="mt-8 flex flex-wrap gap-2">
          <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest w-full mb-2">Recent High-Performers:</span>
          {['Pricing Mastery', 'Workshop Funnels', 'Clinical Freedom', 'Hiring Systems'].map(tag => (
            <button 
              key={tag}
              type="button"
              onClick={() => setVal(tag)}
              className="text-[10px] font-bold bg-white/50 text-slate-600 px-4 py-2 rounded-xl hover:bg-blue-600 hover:text-white transition-all border border-slate-200"
            >
              {tag}
            </button>
          ))}
        </div>
      </div>
    </form>
  );
};

export default TopicForm;
