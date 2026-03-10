import dotenv from "dotenv";
dotenv.config();
import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is required but not set.');
}

const ai = new GoogleGenAI({ apiKey });

export interface AnalyzeResult {
    accuracyScore: number;
    incorrectWords: string[];
    phoneticBreakdown: { [word: string]: string };
    tips: string[];
    accentInfluence?: string;
    suggestions?: string[];
}

const analysisCache = new Map<string, AnalyzeResult>();
const CACHE_MAX_SIZE = 1000;

function getCacheKey(text: string, transcript: string, accent?: string) {
    return `${text}|${transcript}|${accent || ''}`;
}

async function callGeminiWithRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
    try {
        return await fn();
    } catch (err: any) {
        // Checking for 429 status or rate limit message
        const isRateLimit = err.status === 429 || err.message?.includes('429') || err.message?.toLowerCase().includes('quota') || err.message?.toLowerCase().includes('rate limit');
        if (isRateLimit && retries > 0) {
            console.log(`Gemini rate limited. Retrying in 2 seconds... (${retries} retries left)`);
            await new Promise(r => setTimeout(r, 2000));
            return callGeminiWithRetry(fn, retries - 1);
        }
        throw err;
    }
}

export const analyzePronunciation = async (text: string, transcript: string, accent?: string): Promise<AnalyzeResult> => {
    const cacheKey = getCacheKey(text, transcript, accent);
    if (analysisCache.has(cacheKey)) {
        console.log(`[Cache Hit] Returning cached analysis for transcript: "${transcript.substring(0, 30)}..."`);
        return analysisCache.get(cacheKey)!;
    }

    let accentPrompt = "";
    if (accent) {
        accentPrompt = `
IMPORTANT: The user has selected the "${accent}" accent for practice.
Provide phonetic breakdowns and guidance specifically matching the ${accent} accent (e.g. British, American, Indian).
Highlight syllable stress by using UPPERCASE letters for the stressed syllable in the phonetic breakdown (e.g., "cu-RI-o-si-ty" or "EN-gine").`;
    }

    const prompt = `
You are an expert pronunciation coach.
Analyze the user's pronunciation given the expected text and what was actually transcribed.
Identify mispronounced words, provide a phonetic breakdown, and give coaching tips.
Also detect any accent patterns or influences based on the differences, if possible.

CRITICAL INSTRUCTION: The user may have only read a portion of the text and stopped early.
DO NOT list words as "incorrect" if the user simply hasn't spoken them yet. 
ONLY evaluate the words the user actually attempted in the transcript.

Target text: "${text}"
User transcript: "${transcript}"
${accentPrompt}

Return the analysis STRICTLY as a JSON object with this shape:
{
  "accuracyScore": number (0-100),
  "incorrectWords": string[],
  "phoneticBreakdown": { "word": "/phonetic/" },
  "tips": string[],
  "accentInfluence": string (optional, e.g. "Indian English"),
  "suggestions": string[] (optional, accent-specific suggestions)
}
No markdown, just the JSON string, and no extra text.
`;
    try {
        const response = await callGeminiWithRetry(() =>
            ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
                config: {
                    responseMimeType: "application/json"
                }
            })
        );

        let text = response.text || "{}";

        if (!text) {
            throw new Error("Empty Gemini response");
        }

        // Strip markdown code blocks if the model ignored responseMimeType
        let jsonStr = text;
        const start = jsonStr.indexOf('{');
        const end = jsonStr.lastIndexOf('}');
        if (start !== -1 && end !== -1 && end >= start) {
            jsonStr = jsonStr.substring(start, end + 1);
        }

        const parsed = JSON.parse(jsonStr) as AnalyzeResult;

        // Save to cache and manage size
        if (analysisCache.size >= CACHE_MAX_SIZE) {
            // Remove the first item (oldest inserted key)
            const firstKey = analysisCache.keys().next().value;
            if (firstKey) analysisCache.delete(firstKey);
        }
        analysisCache.set(cacheKey, parsed);

        return parsed;

    } catch (error: any) {
        console.error("Gemini API error:", error);
        return {
            accuracyScore: 0,
            incorrectWords: [],
            phoneticBreakdown: {},
            tips: [`Error communicating with AI: ${error.message || error}`],
            accentInfluence: "Unknown",
            suggestions: []
        };
    }
};
