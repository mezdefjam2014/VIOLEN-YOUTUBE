
import { GoogleGenAI } from "@google/genai";
import { GroundingChunk, BotMode, StockVideo } from "../types";

// VIOLEN AI UPLINK
const uplinkKey = process.env.API_KEY;

const internetUplink = new GoogleGenAI({ apiKey: uplinkKey || 'MISSING_KEY' });

const CORE_PROTOCOL = 'gemini-3-flash-preview';
const BACKUP_PROTOCOL = 'gemini-3-pro-preview'; 
const VISION_PROTOCOL = 'gemini-3-flash-preview'; // Switched to main V3 Flash protocol for video

interface WebResponse {
  text: string;
  groundingChunks?: GroundingChunk[];
}

const getProtocolInstruction = (mode: BotMode): string => {
  const currentDate = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return `
    IDENTITY: VIOLEN AI.
    STATUS: ONLINE.
    CURRENT_DATE: ${currentDate}.
    STRICT_MODE: FACT_CHECK_ENABLED.
    
    CORE DIRECTIVE: You are a high-end True Crime and Documentary Script Engine. You function as a "Deep Net" scanner, aggregating data from top-tier journalism, police archives, and community forums.
    
    SEARCH PROTOCOL - "FULL SPECTRUM SCAN":
    1. **TIER 1 NEWS**: Prioritize facts from: New York Times, CNN, Yahoo News, Google News, The Washington Post, USA Today, CNBC, AP News, Reuters.
    2. **COMMUNITY INTEL**: Scan Reddit (r/TrueCrime, r/UnresolvedMysteries, etc.) for theories, timeline clarifications, and local discussions.
    3. **ARCHIVES & RECORDS**: For historical queries (e.g., "Murders in the 1980s"), search digitized newspaper archives, police reports, and court documents.
    
    CRITICAL RULES:
    1. **TEMPORAL ACCURACY**: You know today is ${currentDate}. If the user asks for "new" or "current" cases, double-check the event dates. Do not present old cases as new.
    2. **NO BIAS**: Present the narrative objectively. 
    3. **NO MISINFORMATION**: If sources conflict (e.g., Reddit vs. Police Report), state the conflict clearly.
    4. **VISUAL EVIDENCE**: You MUST search for actual photos of the people, places, or evidence involved. Use markdown: \`![Evidence: Description](URL)\`.
    
    TONE: Gritty, Professional, Investigative, "YouTube Documentary" Style (e.g. JCS Criminal Psychology, Nexpo, Lemmino).
  `;
};

export const queryWebNetwork = async (
  query: string,
  visualData?: string,
  visualMimeType?: string,
  activeNode: BotMode = 'surfer'
): Promise<WebResponse> => {
  
  const executeRequest = async (model: string) => {
    const dataPackets: any[] = [];
    
    if (visualData && visualMimeType) {
      dataPackets.push({
        inlineData: {
          data: visualData,
          mimeType: visualMimeType
        }
      });
    }

    dataPackets.push({ text: query });

    const response = await internetUplink.models.generateContent({
      model: model,
      contents: {
        role: 'user',
        parts: dataPackets
      },
      config: {
        tools: [{ googleSearch: {} }], 
        systemInstruction: getProtocolInstruction(activeNode)
      }
    });

    const outputText = response.text || "NO_DATA_RECEIVED_FROM_VIOLEN";
    const webSources = response.candidates?.[0]?.groundingMetadata?.groundingChunks as GroundingChunk[] | undefined;

    return { text: outputText, groundingChunks: webSources };
  };

  try {
    return await executeRequest(CORE_PROTOCOL);
  } catch (error: any) {
    console.warn(`Primary Uplink (${CORE_PROTOCOL}) Failed:`, error.message);
    const isTrafficError = error.message?.includes('429') || error.status === 429 || error.message?.includes('503');

    if (isTrafficError) {
      try {
        const fallbackResponse = await executeRequest(BACKUP_PROTOCOL);
        fallbackResponse.text += "\n\n_— [Rerouted via Backup Node]_";
        return fallbackResponse;
      } catch (fallbackError: any) {
        return { 
          text: "## SYSTEM OVERLOAD\n\nHigh traffic on all VIOLEN nodes. Please wait 30 seconds.", 
          groundingChunks: [] 
        };
      }
    }
    return { 
        text: "## CONNECTION ERROR\n\nUnable to reach the VIOLEN Gateway.", 
        groundingChunks: [] 
    };
  }
};

export const compileWebReport = async (
  topic: string,
  channelName: string,
  wordCount: number,
  tone: string,
  includeConspiracies: boolean = false
): Promise<WebResponse> => {
  
  const today = new Date().toLocaleDateString();
  let conspiracyInstruction = "";
  if (includeConspiracies) {
      conspiracyInstruction = `
      6. **THEORIES & SPECULATION**: 
         - Create a distinct section at the end titled "## 👁️ ALTERNATIVE THEORIES".
         - Detail popular conspiracy theories or alternative explanations regarding this case from Reddit/Forums.
         - **CRITICAL**: Clearly label these as theories/speculation.
      `;
  }

  return queryWebNetwork(
    `PROTOCOL: SCRIPT_COMPILATION
     TARGET: YouTube True Crime/Documentary Script
     TOPIC: ${topic}
     CHANNEL: ${channelName}
     LENGTH: ${wordCount} words
     TONE: ${tone} (Maintain high accuracy and neutrality)
     CURRENT_DATE: ${today}
     
     INSTRUCTION: 
     1. **DEEP NET RESEARCH**: Search NYT, CNN, AP News, local police reports, and Reddit for comprehensive details.
     2. **VERIFY DATES**: Explicitly state the date of the events in the script to confirm accuracy against today's date (${today}).
     3. Write a compelling, viral-ready script structure (Hook, Intro, Body, Conclusion).
     4. **VISUAL EVIDENCE**: Find and insert at least 3-5 relevant images (real photos of subject/location) using markdown format: \`![Evidence: Description](URL)\`.
     5. Format speaker names clearly as **Narrator:** or **${channelName}:**.
     ${conspiracyInstruction}
     
     7. **NEXT INVESTIGATIONS**: At the very end of your response, strictly output 3 related but distinct stories or cases that the user might want to cover next. Use this exact format:
     > SUGGESTION: [Title of Story]
     > SUGGESTION: [Title of Story]
     > SUGGESTION: [Title of Story]`,
    undefined,
    undefined,
    'creative'
  );
};

export const findStockFootage = async (query: string): Promise<StockVideo[]> => {
  try {
    const response = await internetUplink.models.generateContent({
      model: CORE_PROTOCOL,
      contents: `
        Search for free stock videos related to "${query}".
        Focus on sources like Pexels, Pixabay, Mixkit, and Coverr.
        Return a list of 4 videos found.
        Format the output strictly as a JSON array of objects.
        Each object must have:
        - "title": string (description of video)
        - "url": string (link to the video page)
        - "source": string (e.g. "Pexels")
        
        Do not wrap in markdown code blocks. Just return the raw JSON array.
      `,
      config: {
        tools: [{ googleSearch: {} }],
      }
    });

    const text = response.text || '';
    
    // Attempt to extract JSON if wrapped in markdown or just raw
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
        const json = JSON.parse(jsonMatch[0]);
        if (Array.isArray(json)) {
             return json.map((item: any) => ({
                title: item.title || query,
                url: item.url || '#',
                source: item.source || 'Web'
            }));
        }
    }
    
    return [];
  } catch (error) {
    console.error("Stock footage search failed:", error);
    return [];
  }
};

export const transcribeVideo = async (
    videoBase64: string, 
    mimeType: string
): Promise<string> => {
    try {
        const response = await internetUplink.models.generateContent({
            model: VISION_PROTOCOL,
            contents: {
                role: 'user',
                parts: [
                    {
                        inlineData: {
                            data: videoBase64,
                            mimeType: mimeType
                        }
                    },
                    {
                        text: "Generate a verbatim, highly accurate transcription of the spoken audio in this video. Format the output cleanly with speaker labels if multiple voices are detected (e.g., Speaker 1:, Speaker 2:). If there is no speech, describe the audio environment (e.g., [Silence], [Music playing]). Do not add any introductory or concluding remarks, just the transcription."
                    }
                ]
            }
        });
        
        return response.text || "[No transcription generated]";
    } catch (error: any) {
        console.error("Transcription failed:", error);
        if (error.message?.includes("413")) {
            throw new Error("Video file is too large for client-side processing. Please try a smaller file (under 20MB).");
        }
        if (error.message?.includes("404")) {
             throw new Error("Model " + VISION_PROTOCOL + " not found. Please try again later or check API availability.");
        }
        throw new Error("Failed to transcribe video. " + (error.message || "Unknown error"));
    }
};
