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

export const analyzePronunciation = async (text: string, transcript: string): Promise<AnalyzeResult> => {
    const prompt = `
You are an expert pronunciation coach.
Analyze the user's pronunciation given the expected text and what was actually transcribed.
Identify mispronounced words, provide a phonetic breakdown, and give coaching tips.
Also detect any accent patterns or influences based on the differences, if possible.

Target text: "${text}"
User transcript: "${transcript}"

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
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json"
            }
        });

        const text = response.text || "{}";

        if (!text) {
            throw new Error("Empty Gemini response");
        }

        return JSON.parse(text);

    } catch (error: any) {
        console.error("Gemini API error:", error);
        return {
            accuracyScore: 0,
            incorrectWords: [],
            phoneticBreakdown: {},
            tips: ["Error communicating with AI."],
            accentInfluence: "Unknown",
            suggestions: []
        };
    }
};
