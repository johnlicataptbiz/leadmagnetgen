
import React from 'react';
import { LeadMagnetContent, BrandContext } from '../types';

interface LeadMagnetPreviewProps {
  content: LeadMagnetContent;
  brandContext: BrandContext;
}

const LeadMagnetPreview: React.FC<LeadMagnetPreviewProps> = ({ content, brandContext }) => {
  const { colors, logoUrl } = brandContext;

  return (
    <div className="bg-white shadow-2xl mx-auto rounded-xl overflow-hidden max-w-[850px] border border-slate-200" id="preview-doc" style={{ fontFamily: "'Inter', sans-serif" }}>
      
      {/* Cover Page */}
      <div 
        className="min-h-[1050px] relative flex flex-col justify-center items-center text-center px-16 py-24 overflow-hidden"
        style={{ backgroundColor: colors.primary }}
      >
        {/* Abstract Background Shapes */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full blur-[150px] opacity-20 -mr-64 -mt-64" style={{ backgroundColor: colors.secondary }}></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full blur-[150px] opacity-15 -ml-64 -mb-64" style={{ backgroundColor: colors.accent }}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
        
        {/* Header / Logo */}
        <div className="mb-24 z-10">
          {logoUrl ? (
            <img src={logoUrl} className="h-32 object-contain" alt="Brand Logo" />
          ) : (
            <div className="inline-block pb-4 px-2 border-b-4" style={{ borderBottomColor: colors.secondary }}>
               <span className="text-7xl font-black italic tracking-tighter heading-font text-white">
                PT<span style={{ color: colors.secondary }}>BIZ</span>
              </span>
            </div>
          )}
        </div>

        {/* Title Group */}
        <div className="z-10 flex flex-col items-center px-4">
          <h1 className="text-6xl md:text-7xl font-black text-white leading-[1.0] mb-12 heading-font uppercase tracking-tighter max-w-2xl drop-shadow-lg">
            {content.title}
          </h1>
          
          <div className="w-24 h-2 mb-12 rounded-full" style={{ backgroundColor: colors.secondary }}></div>
          
          <p className="text-xl md:text-2xl text-slate-300 font-medium max-w-xl heading-font uppercase tracking-[0.3em] leading-relaxed opacity-90">
            {content.subtitle}
          </p>
        </div>

        {/* Footer info on cover */}
        <div className="mt-auto pt-24 text-slate-400 text-[10px] font-black tracking-[0.4em] uppercase z-10 opacity-50">
          &copy; {new Date().getFullYear()} PHYSICAL THERAPY BIZ &bull; PROPRIETARY IP
        </div>
      </div>

      {/* Internal Content Container */}
      <div className="px-20 py-24 space-y-24">
        
        {/* Introduction Section */}
        <section className="relative">
          <div className="flex items-center gap-4 mb-10">
            <div className="w-2 h-10 rounded-full" style={{ backgroundColor: colors.secondary }}></div>
            <h2 className="text-4xl font-black text-slate-900 heading-font uppercase tracking-tight">
              Executive Brief
            </h2>
          </div>
          <div className="text-xl text-slate-600 leading-[1.8] font-normal first-letter:text-6xl first-letter:font-black first-letter:heading-font first-letter:text-slate-900 first-letter:mr-4 first-letter:float-left first-letter:mt-1">
            {content.introduction}
          </div>
        </section>

        {/* Dynamic Content Sections */}
        {content.sections.map((section, idx) => (
          <section key={idx} className="relative group">
            <div className="flex items-baseline gap-4 mb-10">
               <span className="text-xs font-black uppercase tracking-[0.5em] opacity-30 heading-font" style={{ color: colors.secondary }}>STRATEGY 0{idx + 1}</span>
               <h3 className="text-3xl md:text-4xl font-black text-slate-900 heading-font uppercase tracking-tight leading-none">
                 {section.heading}
               </h3>
            </div>
            
            {section.type === 'text' && (
              <p className="text-lg text-slate-700 leading-[1.8] font-normal">
                {section.content}
              </p>
            )}

            {section.type === 'checklist' && (
              <div className="bg-slate-50 border-l-8 p-12 rounded-r-3xl border-slate-200" style={{ borderLeftColor: colors.secondary }}>
                <p className="mb-8 font-black text-slate-900 text-xl uppercase tracking-wider heading-font">{section.content}</p>
                <div className="grid grid-cols-1 gap-6">
                  {section.items?.map((item, i) => (
                    <div key={i} className="flex items-start gap-5 group/item">
                      <div className="w-6 h-6 rounded-md border-2 flex-shrink-0 mt-1 flex items-center justify-center transition-colors group-hover/item:bg-white" style={{ borderColor: colors.secondary }}>
                         <svg className="w-3.5 h-3.5 opacity-0 group-hover/item:opacity-100 transition-opacity" style={{ color: colors.secondary }} fill="currentColor" viewBox="0 0 20 20">
                           <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                         </svg>
                      </div>
                      <span className="text-lg text-slate-700 leading-snug font-medium">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {section.type === 'steps' && (
              <div className="space-y-16 pl-6">
                {section.items?.map((item, i) => (
                  <div key={i} className="flex gap-10 items-start relative">
                    {i < (section.items?.length || 0) - 1 && (
                      <div className="absolute left-7 top-14 bottom-[-64px] w-0.5 bg-slate-100"></div>
                    )}
                    <div 
                      className="w-14 h-14 text-white rounded-2xl flex items-center justify-center font-black text-2xl flex-shrink-0 heading-font shadow-xl transform transition-transform group-hover:scale-110"
                      style={{ backgroundColor: colors.secondary }}
                    >
                      {i + 1}
                    </div>
                    <div className="pt-2">
                      <div className="text-xl text-slate-800 leading-relaxed font-bold heading-font uppercase tracking-tight">
                        {item}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {section.type === 'worksheet' && (
              <div className="bg-white border-2 border-slate-100 p-12 rounded-[40px] shadow-2xl relative overflow-hidden">
                 <div className="absolute top-0 left-0 w-full h-3" style={{ backgroundColor: colors.secondary }}></div>
                 <div className="flex justify-between items-center mb-10">
                    <h4 className="font-black uppercase text-xs tracking-[0.3em] heading-font" style={{ color: colors.secondary }}>Implementation Module</h4>
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Self-Audit</div>
                 </div>
                 <p className="text-2xl text-slate-900 mb-12 font-black leading-tight heading-font uppercase">{section.content}</p>
                 <div className="space-y-12">
                    {section.items?.map((item, i) => (
                      <div key={i} className="space-y-4">
                        <label className="block text-slate-400 font-black uppercase text-[10px] tracking-[0.2em]">{item}</label>
                        <div className="border-b-2 border-slate-100 h-14 w-full bg-slate-50/50 rounded-t-xl"></div>
                      </div>
                    ))}
                 </div>
              </div>
            )}

            {section.type === 'box' && (
              <div 
                className="text-white p-14 rounded-[40px] shadow-2xl relative overflow-hidden group/box"
                style={{ backgroundColor: colors.primary }}
              >
                <div className="absolute top-0 right-0 w-48 h-48 opacity-10 transform translate-x-12 -translate-y-12 rotate-45" style={{ backgroundColor: colors.accent }}></div>
                <div className="flex items-center gap-4 mb-8">
                   <div className="p-3 rounded-xl bg-white/10">
                     <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: colors.accent }}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 10V3L4 14h7v7l9-11h-7z" />
                     </svg>
                   </div>
                   <p className="text-2xl font-black uppercase heading-font tracking-widest" style={{ color: colors.accent }}>Strategic Pivot</p>
                </div>
                <p className="text-2xl text-white leading-relaxed font-medium italic">
                  "{section.content}"
                </p>
              </div>
            )}

            {section.type === 'qa' && (
              <div className="space-y-10">
                <div className="p-6 bg-slate-50 rounded-2xl border-l-4 border-slate-200 italic text-slate-600 text-lg leading-relaxed">
                  {section.content}
                </div>
                <div className="grid grid-cols-1 gap-8">
                  {section.items?.map((item, i) => {
                    const [q, a] = item.includes('?') ? item.split('?') : [item, ''];
                    return (
                      <div 
                        key={i} 
                        className="p-10 rounded-3xl border border-slate-100 bg-white shadow-sm hover:shadow-xl transition-all duration-300"
                      >
                        <div className="flex items-start gap-5 mb-6">
                          <span className="font-black text-[10px] uppercase px-2 py-1 rounded bg-slate-900 text-white mt-1 heading-font">Q</span>
                          <p className="font-black text-slate-900 text-2xl heading-font uppercase tracking-tight leading-tight">{q}{q && '?'}</p>
                        </div>
                        <div className="flex items-start gap-5">
                          <span className="font-black text-[10px] uppercase px-2 py-1 rounded text-white mt-1 heading-font" style={{ backgroundColor: colors.secondary }}>A</span>
                          <p className="text-lg text-slate-600 leading-relaxed font-medium">{a || 'Speak with a PT Biz specialist to unpack the specific variables of this metric.'}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {section.type === 'case_study' && (
              <div 
                className="p-14 rounded-[50px] border-2 relative overflow-hidden shadow-xl"
                style={{ backgroundColor: `${colors.secondary}05`, borderColor: `${colors.secondary}15` }}
              >
                <div className="absolute top-[-40px] left-[-40px] w-64 h-64 opacity-5" style={{ backgroundColor: colors.secondary, borderRadius: '40% 60% 70% 30% / 40% 50% 60% 70%' }}></div>
                
                <div className="flex items-center justify-between mb-10">
                   <h4 className="font-black uppercase text-xs tracking-[0.4em] heading-font" style={{ color: colors.secondary }}>Real World Data</h4>
                   <svg className="w-12 h-12 opacity-20" fill="currentColor" viewBox="0 0 24 24" style={{ color: colors.secondary }}>
                      <path d="M14.017 21L14.017 18C14.017 16.8954 14.9124 16 16.017 16H19.017V14H17.017C15.9124 14 15.017 13.1046 15.017 12V9C15.017 7.89543 15.9124 7 17.017 7H20.017V10H18.017C17.4647 10 17.017 10.4477 17.017 11V12H20.017C21.1216 12 22.017 12.8954 22.017 14V21H14.017ZM3.01709 21L3.01709 18C3.01709 16.8954 3.91252 16 5.01709 16H8.01709V14H6.01709C4.91252 14 4.01709 13.1046 4.01709 12V9C4.01709 7.89543 4.91252 7 6.01709 7H9.01709V10H7.01709C6.4648 10 6.01709 10.4477 6.01709 11V12H9.01709C10.1217 12 11.0171 12.8954 11.0171 14V21H3.01709Z" />
                   </svg>
                </div>
                
                <p className="text-3xl font-black text-slate-900 mb-8 leading-tight heading-font uppercase tracking-tight">{section.heading}</p>
                <div className="text-xl text-slate-700 leading-[1.8] italic font-normal opacity-90 border-l-4 pl-10 border-slate-200">
                  {section.content}
                </div>
              </div>
            )}
          </section>
        ))}

        {/* Closing / Conclusion */}
        <section className="pt-24 border-t-4 border-slate-50">
          <div className="flex flex-col items-center text-center max-w-2xl mx-auto">
            <h2 className="text-4xl font-black text-slate-900 mb-10 heading-font uppercase tracking-tight leading-none">
              The Path Forward
            </h2>
            <div className="text-2xl text-slate-600 leading-relaxed italic font-light">
              {content.conclusion}
            </div>
          </div>
        </section>

        {/* CTA Section - The Hard Offer */}
        <section 
          className="rounded-[60px] p-20 text-center text-white space-y-12 no-break-inside shadow-3xl relative overflow-hidden"
          style={{ backgroundColor: colors.secondary }}
        >
          {/* Subtle Accent Circles */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full -mr-40 -mt-40 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-black/10 rounded-full -ml-40 -mb-40 blur-3xl"></div>

          <div className="relative z-10 space-y-6">
            <h2 className="text-5xl md:text-6xl font-black heading-font uppercase leading-[0.9] tracking-tighter">
              Scale Your Freedom
            </h2>
            <div className="w-20 h-1.5 bg-white/30 mx-auto rounded-full"></div>
            <h3 className="text-xl md:text-2xl font-black uppercase tracking-[0.4em] heading-font opacity-80">Strategic Gameplan Call</h3>
          </div>
          
          <p className="text-2xl max-w-2xl mx-auto font-medium leading-relaxed opacity-90 relative z-10 heading-font uppercase tracking-wide">
            {content.cta}
          </p>
          
          <div className="pt-8 relative z-10">
            <button 
              className="bg-white px-16 py-7 rounded-3xl text-2xl font-black heading-font uppercase shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300" 
              style={{ color: colors.secondary }}
            >
              Secure My Session
            </button>
          </div>
        </section>

        {/* Professional Footer */}
        <footer className="text-center pt-24 border-t border-slate-100">
          <div className="flex items-center justify-center gap-6 mb-8">
            <div className="h-px w-20 bg-slate-100"></div>
            {logoUrl ? (
               <img src={logoUrl} className="h-12 object-contain grayscale opacity-30" alt="Brand Logo" />
            ) : (
               <span className="text-4xl font-black italic tracking-tighter heading-font text-slate-900 opacity-20">
                PT<span style={{ color: colors.secondary }}>BIZ</span>
              </span>
            )}
            <div className="h-px w-20 bg-slate-100"></div>
          </div>
          <p className="text-[11px] text-slate-400 font-black uppercase tracking-[0.6em] mb-4">
            Physical Therapy Business Systems &bull; Confidential
          </p>
          <p className="text-[10px] text-slate-300 font-medium tracking-wide">
            Intended for strategic internal implementation. &copy; {new Date().getFullYear()} PT BIZ LLC. All Rights Reserved.
          </p>
        </footer>
      </div>
    </div>
  );
};

export default LeadMagnetPreview;
