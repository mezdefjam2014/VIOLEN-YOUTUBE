
import React, { useState, useRef, useEffect } from 'react';
import { Send, Image as ImageIcon, Loader2, X, Globe, MessageCircle, Copy, Zap, FileText, ChevronDown, Palette, Search, Eye, Code, Map, ShoppingBag, AlignLeft, Film, Lightbulb, Paperclip, Save, FolderOpen, Trash2 } from 'lucide-react';
import { ChatMessage, BotMode, ChatSession } from '../types';
import { queryWebNetwork } from '../services/gemini';
import { MessageBubble } from './MessageBubble';
import { fileToBase64, formatTime } from '../utils/helpers';

interface ContextMenuState {
  x: number;
  y: number;
  text: string;
}

interface ChatModeProps {
  messages: ChatMessage[];
  onMessagesChange: (messages: ChatMessage[]) => void;
  theme: 'dark' | 'light';
}

const CHAT_ARCHIVE_KEY = 'violen_chat_archives';

const BOT_MODES: { id: BotMode; label: string; icon: React.ElementType; color: string }[] = [
  { id: 'surfer', label: 'Web Surfer', icon: Globe, color: 'text-blue-500' },
  { id: 'research', label: 'Deep Research', icon: Search, color: 'text-violet-500' },
  { id: 'creative', label: 'Creative', icon: Palette, color: 'text-pink-500' },
  { id: 'coder', label: 'Dev Compiler', icon: Code, color: 'text-emerald-500' },
  { id: 'visual', label: 'Visual Recon', icon: Eye, color: 'text-amber-500' },
  { id: 'guide', label: 'Game Guide', icon: Map, color: 'text-orange-500' },
  { id: 'deal_hunter', label: 'Price Hunter', icon: ShoppingBag, color: 'text-lime-500' },
  { id: 'unroller', label: 'Thread Unroller', icon: AlignLeft, color: 'text-cyan-500' },
  { id: 'trailer', label: 'Trailer Finder', icon: Film, color: 'text-red-500' },
  { id: 'ideas', label: 'Trend Ideas', icon: Lightbulb, color: 'text-yellow-500' },
];

export const ChatMode: React.FC<ChatModeProps> = ({ messages, onMessagesChange, theme }) => {
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [activeBotMode, setActiveBotMode] = useState<BotMode>('surfer');
  const [isModeDropdownOpen, setIsModeDropdownOpen] = useState(false);
  
  // Archive State
  const [isArchivesOpen, setIsArchivesOpen] = useState(false);
  const [archives, setArchives] = useState<ChatSession[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isDark = theme === 'dark';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    const handleClick = () => {
        setContextMenu(null);
        setIsModeDropdownOpen(false);
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  // Load Archives
  useEffect(() => {
    const stored = localStorage.getItem(CHAT_ARCHIVE_KEY);
    if (stored) {
        try {
            setArchives(JSON.parse(stored));
        } catch (e) { console.error("Failed to load chat archives"); }
    }
  }, []);

  const saveCurrentSession = () => {
    if (messages.length === 0) return;
    
    const title = messages[0].text.slice(0, 40) + (messages[0].text.length > 40 ? '...' : '');
    const session: ChatSession = {
        id: Date.now().toString(),
        title: title || 'Untitled Investigation',
        messages: messages,
        timestamp: Date.now()
    };
    
    const newArchives = [session, ...archives];
    setArchives(newArchives);
    localStorage.setItem(CHAT_ARCHIVE_KEY, JSON.stringify(newArchives));
    setIsArchivesOpen(true);
  };

  const loadSession = (session: ChatSession) => {
      onMessagesChange(session.messages);
      setIsArchivesOpen(false);
  };

  const deleteSession = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const newArchives = archives.filter(a => a.id !== id);
      setArchives(newArchives);
      localStorage.setItem(CHAT_ARCHIVE_KEY, JSON.stringify(newArchives));
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    const selection = window.getSelection();
    const selectedText = selection?.toString().trim();

    if (selectedText) {
      e.preventDefault();
      setContextMenu({
        x: e.pageX,
        y: e.pageY,
        text: selectedText
      });
    }
  };

  const handleAskAboutSelection = () => {
    if (contextMenu?.text) {
      setInputText(prev => `> ${contextMenu.text}\n\nSearch: `);
      if (inputRef.current) inputRef.current.focus();
    }
    setContextMenu(null);
  };

  const handleCopySelection = () => {
    if (contextMenu?.text) {
      navigator.clipboard.writeText(contextMenu.text);
    }
    setContextMenu(null);
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedImage(file);
      const base64 = await fileToBase64(file);
      setImagePreview(`data:${file.type};base64,${base64}`);
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSend = async () => {
    if ((!inputText.trim() && !selectedImage) || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: inputText,
      imageUrl: imagePreview || undefined,
      timestamp: Date.now()
    };

    onMessagesChange([...messages, userMessage]);
    
    setInputText('');
    setIsLoading(true);
    
    let imageBase64: string | undefined;
    let imageMimeType: string | undefined;

    if (selectedImage && imagePreview) {
      const rawBase64 = await fileToBase64(selectedImage);
      imageBase64 = rawBase64;
      imageMimeType = selectedImage.type;
      clearImage();
    }

    try {
      const response = await queryWebNetwork(userMessage.text, imageBase64, imageMimeType, activeBotMode);
      
      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: response.text,
        timestamp: Date.now(),
        sources: response.groundingChunks?.map(chunk => ({
          title: chunk.web?.title,
          uri: chunk.web?.uri
        })).filter(s => s.uri) 
      };

      onMessagesChange([...messages, userMessage, botMessage]);
    } catch (error) {
      console.error("Network Packet Loss", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const activeModeData = BOT_MODES.find(m => m.id === activeBotMode) || BOT_MODES[0];
  const ActiveIcon = activeModeData.icon;

  return (
    <div className={`flex flex-col h-full relative overflow-hidden ${isDark ? 'bg-zinc-950' : 'bg-slate-50'}`}>
      
      {/* Glass Header */}
      <header className={`h-16 flex-shrink-0 flex items-center px-4 md:px-6 z-10 justify-between glass border-b ${isDark ? 'border-zinc-800 bg-zinc-900/60' : 'border-slate-200 bg-white/60'}`}>
        <div className="flex items-center gap-3">
             <div className="md:hidden w-8"></div> {/* Spacer for menu button */}
            <div className={`flex flex-col`}>
                <h2 className={`text-sm font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    VIOLEN <span className="text-violet-500">INTELLIGENCE</span>
                </h2>
                <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${isLoading ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'}`}></span>
                    <span className="text-[10px] font-medium text-slate-500 uppercase">{isLoading ? 'Processing' : 'Standby'}</span>
                </div>
            </div>
        </div>

        <div className="flex items-center gap-2">
            {/* Archive Button */}
            <button 
                onClick={() => setIsArchivesOpen(!isArchivesOpen)}
                className={`p-2 rounded-lg transition-colors relative ${isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-slate-100 text-slate-600'} ${isArchivesOpen ? 'text-red-500' : ''}`}
                title="Case Archives"
            >
                <FolderOpen className="w-5 h-5" />
                {archives.length > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-red-600 rounded-full"></span>}
            </button>
            
            {/* Save Button */}
            <button 
                onClick={saveCurrentSession}
                disabled={messages.length === 0}
                className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-slate-100 text-slate-600'}`}
                title="Save Case"
            >
                <Save className="w-5 h-5" />
            </button>

            <div className="h-6 w-px bg-zinc-700/20 mx-1"></div>

            {/* Bot Selector */}
            <div className="relative">
            <button 
                onClick={(e) => { e.stopPropagation(); setIsModeDropdownOpen(!isModeDropdownOpen); }}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-full transition-all border shadow-sm ${
                    isDark 
                    ? 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-zinc-200' 
                    : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
            >
                <ActiveIcon className={`w-3.5 h-3.5 ${activeModeData.color}`} />
                <span className="text-xs font-semibold hidden sm:block">{activeModeData.label}</span>
                <ChevronDown className="w-3 h-3 opacity-50" />
            </button>

            {isModeDropdownOpen && (
                <div className={`absolute top-full right-0 mt-2 w-56 max-h-[70vh] overflow-y-auto rounded-xl shadow-2xl z-50 animate-fade-in border glass custom-scrollbar
                    ${isDark ? 'bg-zinc-900/95 border-zinc-800' : 'bg-white/95 border-slate-200'}
                `}>
                <div className="p-1.5 space-y-0.5">
                    <div className="px-2 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nodes</div>
                    {BOT_MODES.map(mode => {
                    const ModeIcon = mode.icon;
                    const isActive = activeBotMode === mode.id;
                    return (
                        <button
                        key={mode.id}
                        onClick={() => { setActiveBotMode(mode.id); setIsModeDropdownOpen(false); }}
                        className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors 
                            ${isActive 
                                ? isDark ? 'bg-zinc-800 text-white' : 'bg-slate-100 text-slate-900' 
                                : isDark ? 'text-zinc-400 hover:bg-zinc-800/50' : 'text-slate-500 hover:bg-slate-50'}
                        `}
                        >
                        <ModeIcon className={`w-4 h-4 ${mode.color}`} />
                        <span className="text-sm font-medium">{mode.label}</span>
                        </button>
                    );
                    })}
                </div>
                </div>
            )}
            </div>
        </div>
      </header>

      {/* Main Content Area (Split for Archive Drawer) */}
      <div className="flex-1 overflow-hidden flex relative">
          
          {/* Chat Area */}
          <div 
            className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6"
            onContextMenu={handleContextMenu}
          >
            {messages.length === 0 ? (
                 <div className="h-full flex flex-col items-center justify-center opacity-40">
                    <div className={`p-8 rounded-full mb-6 border ${isDark ? 'bg-[#0c0c0e] border-zinc-800' : 'bg-slate-100 border-slate-300'}`}>
                        <MessageCircle className={`w-12 h-12 stroke-1 ${isDark ? 'text-zinc-700' : 'text-slate-400'}`} />
                    </div>
                    <p className={`font-mono text-xs uppercase tracking-widest ${isDark ? 'text-zinc-600' : 'text-slate-400'}`}>Begin Investigation</p>
                  </div>
            ) : (
                messages.map(msg => (
                <MessageBubble key={msg.id} message={msg} theme={theme} />
                ))
            )}
            {isLoading && (
            <div className="flex justify-start animate-fade-in">
                <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border ${
                    isDark 
                    ? 'bg-zinc-900 border-zinc-800' 
                    : 'bg-white border-slate-100 shadow-sm'
                }`}>
                <Loader2 className="w-4 h-4 text-violet-500 animate-spin" />
                <span className={`text-xs font-medium ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                    Thinking...
                </span>
                </div>
            </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Archive Drawer */}
          <div className={`
              absolute top-0 right-0 bottom-0 w-80 shadow-2xl transition-transform duration-300 transform border-l
              ${isArchivesOpen ? 'translate-x-0' : 'translate-x-full'}
              ${isDark ? 'bg-[#0c0c0e] border-zinc-800' : 'bg-white border-slate-200'}
          `}>
              <div className="p-4 border-b border-zinc-800/50 flex items-center justify-between">
                  <h3 className={`font-bold text-xs uppercase tracking-widest ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>Case Archives</h3>
                  <button onClick={() => setIsArchivesOpen(false)} className="opacity-50 hover:opacity-100"><X className="w-4 h-4" /></button>
              </div>
              <div className="overflow-y-auto h-full p-2 space-y-1">
                {archives.map(session => (
                    <div 
                        key={session.id}
                        onClick={() => loadSession(session)}
                        className={`p-3 rounded-lg border cursor-pointer transition-all group relative ${
                            isDark 
                            ? 'bg-zinc-900/50 border-zinc-800 hover:border-red-600' 
                            : 'bg-slate-50 border-slate-200 hover:border-red-400'
                        }`}
                    >
                        <div className={`font-bold text-xs truncate mb-1 pr-6 ${isDark ? 'text-zinc-200' : 'text-slate-800'}`}>{session.title}</div>
                        <div className={`text-[10px] ${isDark ? 'text-zinc-600' : 'text-slate-500'}`}>{formatTime(session.timestamp)}</div>
                        
                        <button 
                            onClick={(e) => deleteSession(session.id, e)}
                            className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-500 hover:text-red-500"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    </div>
                ))}
                {archives.length === 0 && <div className="text-center py-8 text-[10px] opacity-40 italic">No saved investigations</div>}
              </div>
          </div>

      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div 
          className={`fixed border shadow-xl rounded-xl py-1 z-50 min-w-[160px] animate-fade-in ${
            isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'
          }`}
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button 
            onClick={handleAskAboutSelection}
            className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 ${
                isDark ? 'text-zinc-200 hover:bg-zinc-800' : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Search className="w-4 h-4" />
            Research This
          </button>
          <button 
            onClick={handleCopySelection}
            className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 ${
                isDark ? 'text-zinc-400 hover:bg-zinc-800' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <Copy className="w-4 h-4" />
            Copy Text
          </button>
        </div>
      )}

      {/* Input Area */}
      <div className={`p-4 md:p-6 border-t flex-shrink-0 ${isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-50 border-slate-200'}`}>
        <div className="max-w-4xl mx-auto relative">
          
          {/* Image Preview */}
          {imagePreview && (
            <div className="absolute bottom-full left-0 mb-3 p-2 bg-zinc-900 rounded-xl border border-zinc-800 shadow-2xl flex items-start animate-slide-up">
              <img src={imagePreview} alt="Preview" className="h-20 w-auto rounded-lg" />
              <button 
                onClick={clearImage}
                className="ml-2 p-1 bg-zinc-800 rounded-full text-zinc-400 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Input Bar */}
          <div className={`
            flex items-end gap-2 rounded-2xl p-2 shadow-sm transition-all border
            focus-within:ring-2 focus-within:ring-violet-500/20
            ${isDark 
                ? 'bg-zinc-900 border-zinc-800 focus-within:border-zinc-700' 
                : 'bg-white border-slate-200 focus-within:border-violet-200'
            }
          `}>
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleImageSelect}
              accept="image/*"
              className="hidden" 
            />
            
            <button 
              onClick={() => fileInputRef.current?.click()}
              className={`p-3 rounded-xl transition-colors flex-shrink-0 ${
                selectedImage 
                    ? 'bg-violet-500/10 text-violet-500' 
                    : isDark ? 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
              }`}
              title="Upload Image"
            >
              <Paperclip className="w-5 h-5" />
            </button>
            
            <textarea
              ref={inputRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Ask ${activeModeData.label}...`}
              className={`
                flex-1 bg-transparent border-0 resize-none focus:ring-0 py-3 max-h-32 min-h-[44px] text-sm
                ${isDark ? 'text-zinc-100 placeholder-zinc-500' : 'text-slate-800 placeholder-slate-400'}
              `}
              rows={1}
              style={{ height: 'auto', minHeight: '44px' }} 
            />

            <button
              onClick={handleSend}
              disabled={isLoading || (!inputText.trim() && !selectedImage)}
              className={`
                p-3 rounded-xl transition-all shadow-md flex-shrink-0
                ${isLoading || (!inputText.trim() && !selectedImage)
                    ? isDark ? 'bg-zinc-800 text-zinc-600' : 'bg-slate-100 text-slate-300'
                    : 'bg-violet-600 hover:bg-violet-500 text-white shadow-violet-500/20'
                }
              `}
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
