import React, { useState, useEffect, useMemo } from 'react';
import { ChatMessage } from '../types';
import { User, Cpu, ExternalLink, Image as ImageIcon, Download, Search, Play, Youtube, VideoOff, RefreshCw, AlertTriangle } from 'lucide-react';
import { formatTime } from '../utils/helpers';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MessageBubbleProps {
  message: ChatMessage;
  theme?: 'dark' | 'light';
}

// Static definition to prevent re-creation on render
const REMARK_PLUGINS = [remarkGfm];

// ----------------------------------------------------------------------
// COMPONENT: YouTube Embed with Fallback
// ----------------------------------------------------------------------
const YouTubeEmbedComponent = ({ url, title }: { url: string, title?: React.ReactNode }) => {
  const [isValid, setIsValid] = useState<boolean | null>(null);

  const getVideoId = (url: string) => {
    if (!url) return null;
    try {
      const match = url.match(/(?:youtu\.be\/|youtube\.com(?:\/embed\/|\/v\/|\/watch\?v=|\/user\/\S+|\/ytscreeningroom\?v=|\/shorts\/))([\w-]{11})/);
      return (match && match[1]) ? match[1] : null;
    } catch (e) { return null; }
  };

  const videoId = getVideoId(url);

  useEffect(() => {
    if (!videoId) { setIsValid(false); return; }
    const img = new Image();
    img.src = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    img.onload = () => {
      // 120px usually indicates the "Video Unavailable" placeholder image
      setIsValid(img.width > 120);
    };
    img.onerror = () => setIsValid(false);
  }, [videoId]);

  if (!videoId) return null;

  if (isValid === false) {
    const searchTitle = typeof title === 'string' ? title : 'related video';
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchTitle)}`;
    return (
        <div className="my-4 p-4 bg-red-500/5 border border-red-500/20 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
             <div className="flex items-center gap-3">
                 <div className="p-2 bg-red-500/10 rounded-lg"><VideoOff className="w-5 h-5 text-red-500" /></div>
                 <div className="flex flex-col">
                     <span className="text-sm font-bold text-red-500">Video Restricted</span>
                     <span className="text-xs opacity-60">Stream unavailable in this region.</span>
                 </div>
             </div>
             <a href={searchUrl} target="_blank" rel="noopener noreferrer"
                className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors">
                 <Search className="w-3 h-3" /> Find Alternative
             </a>
        </div>
    );
  }

  if (isValid === null) {
    return (
        <div className="my-6 w-full max-w-2xl h-48 bg-black/10 animate-pulse rounded-xl border border-black/5 flex items-center justify-center">
            <span className="text-xs opacity-50 font-mono flex items-center gap-2"><Youtube className="w-4 h-4" /> VERIFYING...</span>
        </div>
    );
  }

  return (
    <div className="my-6 w-full max-w-2xl group relative rounded-xl overflow-hidden shadow-2xl border border-black/10">
      <div className="relative pt-[56.25%] bg-black">
        <iframe
          className="absolute top-0 left-0 w-full h-full"
          src={`https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0&modestbranding=1`}
          title="YouTube video player"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    </div>
  );
};

const YouTubeEmbed = React.memo(YouTubeEmbedComponent);

// ----------------------------------------------------------------------
// COMPONENT: Image with Proactive Validation
// ----------------------------------------------------------------------
const MarkdownImageComponent = ({src, alt, theme}: {src?: string, alt?: string, theme?: string}) => {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const isDark = theme === 'dark';

  // Proactive check on mount
  useEffect(() => {
    if (!src) { setStatus('error'); return; }
    
    // Wiki wrapper check
    if (src.includes('wiki/File:') || src.includes('wiki/Image:')) {
        setStatus('error'); // Treat wiki wrappers as "not direct images" so we fall back to link card
        return;
    }

    const img = new Image();
    img.src = src;
    img.onload = () => setStatus('loaded');
    img.onerror = () => setStatus('error');
  }, [src]);

  // Case: Wiki/HTML Page Wrapper (Fallback to Link Card)
  if (src && (src.includes('wiki/File:') || src.includes('wiki/Image:'))) {
    return (
      <a href={src} target="_blank" rel="noopener noreferrer"
        className={`block my-4 p-3 rounded-xl border transition-all group max-w-sm ${
            isDark ? 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800' : 'bg-white border-slate-200 hover:bg-slate-50'
        }`}>
         <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isDark ? 'bg-zinc-800' : 'bg-slate-100'}`}>
                <ExternalLink className="w-5 h-5 text-violet-500" />
            </div>
            <div className="flex-1 min-w-0">
                <div className={`font-semibold text-sm truncate ${isDark ? 'text-zinc-200' : 'text-slate-800'}`}>View Source Page</div>
                <div className="text-xs opacity-50 truncate">{alt || 'Wikipedia Image'}</div>
            </div>
         </div>
      </a>
    );
  }
  
  // Case: Broken Link (Show Alternative Search UI)
  if (status === 'error' || !src) {
    const searchUrl = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(alt || 'image')}`;
    return (
      <div className={`my-3 p-3 rounded-xl border flex items-center justify-between group max-w-md ${
          isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-slate-50 border-slate-200'
      }`}>
        <div className="flex items-center gap-3 overflow-hidden">
           <div className={`p-2 rounded-lg flex-shrink-0 ${isDark ? 'bg-zinc-800' : 'bg-slate-200'}`}>
             <ImageIcon className="w-4 h-4 opacity-50" />
           </div>
           <div className="flex flex-col min-w-0">
               <span className={`text-xs font-semibold truncate ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>Preview Unavailable</span>
               <span className="text-[10px] opacity-50 truncate max-w-[150px]">{alt || 'Source blocked'}</span>
           </div>
        </div>
        <a href={searchUrl} target="_blank" rel="noopener noreferrer"
          className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide flex items-center gap-1.5 transition-colors ${
              isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300' : 'bg-white border border-slate-200 hover:bg-slate-50 text-slate-600'
          }`}>
          <Search className="w-3 h-3" /> Find Alt
        </a>
      </div>
    );
  }

  // Case: Loading
  if (status === 'loading') {
      return (
          <div className={`my-4 w-full max-w-sm aspect-video rounded-xl animate-pulse flex items-center justify-center ${
              isDark ? 'bg-zinc-900 border border-zinc-800' : 'bg-slate-100 border border-slate-200'
          }`}>
              <RefreshCw className="w-5 h-5 opacity-20 animate-spin" />
          </div>
      );
  }

  // Case: Success
  return (
    <div className="my-4 relative group inline-block max-w-full">
      <img 
        src={src} alt={alt} 
        className={`rounded-xl shadow-lg max-w-full h-auto max-h-[400px] object-cover border ${
            isDark ? 'border-zinc-800 bg-zinc-950' : 'border-slate-200 bg-slate-50'
        }`}
        loading="lazy" referrerPolicy="no-referrer"
      />
      <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <a href={src} target="_blank" rel="noopener noreferrer"
          className="p-1.5 bg-black/60 backdrop-blur-md text-white rounded-lg hover:bg-violet-600 border border-white/10 shadow-xl">
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
};

const MarkdownImage = React.memo(MarkdownImageComponent);

// ----------------------------------------------------------------------
// MAIN COMPONENT: MessageBubble
// ----------------------------------------------------------------------
const MessageBubbleComponent: React.FC<MessageBubbleProps> = ({ message, theme = 'dark' }) => {
  const isUser = message.role === 'user';
  const isDark = theme === 'dark';

  // Memoize markdown components to prevent re-renders of heavy sub-components like YouTube embeds
  const markdownComponents = useMemo(() => ({
    img: (props: any) => <MarkdownImage {...props} theme={theme} />,
    
    // Typography overrides for theme
    p: ({children}: any) => <p className="mb-4 last:mb-0 leading-7">{children}</p>,
    strong: ({children}: any) => <strong className={`font-bold ${isUser ? 'text-white' : isDark ? 'text-white' : 'text-slate-900'}`}>{children}</strong>,
    
    // Headings
    h1: ({children}: any) => <h1 className={`text-xl font-bold mb-3 mt-5 pb-2 border-b ${isUser ? 'border-white/20' : isDark ? 'border-zinc-800' : 'border-slate-200'}`}>{children}</h1>,
    h2: ({children}: any) => <h2 className="text-lg font-bold mb-2 mt-4">{children}</h2>,
    h3: ({children}: any) => <h3 className="text-base font-bold mb-2 mt-3">{children}</h3>,
    
    // Lists
    ul: ({children}: any) => <ul className="list-disc pl-5 mb-4 space-y-1">{children}</ul>,
    ol: ({children}: any) => <ol className="list-decimal pl-5 mb-4 space-y-1">{children}</ol>,
    
    // Code Blocks
    code: ({children, className, ...props}: any) => {
      const match = /language-(\w+)/.exec(className || '');
      const isInline = !match && !String(children).includes('\n');
      
      if (isInline) {
        return <code className={`px-1.5 py-0.5 rounded font-mono text-sm ${
            isUser ? 'bg-white/20' : isDark ? 'bg-black/30 border border-zinc-700 text-zinc-300' : 'bg-slate-100 border border-slate-200 text-slate-700'
        }`} {...props}>{children}</code>;
      }
      return (
        <code className={`block p-4 rounded-xl text-xs font-mono overflow-x-auto border my-3 ${
            isDark ? 'bg-black/50 border-zinc-800 text-zinc-300' : 'bg-slate-50 border-slate-200 text-slate-700'
        }`} {...props}>{children}</code>
      );
    },

    // Blockquotes
    blockquote: ({children}: any) => <blockquote className={`border-l-4 pl-4 py-1 italic mb-4 ${
        isUser ? 'border-white/30 bg-white/5' : isDark ? 'border-violet-500/50 bg-violet-500/5 text-zinc-400' : 'border-violet-500/50 bg-violet-50 text-slate-600'
    }`}>{children}</blockquote>,
    
    // Links - Using Memoized YouTubeEmbed
    a: ({href, children}: any) => {
      const isYouTube = href && (href.includes('youtube.com/watch') || href.includes('youtu.be/'));
      return (
        <>
          <a href={href} target="_blank" rel="noopener noreferrer" 
             className={`font-semibold underline underline-offset-2 transition-colors ${
                 isUser ? 'text-white decoration-white/30 hover:decoration-white' : 'text-violet-500 decoration-violet-500/30 hover:decoration-violet-500'
             }`}>
            {children}
          </a>
          {isYouTube && href && <YouTubeEmbed url={href} title={children} />}
        </>
      );
    },
    
    // Tables
    table: ({children}: any) => <div className={`overflow-x-auto mb-4 rounded-lg border ${isUser ? 'border-white/20' : isDark ? 'border-zinc-800' : 'border-slate-200'}`}><table className="w-full text-left border-collapse">{children}</table></div>,
    thead: ({children}: any) => <thead className={isUser ? 'bg-white/10' : isDark ? 'bg-zinc-800/50' : 'bg-slate-100'}>{children}</thead>,
    tr: ({children}: any) => <tr className={`border-b ${isUser ? 'border-white/10' : isDark ? 'border-zinc-800' : 'border-slate-100'} last:border-0`}>{children}</tr>,
    th: ({children}: any) => <th className="p-3 font-semibold text-xs uppercase tracking-wider">{children}</th>,
    td: ({children}: any) => <td className="p-3 text-sm">{children}</td>,
    hr: () => <hr className={`my-6 border-t ${isUser ? 'border-white/20' : isDark ? 'border-zinc-800' : 'border-slate-200'}`} />
  }), [isUser, isDark, theme]);

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} mb-6 group`}>
      <div className={`flex max-w-[95%] md:max-w-[80%] ${isUser ? 'flex-row-reverse' : 'flex-row'} items-start gap-3`}>
        
        {/* Avatar */}
        <div className={`
          flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-lg
          ${isUser 
            ? 'bg-gradient-to-br from-violet-600 to-indigo-600 text-white' 
            : isDark ? 'bg-zinc-800 text-violet-400 border border-zinc-700' : 'bg-white text-violet-600 border border-slate-200'}
        `}>
          {isUser ? <User className="w-4 h-4" /> : <Cpu className="w-4 h-4" />}
        </div>

        {/* Content Bubble */}
        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} min-w-0 flex-1`}>
          
          {/* Header Metadata (Name/Time) */}
          <div className={`flex items-center gap-2 mb-1 px-1 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
            <span className={`text-[11px] font-bold ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
                {isUser ? 'You' : 'VIOLEN AI'}
            </span>
            <span className={`text-[10px] ${isDark ? 'text-zinc-600' : 'text-slate-400'}`}>
                {formatTime(message.timestamp)}
            </span>
          </div>

          <div className={`
            px-5 py-4 rounded-2xl shadow-sm leading-relaxed w-full overflow-hidden text-[15px]
            ${isUser 
              ? 'bg-violet-600 text-white rounded-tr-sm' 
              : isDark 
                ? 'bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-tl-sm' 
                : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm shadow-sm'
            }
          `}>
            {/* Attached Image Preview */}
            {message.imageUrl && (
              <div className="mb-4 rounded-lg overflow-hidden border border-white/10 shadow-lg">
                <img src={message.imageUrl} alt="User upload" className="max-w-full h-auto max-h-80 object-cover" />
              </div>
            )}
            
            {/* Markdown Body */}
            <div className={`markdown-body`}>
              <Markdown
                remarkPlugins={REMARK_PLUGINS}
                components={markdownComponents}
              >
                {message.text}
              </Markdown>
            </div>
          </div>

          {/* Sources Footprint */}
          {!isUser && message.sources && message.sources.length > 0 && (
            <div className="mt-2 pl-1 flex flex-wrap gap-2 animate-fade-in">
              {message.sources.map((source, idx) => (
                <a
                  key={idx} href={source.uri} target="_blank" rel="noopener noreferrer"
                  className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-[10px] font-medium border transition-all max-w-[200px] ${
                      isDark 
                      ? 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-violet-400 hover:border-violet-900' 
                      : 'bg-white border-slate-200 text-slate-500 hover:text-violet-600 hover:border-violet-200'
                  }`}
                >
                  <ExternalLink className="w-3 h-3 opacity-70" />
                  <span className="truncate">{source.title || 'Web Source'}</span>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Strict memoization comparison
export const MessageBubble = React.memo(MessageBubbleComponent, (prev, next) => {
    return prev.message === next.message && prev.theme === next.theme;
});