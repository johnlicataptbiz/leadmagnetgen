
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
    <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200">
      <div className="mb-6">
        <label className="block text-slate-700 font-bold mb-2 uppercase tracking-wide text-sm">
          What is the primary topic?
        </label>
        <input 
          type="text"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          placeholder="e.g., Client retention for hybrid practices"
          className="w-full px-4 py-4 text-lg border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:ring-0 outline-none transition"
          required
        />
      </div>
      <button 
        type="submit"
        className="w-full bg-[#101828] text-white py-4 rounded-lg text-lg font-bold heading-font hover:bg-slate-800 transition shadow-lg flex items-center justify-center space-x-2"
      >
        <span>Generate Strategic Ideas</span>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </button>
      <div className="mt-6 flex flex-wrap gap-2">
        <span className="text-xs text-slate-400 font-bold uppercase w-full mb-1">Recent High-Performers:</span>
        {['Pricing Mastery', 'Workshop Funnels', 'Clinical Freedom', 'Hiring Systems'].map(tag => (
          <button 
            key={tag}
            type="button"
            onClick={() => setVal(tag)}
            className="text-xs bg-slate-100 text-slate-600 px-3 py-1 rounded-full hover:bg-blue-100 hover:text-blue-600 transition"
          >
            {tag}
          </button>
        ))}
      </div>
    </form>
  );
};

export default TopicForm;
