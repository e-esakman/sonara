import { GoogleGenAI } from '@google/genai';
import { callGeminiWithRetry } from './geminiRetry.ts';

const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export interface FeedbackResult {
    suggestions: string[];
    tips: string[];
    phoneticBreakdown: { [word: string]: string };
    accentInfluence?: string;
}

export async function generateFeedback(
    expectedText: string,
    transcript: string,
    incorrectWords: string[],
    unclearWords: string[],
    accent?: string
): Promise<FeedbackResult> {
    if (!ai) {
        console.warn('GEMINI_API_KEY not set. Returning mock feedback.');
        return {
            suggestions: [],
            tips: ['Error: Gemini API not configured.'],
            phoneticBreakdown: {}
        };
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
The upstream Pronunciation Agent has identified the following potential mispronounced words: ${incorrectWords.join(', ') || 'None'}
The upstream Pronunciation Agent has identified the following skipped/unclear words: ${unclearWords.join(', ') || 'None'}

Target text: "${expectedText}"
User transcript: "${transcript}"
${accentPrompt}

CRITICAL INSTRUCTION: The user may have only read a portion of the text and stopped early.
DO NOT list words as "incorrect" if the user simply hasn't spoken them yet. 
ONLY evaluate the words the user actually attempted in the transcript.

Return actionable learning advice strictly as a JSON object with this shape:
{
  "phoneticBreakdown": { "word": "/phonetic/" },
  "tips": string[],
  "suggestions": string[] (optional, accent-specific suggestions),
  "accentInfluence": string (optional, e.g. "Indian English")
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

        const text = response.text || "{}";

        // Strip markdown code blocks if the model ignored responseMimeType
        let jsonStr = text;
        const start = jsonStr.indexOf('{');
        const end = jsonStr.lastIndexOf('}');
        if (start !== -1 && end !== -1 && end >= start) {
            jsonStr = jsonStr.substring(start, end + 1);
        }

        return JSON.parse(jsonStr) as FeedbackResult;
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("Gemini API error in Feedback Agent:", error);
        return {
            phoneticBreakdown: {},
            tips: [`Error communicating with AI: ${message}`],
            suggestions: [],
            accentInfluence: "Unknown"
        };
    }
}
