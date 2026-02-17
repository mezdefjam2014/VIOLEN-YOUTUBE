
import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { ScriptMode } from './components/ScriptMode';
import { VideoTranscriber } from './components/VideoTranscriber';
import { Menu } from 'lucide-react';

const THEME_KEY = 'violen_theme';
type Theme = 'dark' | 'light';
type AppMode = 'script' | 'transcribe';

export default function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>('dark');
  const [activeMode, setActiveMode] = useState<AppMode>('script');
  
  // Theme Management
  useEffect(() => {
    const storedTheme = localStorage.getItem(THEME_KEY) as Theme;
    if (storedTheme) {
      setTheme(storedTheme);
      document.documentElement.classList.toggle('dark', storedTheme === 'dark');
    } else {
      setTheme('dark');
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem(THEME_KEY, newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  const renderContent = () => {
      switch (activeMode) {
          case 'transcribe':
              return <VideoTranscriber theme={theme} />;
          case 'script':
          default:
              return <ScriptMode theme={theme} />;
      }
  };

  return (
    <div className={`flex h-screen w-full overflow-hidden transition-colors duration-300 ${theme === 'dark' ? 'bg-zinc-950 text-zinc-100' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* Mobile Toggle */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className={`p-2 rounded-xl shadow-lg border ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'}`}
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Sidebar Navigation */}
      <div className={`
        fixed inset-y-0 left-0 z-40 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        w-72 flex-shrink-0 border-r ${theme === 'dark' ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-slate-200'}
      `}>
        <Sidebar 
          theme={theme}
          onToggleTheme={toggleTheme}
          activeMode={activeMode}
          onNavigate={(mode) => { setActiveMode(mode); setIsSidebarOpen(false); }}
        />
      </div>

      {/* Main Content */}
      <main className="flex-1 h-full relative overflow-hidden flex flex-col">
        {renderContent()}
      </main>

      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
}
