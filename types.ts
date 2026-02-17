

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  imageUrl?: string;
  timestamp: number;
  sources?: Array<{
    title?: string;
    uri?: string;
  }>;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  timestamp: number;
}

export interface GroundingChunk {
  web?: {
    uri?: string;
    title?: string;
  };
}

export interface ScriptParams {
  topic: string;
  channelName: string;
  wordCount: number;
  tone: string;
}

export interface SavedScript {
  id: string;
  title: string;
  channel: string;
  content: string;
  timestamp: number;
}

export type BotMode = 
  | 'surfer' 
  | 'research' 
  | 'creative' 
  | 'coder' 
  | 'visual'
  | 'guide'       // Quest Helper
  | 'deal_hunter' // Best Price Hunter
  | 'unroller'    // Thread Unroller
  | 'trailer'     // Video Finder
  | 'ideas';      // Video Idea Generator

export interface StockVideo {
  title: string;
  url: string;
  source: string;
  thumbnail?: string;
}
