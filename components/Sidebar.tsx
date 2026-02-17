
import React from 'react';
import { Sun, Moon, Youtube, FileText, FileVideo } from 'lucide-react';

type AppMode = 'script' | 'transcribe';

interface SidebarProps {
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  activeMode: AppMode;
  onNavigate: (mode: AppMode) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  theme,
  onToggleTheme,
  activeMode,
  onNavigate
}) => {
  const isDark = theme === 'dark';

  const NavItem = ({ mode, icon: Icon, label }: { mode: AppMode, icon: any, label: string }) => (
    <button
      onClick={() => onNavigate(mode)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all mb-2 ${
        activeMode === mode 
          ? 'bg-red-600 text-white shadow-lg shadow-red-900/40' 
          : isDark 
            ? 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100' 
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
      }`}
    >
      <Icon className="w-5 h-5" />
      <span className="text-sm font-bold tracking-wide uppercase">{label}</span>
    </button>
  );

  return (
    <div className={`flex flex-col h-full ${isDark ? 'bg-[#09090b]' : 'bg-slate-100'}`}>
      {/* Brand Header */}
      <div className={`h-20 flex items-center px-6 border-b ${isDark ? 'border-zinc-800' : 'border-slate-300'}`}>
        <div className="flex items-center gap-4">
          <div className="relative group cursor-pointer">
             <div className="absolute inset-0 bg-red-600 blur opacity-40 group-hover:opacity-60 transition-opacity rounded-xl"></div>
             <div className={`relative w-12 h-8 bg-red-600 rounded-xl flex items-center justify-center shadow-2xl shadow-red-900/50 transition-transform group-hover:scale-105`}>
               <Youtube className="w-6 h-6 text-white fill-white" strokeWidth={1.5} />
             </div>
          </div>
          
          <div className="flex flex-col justify-center">
            <h1 className={`text-xl font-black tracking-tighter uppercase font-mono leading-none ${isDark ? 'text-zinc-100' : 'text-slate-900'}`}>
              VIOLEN<span className="text-red-600">.AI</span>
            </h1>
            <span className={`text-[9px] font-bold tracking-[0.2em] uppercase mt-1 ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>
                Broadcast Engine
            </span>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className={`text-[10px] font-bold uppercase tracking-widest mb-3 ml-1 ${isDark ? 'text-zinc-600' : 'text-slate-500'}`}>
          Operation Mode
        </div>
        
        <NavItem mode="script" icon={FileText} label="Script Writer" />
        <NavItem mode="transcribe" icon={FileVideo} label="Video Transcriber" />
      </div>

      <div className="p-6 pt-0">
        <div className={`p-4 rounded-lg border flex flex-col gap-3 metallic-surface ${isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-slate-300'}`}>
           <div className="flex items-center justify-between">
             <div className="flex items-center gap-2">
               <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600"></span>
                </span>
               <span className={`text-xs font-mono font-bold ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>LIVE SCAN</span>
             </div>
           </div>
           
           <div className="h-px bg-zinc-700/20 w-full"></div>
           
           <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] opacity-60">
                <span>SOURCES</span>
                <span>NYT, CNN, REDDIT +</span>
              </div>
           </div>
        </div>
      </div>

      <div className="flex-1"></div>

      {/* Footer */}
      <div className={`p-6 border-t ${isDark ? 'border-zinc-800' : 'border-slate-300'}`}>
        <button 
          onClick={onToggleTheme}
          className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${
              isDark 
              ? 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600' 
              : 'bg-white border-slate-300 text-slate-600 hover:text-slate-900'
          }`}
        >
          <span className="text-xs font-bold uppercase tracking-wider">Interface Mode</span>
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};
