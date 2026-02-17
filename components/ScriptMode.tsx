
import React, { useState, useEffect, useRef } from 'react';
import { FileText, Loader2, Copy, Check, RefreshCw, Radio, Sparkles, Download, Save, Trash2, History, Mic, Image as ImageIcon, ExternalLink, Search, Disc, PlayCircle, FolderOpen, Youtube, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { compileWebReport } from '../services/gemini';
import { ScriptParams, SavedScript } from '../types';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { formatTime } from '../utils/helpers';

interface ScriptModeProps {
  theme: 'dark' | 'light';
}

const STORAGE_KEY = 'violen_scripts';

// ----------------------------------------------------------------------
// COMPONENT: Evidence Image (Polaroid Style)
// ----------------------------------------------------------------------
const ScriptImage = ({src, alt, theme}: {src?: string, alt?: string, theme: string}) => {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const isDark = theme === 'dark';

  useEffect(() => {
    if (!src) { setStatus('error'); return; }
    if (src.includes('wiki/File:') || src.includes('wiki/Image:')) {
        setStatus('error');
        return;
    }
    const img = new Image();
    img.src = src;
    img.onload = () => setStatus('loaded');
    img.onerror = () => setStatus('error');
  }, [src]);

  if (status === 'error' || !src) {
    return null; // Don't show broken images in the final script for a cleaner look
  }

  if (status === 'loading') {
      return (
          <div className="my-4 w-full h-48 bg-zinc-900/50 border border-zinc-800 rounded-sm animate-pulse flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-zinc-700 animate-spin" />
          </div>
      );
  }

  return (
    <div className="my-8 relative group inline-block transform rotate-1 hover:rotate-0 transition-transform duration-500 ease-out">
      <div className={`p-2 pb-8 bg-zinc-100 border border-zinc-400 shadow-xl max-w-sm`}>
        <div className="relative overflow-hidden bg-black aspect-video">
           <img 
            src={src} alt={alt} 
            className="w-full h-full object-cover filter contrast-110 sepia-[0.2]"
            loading="lazy" referrerPolicy="no-referrer"
           />
        </div>
        <div className="mt-3 px-1">
             <div className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest flex justify-between">
                <span>EVIDENCE #{(Math.random() * 1000).toFixed(0)}</span>
                <span>{new Date().toLocaleDateString()}</span>
             </div>
             <div className="font-handwriting text-zinc-800 text-sm mt-1 font-bold truncate leading-tight">{alt?.replace('Visual Evidence:', '').trim() || 'Exhibit A'}</div>
        </div>
      </div>
      <a href={src} target="_blank" rel="noopener noreferrer" className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 bg-black/60 text-white hover:bg-red-600">
         <ExternalLink className="w-3 h-3" />
      </a>
    </div>
  );
};

export const ScriptMode: React.FC<ScriptModeProps> = ({ theme }) => {
  const [params, setParams] = useState<ScriptParams>({
    topic: '',
    channelName: '',
    wordCount: 600,
    tone: 'True Crime'
  });
  const [includeConspiracies, setIncludeConspiracies] = useState(false);
  const [generatedScript, setGeneratedScript] = useState<string>('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [savedScripts, setSavedScripts] = useState<SavedScript[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const isDark = theme === 'dark';

  // Load History
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setSavedScripts(JSON.parse(stored));
      } catch (e) { console.error("Failed to load history"); }
    }
  }, []);

  // Parse Suggestions from Script
  useEffect(() => {
    if (!generatedScript) {
        setSuggestions([]);
        return;
    }
    // Extract lines starting with "> SUGGESTION:"
    const lines = generatedScript.split('\n');
    const foundSuggestions: string[] = [];
    lines.forEach(line => {
        if (line.includes('> SUGGESTION:')) {
            const title = line.replace('> SUGGESTION:', '').trim();
            if (title) foundSuggestions.push(title);
        }
    });
    setSuggestions(foundSuggestions);
  }, [generatedScript]);

  const saveScript = () => {
    if (!generatedScript) return;
    const newScript: SavedScript = {
      id: Date.now().toString(),
      title: params.topic || 'Untitled Case',
      channel: params.channelName,
      content: generatedScript,
      timestamp: Date.now()
    };
    const updated = [newScript, ...savedScripts];
    setSavedScripts(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const deleteScript = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedScripts.filter(s => s.id !== id);
    setSavedScripts(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const loadScript = (script: SavedScript) => {
    setParams({ ...params, topic: script.title, channelName: script.channel });
    setGeneratedScript(script.content);
  };

  const handleGenerate = async (overrideTopic?: string) => {
    const topicToUse = overrideTopic || params.topic;
    if (!topicToUse || !params.channelName) return;
    
    setIsGenerating(true);
    setGeneratedScript('');
    setSuggestions([]);
    setCopied(false);
    
    if (overrideTopic) {
        setParams(prev => ({ ...prev, topic: overrideTopic }));
    }

    try {
      const response = await compileWebReport(topicToUse, params.channelName, params.wordCount, params.tone, includeConspiracies);
      // Remove the raw suggestion lines from the visible script to render them cleanly as buttons instead
      const cleanText = response.text.replace(/> SUGGESTION:.*\n?/g, '');
      setGeneratedScript(cleanText);
      setGeneratedScript(response.text); // Actually, keep raw text so suggestions are available to parser, Markdown will hide them if formatted as comments or blockquotes, but let's just keep them for now.
    } catch (error) { console.error(error); } 
    finally { setIsGenerating(false); }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadScript = () => {
    if (!generatedScript) return;
    const element = document.createElement("a");
    const file = new Blob([generatedScript], {type: 'text/markdown'});
    element.href = URL.createObjectURL(file);
    element.download = `${(params.topic || 'case').replace(/\s+/g, '_')}.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className={`flex flex-col h-full overflow-hidden ${isDark ? 'bg-[#09090b]' : 'bg-slate-100'}`}>
      
      {/* Header */}
      <header className={`h-16 flex items-center justify-between px-6 sticky top-0 z-10 border-b metallic-surface ${isDark ? 'border-zinc-800' : 'border-slate-300 bg-white'}`}>
        <h2 className={`text-sm font-bold tracking-widest uppercase flex items-center gap-2 ${isDark ? 'text-zinc-100' : 'text-slate-900'}`}>
          <Youtube className="w-5 h-5 text-red-600" />
          Script<span className="text-zinc-500">_Manager</span>
        </h2>
        <div className={`text-[10px] font-mono ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
            CASE_ID: {Date.now().toString().slice(-6)}
        </div>
      </header>

      <div className="flex flex-col lg:flex-row h-[calc(100vh-64px)] overflow-hidden">
        
        {/* LEFT: Case Files (Input) */}
        <div className={`w-full lg:w-[380px] flex-shrink-0 border-b lg:border-b-0 lg:border-r overflow-y-auto ${isDark ? 'bg-[#0c0c0e] border-zinc-800' : 'bg-white border-slate-300'}`}>
          <div className="p-6 space-y-8">
             
             {/* Section Title */}
             <div className="flex items-center justify-between border-b pb-2 border-red-900/30">
                <h3 className={`font-black text-sm uppercase tracking-widest ${isDark ? 'text-zinc-300' : 'text-slate-800'}`}>
                    Case Configuration
                </h3>
                <FolderOpen className="w-4 h-4 text-red-700" />
             </div>
            
            <div className="space-y-6">
              <div className="space-y-1.5">
                <label className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>Channel Identity</label>
                <div className="relative">
                    <input
                    type="text"
                    value={params.channelName}
                    onChange={(e) => setParams({ ...params, channelName: e.target.value })}
                    placeholder="e.g. JCS - Criminal Psychology"
                    className={`w-full rounded-sm px-4 py-3 text-xs font-mono outline-none transition-all border ${
                        isDark 
                        ? 'bg-[#18181b] border-zinc-700 text-zinc-100 focus:border-red-600 focus:bg-zinc-900' 
                        : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-red-600'
                    }`}
                    />
                    <div className="absolute right-0 top-0 bottom-0 w-1 bg-red-600 opacity-0 transition-opacity peer-focus:opacity-100"></div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>Investigation Subject</label>
                <textarea
                  value={params.topic}
                  onChange={(e) => setParams({ ...params, topic: e.target.value })}
                  placeholder="Enter case details, suspect name, or mystery..."
                  rows={4}
                  className={`w-full rounded-sm px-4 py-3 text-xs font-mono outline-none transition-all resize-none border ${
                    isDark 
                    ? 'bg-[#18181b] border-zinc-700 text-zinc-100 focus:border-red-600 focus:bg-zinc-900' 
                    : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-red-600'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>Duration (Words)</label>
                  <input
                    type="number"
                    value={params.wordCount}
                    onChange={(e) => setParams({ ...params, wordCount: parseInt(e.target.value) || 0 })}
                    className={`w-full rounded-sm px-4 py-3 text-xs font-mono outline-none transition-all border ${
                        isDark ? 'bg-[#18181b] border-zinc-700 text-zinc-100 focus:border-red-600' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-red-600'
                    }`}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>Narrative Tone</label>
                  <select
                    value={params.tone}
                    onChange={(e) => setParams({ ...params, tone: e.target.value })}
                    className={`w-full rounded-sm px-4 py-3 text-xs font-mono outline-none transition-all border appearance-none ${
                        isDark ? 'bg-[#18181b] border-zinc-700 text-zinc-100 focus:border-red-600' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-red-600'
                    }`}
                  >
                    <option>True Crime</option>
                    <option>Investigative</option>
                    <option>Mystery</option>
                    <option>Dark & Gritty</option>
                    <option>Documentary</option>
                    <option>Informative</option>
                  </select>
                </div>
              </div>
              
              {/* Conspiracy Toggle */}
              <button 
                onClick={() => setIncludeConspiracies(!includeConspiracies)}
                className={`w-full py-3 px-4 rounded-sm border flex items-center justify-between transition-all group ${
                    includeConspiracies 
                    ? 'bg-red-900/20 border-red-600 text-red-500' 
                    : isDark ? 'bg-[#18181b] border-zinc-700 text-zinc-500 hover:border-zinc-500' : 'bg-slate-50 border-slate-300 text-slate-500 hover:border-slate-400'
                }`}
              >
                  <span className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-2">
                    {includeConspiracies ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    Include Conspiracy Theories
                  </span>
                  <div className={`w-8 h-4 rounded-full relative transition-colors ${includeConspiracies ? 'bg-red-600' : 'bg-zinc-600'}`}>
                     <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all duration-300 shadow-sm ${includeConspiracies ? 'translate-x-4' : 'translate-x-0.5'}`}></div>
                  </div>
              </button>

              <button
                onClick={() => handleGenerate()}
                disabled={isGenerating || !params.topic || !params.channelName}
                className="w-full mt-6 bg-red-700 hover:bg-red-600 text-white font-bold py-4 rounded-sm shadow-xl shadow-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center text-xs tracking-widest uppercase transform active:scale-95 border border-red-500"
              >
                {isGenerating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Investigating...</> : <><Disc className="w-4 h-4 mr-2 animate-spin-slow" /> Compile Script</>}
              </button>
            </div>

            {/* Archives */}
            <div className="mt-10 pt-8 border-t border-zinc-800/50">
                <h4 className={`text-[10px] font-bold uppercase tracking-wider mb-4 flex items-center gap-2 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                    <History className="w-3 h-3" /> Case Archives
                </h4>
                <div className="space-y-1">
                    {savedScripts.map(script => (
                        <div 
                            key={script.id}
                            onClick={() => loadScript(script)}
                            className={`p-3 rounded-sm border-l-2 cursor-pointer transition-all group relative flex justify-between items-center ${
                                isDark 
                                ? 'bg-[#121214] border-l-zinc-700 hover:border-l-red-600 hover:bg-zinc-800/50' 
                                : 'bg-slate-50 border-l-slate-300 hover:border-l-red-600 hover:bg-white'
                            }`}
                        >
                            <div className="min-w-0 pr-4">
                                <div className={`font-bold text-xs truncate ${isDark ? 'text-zinc-300' : 'text-slate-800'}`}>{script.title}</div>
                                <div className={`text-[10px] mt-0.5 ${isDark ? 'text-zinc-600' : 'text-slate-500'}`}>{formatTime(script.timestamp)}</div>
                            </div>
                            <button 
                                onClick={(e) => deleteScript(script.id, e)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-500 hover:text-red-500"
                            >
                                <Trash2 className="w-3 h-3" />
                            </button>
                        </div>
                    ))}
                    {savedScripts.length === 0 && <div className="text-[10px] opacity-30 text-center py-4 italic">No archived cases.</div>}
                </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Script Output */}
        <div className={`flex-1 flex flex-col min-w-0 ${isDark ? 'bg-[#050505]' : 'bg-slate-50'}`}>
          <div className={`h-14 px-6 border-b flex justify-between items-center metallic-surface ${isDark ? 'border-zinc-800' : 'border-slate-300 bg-white'}`}>
            <span className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                <FileText className="w-4 h-4" /> Script Preview
            </span>
            {generatedScript && (
              <div className="flex gap-2">
                <button onClick={saveScript} className={`p-2 rounded-sm transition-colors border ${isDark ? 'bg-zinc-900 border-zinc-700 hover:bg-zinc-800 text-zinc-300' : 'bg-white border-slate-300 hover:bg-slate-100 text-slate-700'}`} title="Archive Case">
                  <Save className="w-4 h-4" />
                </button>
                <button onClick={downloadScript} className={`p-2 rounded-sm transition-colors border ${isDark ? 'bg-zinc-900 border-zinc-700 hover:bg-zinc-800 text-zinc-300' : 'bg-white border-slate-300 hover:bg-slate-100 text-slate-700'}`} title="Export Markdown">
                  <Download className="w-4 h-4" />
                </button>
                 <div className="w-px h-6 bg-zinc-700/20 mx-1"></div>
                <button onClick={copyToClipboard} className={`flex items-center space-x-2 px-4 py-1.5 rounded-sm text-xs font-bold uppercase tracking-wider transition-colors border ${copied ? 'bg-green-900/20 border-green-900 text-green-500' : isDark ? 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:bg-zinc-800' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'}`}>
                  {copied ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />} {copied ? 'COPIED' : 'COPY'}
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar" ref={scrollRef}>
            {generatedScript ? (
              <div className="max-w-4xl mx-auto p-8 lg:p-12 animate-fade-in pb-32">
                 <div className={`markdown-body font-sans`}>
                     <Markdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                            // Custom Image Handler
                            img: (props: any) => <ScriptImage {...props} theme={theme} />,
                            
                            // Narrator Icon Handling for Strong tags
                            strong: ({children}: any) => {
                                const text = String(children);
                                const isSpeaker = text.includes('Narrator') || text.includes('Host') || text.includes(params.channelName);
                                return (
                                    <strong className={`font-bold tracking-tight ${isDark ? 'text-zinc-100' : 'text-slate-900'} ${isSpeaker ? 'text-red-500' : ''}`}>
                                        {isSpeaker && <Mic className="inline w-3.5 h-3.5 mr-2 relative -top-0.5" />}
                                        {children}
                                    </strong>
                                );
                            },

                            p: ({children}) => <p className={`mb-6 leading-8 text-[15px] ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>{children}</p>,
                            h1: ({children}) => <h1 className={`text-2xl font-black uppercase tracking-tight mb-8 pb-4 border-b-2 ${isDark ? 'text-white border-red-900/50' : 'text-slate-900 border-red-500/30'}`}>{children}</h1>,
                            h2: ({children}) => <h2 className={`text-lg font-bold uppercase tracking-widest mb-4 mt-10 flex items-center gap-3 ${isDark ? 'text-red-500' : 'text-red-700'}`}><span className="w-4 h-0.5 bg-current"></span>{children}</h2>,
                            h3: ({children}) => <h3 className={`text-base font-bold mb-3 mt-6 ${isDark ? 'text-zinc-100' : 'text-slate-800'}`}>{children}</h3>,
                            ul: ({children}) => <ul className={`list-none pl-0 mb-6 space-y-3 ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>{children}</ul>,
                            li: ({children}) => <li className="flex gap-3"><span className="text-red-600 mt-1.5 text-[10px]">●</span><span>{children}</span></li>,
                            blockquote: ({children}) => <blockquote className={`border-l-2 pl-6 py-2 italic my-8 ${isDark ? 'border-red-600 bg-red-900/5 text-zinc-400' : 'border-red-600 bg-red-50 text-slate-600'}`}>"{children}"</blockquote>,
                            a: ({href, children}) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-red-500 hover:text-red-400 underline decoration-red-900/50 underline-offset-4">{children}</a>
                        }}
                     >
                         {generatedScript}
                     </Markdown>
                 </div>

                 {/* Next Investigations Section */}
                 {suggestions.length > 0 && (
                     <div className="mt-16 pt-8 border-t border-dashed border-zinc-700">
                         <h4 className={`text-xs font-bold uppercase tracking-widest mb-6 flex items-center gap-2 ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>
                             <Search className="w-4 h-4" /> Next Investigations
                         </h4>
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                             {suggestions.map((suggestion, idx) => (
                                 <button 
                                    key={idx}
                                    onClick={() => handleGenerate(suggestion)}
                                    className={`group text-left p-4 rounded-sm border transition-all relative overflow-hidden ${
                                        isDark 
                                        ? 'bg-[#0c0c0e] border-zinc-800 hover:border-red-600 hover:bg-zinc-900' 
                                        : 'bg-white border-slate-200 hover:border-red-600 hover:bg-slate-50'
                                    }`}
                                 >
                                     <div className={`font-bold text-sm mb-2 group-hover:text-red-500 transition-colors ${isDark ? 'text-zinc-200' : 'text-slate-800'}`}>
                                         {suggestion}
                                     </div>
                                     <div className={`text-[10px] flex items-center gap-1 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                                         <span>INVESTIGATE NOW</span>
                                         <ArrowRight className="w-3 h-3 transform group-hover:translate-x-1 transition-transform" />
                                     </div>
                                     <div className="absolute bottom-0 left-0 h-0.5 w-0 bg-red-600 group-hover:w-full transition-all duration-500"></div>
                                 </button>
                             ))}
                         </div>
                     </div>
                 )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center opacity-40">
                <div className={`p-8 rounded-full mb-6 border ${isDark ? 'bg-[#0c0c0e] border-zinc-800' : 'bg-slate-100 border-slate-300'}`}>
                    <FileText className={`w-12 h-12 stroke-1 ${isDark ? 'text-zinc-700' : 'text-slate-400'}`} />
                </div>
                <p className={`font-mono text-xs uppercase tracking-widest ${isDark ? 'text-zinc-600' : 'text-slate-400'}`}>Waiting for case file...</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
