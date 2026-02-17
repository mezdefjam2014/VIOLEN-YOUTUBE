
import React, { useState } from 'react';
import { Search, Loader2, Download, Film, ExternalLink } from 'lucide-react';
import { findStockFootage } from '../services/gemini';
import { StockVideo } from '../types';

interface StockModeProps {
  theme: 'dark' | 'light';
}

export const StockMode: React.FC<StockModeProps> = ({ theme }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<StockVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const isDark = theme === 'dark';

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setResults([]);
    
    try {
        const videos = await findStockFootage(query);
        setResults(videos);
    } catch (e) {
        console.error(e);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className={`flex flex-col h-full ${isDark ? 'bg-[#09090b]' : 'bg-slate-50'}`}>
        {/* Header */}
        <header className={`h-16 flex items-center justify-between px-6 border-b metallic-surface ${isDark ? 'border-zinc-800' : 'border-slate-300 bg-white'}`}>
            <h2 className={`text-sm font-bold tracking-widest uppercase flex items-center gap-2 ${isDark ? 'text-zinc-100' : 'text-slate-900'}`}>
                <Film className="w-5 h-5 text-red-600" />
                Stock<span className="text-zinc-500">_Hunter</span>
            </h2>
        </header>

        <div className="flex-1 overflow-y-auto p-6">
            {/* Search Input */}
            <div className="max-w-2xl mx-auto mb-10">
                <form onSubmit={handleSearch} className="relative">
                    <input 
                        type="text" 
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search for free footage (e.g. 'Noir rainy street')..."
                        className={`w-full py-4 px-6 pr-14 rounded-full text-lg shadow-2xl transition-all border outline-none ${
                            isDark 
                            ? 'bg-zinc-900 border-zinc-700 text-white focus:border-red-600 focus:bg-black' 
                            : 'bg-white border-slate-200 text-slate-900 focus:border-red-500'
                        }`}
                    />
                    <button 
                        type="submit"
                        disabled={loading}
                        className="absolute right-2 top-2 bottom-2 w-12 bg-red-600 rounded-full flex items-center justify-center text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                    </button>
                </form>
                <div className={`text-center mt-3 text-[10px] uppercase tracking-widest ${isDark ? 'text-zinc-600' : 'text-slate-400'}`}>
                    Searching: Pexels • Pixabay • Mixkit • Coverr
                </div>
            </div>

            {/* Results Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-7xl mx-auto">
                {results.map((video, idx) => (
                    <div key={idx} className={`group rounded-xl overflow-hidden border transition-all hover:scale-[1.02] ${isDark ? 'bg-zinc-900 border-zinc-800 hover:border-red-900' : 'bg-white border-slate-200 hover:border-red-200 shadow-sm'}`}>
                        {/* Placeholder Thumbnail (Since we don't have direct image URLs easily without API keys, we use a styled generic block) */}
                        <div className="aspect-video bg-black relative flex items-center justify-center overflow-hidden">
                             <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-black opacity-50"></div>
                             <Film className="w-8 h-8 text-zinc-700 relative z-10" />
                             
                             <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 z-20 backdrop-blur-sm">
                                 <a 
                                    href={video.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="px-4 py-2 bg-red-600 text-white rounded-full font-bold text-xs flex items-center gap-2 transform translate-y-2 group-hover:translate-y-0 transition-transform"
                                 >
                                     <Download className="w-3 h-3" /> Download
                                 </a>
                             </div>
                        </div>

                        <div className="p-4">
                            <h3 className={`font-bold text-sm truncate mb-1 ${isDark ? 'text-zinc-200' : 'text-slate-800'}`}>{video.title || 'Untitled Footage'}</h3>
                            <div className="flex items-center justify-between mt-3">
                                <span className={`text-[10px] px-2 py-1 rounded border ${isDark ? 'bg-zinc-950 border-zinc-800 text-zinc-500' : 'bg-slate-100 border-slate-200 text-slate-500'}`}>
                                    {video.source}
                                </span>
                                <a 
                                    href={video.url}
                                    target="_blank"
                                    rel="noopener noreferrer" 
                                    className="text-red-500 hover:text-red-400"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                </a>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {!loading && results.length === 0 && query && (
                <div className="text-center py-20 opacity-40">
                    <p>No verified footage found. Try a broader search term.</p>
                </div>
            )}
        </div>
    </div>
  );
};
