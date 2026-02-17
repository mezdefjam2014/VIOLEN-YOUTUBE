
import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, Video, FileText, Trash2, Copy, Check, Loader2, AlertTriangle, FileVideo, Cpu, Download } from 'lucide-react';
import Markdown from 'react-markdown';

interface VideoTranscriberProps {
  theme: 'dark' | 'light';
}

// ----------------------------------------------------------------------
// WORKER CODE (Inlined to function without external files)
// ----------------------------------------------------------------------
const WORKER_SCRIPT = `
import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.16.0';

// Configure to load from CDN
env.allowLocalModels = false;
env.useBrowserCache = true;

class AudioTranscriber {
  static instance = null;

  static async getInstance(progress_callback = null) {
    if (this.instance === null) {
      // Using 'whisper-tiny.en' for speed and accuracy trade-off. 
      // It is small (~40MB) and runs fast in browser.
      this.instance = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny.en', { 
        progress_callback 
      });
    }
    return this.instance;
  }
}

self.addEventListener('message', async (event) => {
  const { audio } = event.data;

  try {
    const transcriber = await AudioTranscriber.getInstance((data) => {
      self.postMessage({ status: 'progress', data });
    });

    // Run transcription
    const output = await transcriber(audio, {
      chunk_length_s: 30,
      stride_length_s: 5,
      return_timestamps: true
    });

    self.postMessage({ status: 'complete', text: output.text });
  } catch (error) {
    self.postMessage({ status: 'error', error: error.message });
  }
});
`;

export const VideoTranscriber: React.FC<VideoTranscriberProps> = ({ theme }) => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [transcription, setTranscription] = useState<string>('');
  
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [progress, setProgress] = useState<{ status: string; percent?: number }>({ status: 'idle' });
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
  const workerRef = useRef<Worker | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isDark = theme === 'dark';

  // Initialize Worker on Mount
  useEffect(() => {
    if (!workerRef.current) {
        const blob = new Blob([WORKER_SCRIPT], { type: 'application/javascript' });
        workerRef.current = new Worker(URL.createObjectURL(blob), { type: 'module' });
        
        workerRef.current.onmessage = (e) => {
            const { status, data, text, error } = e.data;
            if (status === 'progress') {
                if (data.status === 'progress') {
                    // Model downloading progress
                    setProgress({ status: 'downloading', percent: data.progress });
                } else if (data.status === 'initiate') {
                     setProgress({ status: 'initializing' });
                }
            } else if (status === 'complete') {
                setTranscription(text);
                setIsTranscribing(false);
                setProgress({ status: 'idle' });
            } else if (status === 'error') {
                setError(error || "Transcription failed.");
                setIsTranscribing(false);
                setProgress({ status: 'idle' });
            }
        };
    }
    return () => {
        workerRef.current?.terminate();
    };
  }, []);

  const getAudioData = async (file: File): Promise<Float32Array> => {
      const arrayBuffer = await file.arrayBuffer();
      const audioContext = new AudioContext({ sampleRate: 16000 }); // Whisper expects 16kHz
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      return audioBuffer.getChannelData(0); // Use left channel
  };

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('video/')) {
        setError("Please upload a valid video file.");
        return;
    }
    setError(null);
    setVideoFile(file);
    setVideoUrl(URL.createObjectURL(file));
    setTranscription('');
    setProgress({ status: 'idle' });
  };

  const onDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
  };

  const onDrop = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          handleFileSelect(e.dataTransfer.files[0]);
      }
  };

  const handleTranscribe = async () => {
      if (!videoFile || !workerRef.current) return;
      
      setIsTranscribing(true);
      setError(null);
      setProgress({ status: 'processing' });
      
      try {
          const audioData = await getAudioData(videoFile);
          workerRef.current.postMessage({ audio: audioData });
      } catch (err: any) {
          setError("Failed to extract audio. The file might be corrupted.");
          setIsTranscribing(false);
      }
  };

  const handleDeleteVideo = () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      setVideoFile(null);
      setVideoUrl(null);
      setTranscription('');
      setError(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDeleteTranscription = () => {
      setTranscription('');
  };

  const handleCopy = () => {
      navigator.clipboard.writeText(transcription);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`flex flex-col h-full ${isDark ? 'bg-[#09090b]' : 'bg-slate-50'}`}>
        
        {/* Header */}
        <header className={`h-16 flex items-center justify-between px-6 border-b metallic-surface flex-shrink-0 ${isDark ? 'border-zinc-800' : 'border-slate-300 bg-white'}`}>
            <h2 className={`text-sm font-bold tracking-widest uppercase flex items-center gap-2 ${isDark ? 'text-zinc-100' : 'text-slate-900'}`}>
                <FileVideo className="w-5 h-5 text-red-600" />
                Video<span className="text-zinc-500">_Transcriber</span>
            </h2>
             <div className="flex items-center gap-2 text-[10px] font-mono opacity-50">
                <Cpu className="w-3 h-3" />
                <span>CLIENT_SIDE ENGINE</span>
             </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 md:p-8">
            <div className="max-w-5xl mx-auto space-y-8">
                
                {/* Upload / Video Area */}
                <div className="space-y-4">
                    {!videoFile ? (
                        <div 
                            onDragOver={onDragOver}
                            onDrop={onDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className={`
                                relative border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all group
                                ${isDark 
                                    ? 'border-zinc-800 bg-[#0c0c0e] hover:border-red-600 hover:bg-zinc-900' 
                                    : 'border-slate-300 bg-white hover:border-red-500 hover:bg-slate-50'
                                }
                            `}
                        >
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                className="hidden" 
                                accept="video/*" 
                                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                            />
                            <div className="flex flex-col items-center gap-4">
                                <div className={`p-4 rounded-full ${isDark ? 'bg-zinc-900 group-hover:bg-black' : 'bg-slate-100 group-hover:bg-white'} transition-colors`}>
                                    <UploadCloud className={`w-8 h-8 ${isDark ? 'text-zinc-500 group-hover:text-red-500' : 'text-slate-400 group-hover:text-red-600'}`} />
                                </div>
                                <div>
                                    <h3 className={`font-bold text-lg ${isDark ? 'text-zinc-200' : 'text-slate-800'}`}>Click or Drag Video Here</h3>
                                    <p className={`text-xs mt-1 ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>Unlimited duration • Local processing</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className={`rounded-xl overflow-hidden border shadow-2xl ${isDark ? 'bg-black border-zinc-800' : 'bg-white border-slate-200'}`}>
                            {/* Video Player Header */}
                            <div className={`px-4 py-3 border-b flex items-center justify-between ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-slate-50 border-slate-200'}`}>
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <Video className="w-4 h-4 text-red-500 flex-shrink-0" />
                                    <span className={`text-xs font-mono truncate ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>{videoFile.name}</span>
                                </div>
                                <button 
                                    onClick={handleDeleteVideo}
                                    className="p-1.5 rounded hover:bg-red-500/10 text-zinc-500 hover:text-red-500 transition-colors"
                                    title="Remove Video"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                            
                            {/* Video Player */}
                            <div className="relative bg-black aspect-video flex items-center justify-center">
                                {videoUrl && (
                                    <video 
                                        src={videoUrl} 
                                        controls 
                                        className="w-full h-full max-h-[500px]" 
                                    />
                                )}
                            </div>

                            {/* Actions Bar */}
                            <div className={`p-4 flex items-center justify-between ${isDark ? 'bg-zinc-900' : 'bg-white'}`}>
                                <div className="text-[10px] font-mono opacity-50 flex flex-col gap-0.5">
                                    <span>SIZE: {(videoFile.size / (1024 * 1024)).toFixed(2)} MB</span>
                                    <span>TYPE: {videoFile.type.split('/')[1]?.toUpperCase()}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={handleTranscribe}
                                        disabled={isTranscribing}
                                        className={`
                                            px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all
                                            ${isTranscribing 
                                                ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' 
                                                : 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-900/20'
                                            }
                                        `}
                                    >
                                        {isTranscribing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Cpu className="w-4 h-4" />}
                                        {isTranscribing ? 'Processing...' : 'Start Local Engine'}
                                    </button>
                                </div>
                            </div>
                            
                            {/* Progress Indicator */}
                            {isTranscribing && (
                                <div className={`px-4 py-2 text-xs font-mono border-t flex justify-between items-center ${isDark ? 'bg-zinc-950 border-zinc-800 text-zinc-400' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                                    <span className="flex items-center gap-2">
                                        {progress.status === 'downloading' && <Download className="w-3 h-3 animate-bounce" />}
                                        {progress.status === 'downloading' ? 'Downloading Model (One-time)...' : 'Transcribing Audio...'}
                                    </span>
                                    <span>{progress.percent ? `${progress.percent.toFixed(0)}%` : 'Running...'}</span>
                                </div>
                            )}
                        </div>
                    )}

                    {error && (
                        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-3 text-red-500 animate-fade-in">
                            <AlertTriangle className="w-5 h-5" />
                            <span className="text-sm font-medium">{error}</span>
                        </div>
                    )}
                </div>

                {/* Transcription Output */}
                {transcription && (
                    <div className="animate-slide-up space-y-6">
                        
                        {/* Original Transcript */}
                        <div className={`rounded-xl border overflow-hidden ${isDark ? 'bg-[#0c0c0e] border-zinc-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                            <div className={`px-6 py-4 border-b flex items-center justify-between ${isDark ? 'border-zinc-800 bg-zinc-900/50' : 'border-slate-200 bg-slate-50'}`}>
                                <h3 className={`text-xs font-bold uppercase tracking-widest flex items-center gap-2 ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
                                    <FileText className="w-4 h-4" /> Transcription Result
                                </h3>
                                <div className="flex items-center gap-1">
                                    <div className="w-px h-4 bg-zinc-700/20 mx-1"></div>

                                    <button 
                                        onClick={handleCopy}
                                        className={`p-2 rounded hover:bg-zinc-700/50 transition-colors ${copied ? 'text-green-500' : isDark ? 'text-zinc-400' : 'text-slate-500'}`}
                                        title="Copy Text"
                                    >
                                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                    </button>
                                    
                                    <button 
                                        onClick={handleDeleteTranscription}
                                        className="p-2 rounded hover:bg-red-500/10 text-zinc-500 hover:text-red-500 transition-colors"
                                        title="Clear Transcription"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            <div className={`p-6 max-h-[500px] overflow-y-auto custom-scrollbar ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
                                <div className="markdown-body font-mono text-sm leading-relaxed whitespace-pre-wrap">
                                    <Markdown>{transcription}</Markdown>
                                </div>
                            </div>
                        </div>

                    </div>
                )}
            </div>
        </div>
    </div>
  );
};
