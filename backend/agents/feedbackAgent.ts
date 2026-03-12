import { GoogleGenAI } from '@google/genai';
import { callGeminiWithRetry } from './geminiRetry.ts';

let _aiFeedbackInstance: GoogleGenAI | null = null;
let _aiPracticeInstance: GoogleGenAI | null = null;

function getAi(isLibraryPractice: boolean) {
    if (isLibraryPractice && process.env.GEMINI_API_KEY) {
        if (!_aiPracticeInstance) _aiPracticeInstance = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        return _aiPracticeInstance;
    } else if (!isLibraryPractice && process.env.GEMINI_FEEDBACK_KEY) {
        if (!_aiFeedbackInstance) _aiFeedbackInstance = new GoogleGenAI({ apiKey: process.env.GEMINI_FEEDBACK_KEY });
        return _aiFeedbackInstance;
    }
    const fallbackKey = process.env.GEMINI_FEEDBACK_KEY || process.env.GEMINI_API_KEY;
    if (fallbackKey) return new GoogleGenAI({ apiKey: fallbackKey });
    return null;
}

export interface FeedbackResult {
    match?: boolean;
    accuracy_score?: number;
    fluency?: number;
    wpm?: number;
    word_analysis?: { word: string; spoken: string; status: string; tip?: string }[];
    problem_words?: { word: string; issue: string; tip: string }[];
    missing_words?: string[];
    extra_words?: string[];
    coaching_tips?: string[];
    coach_message?: string[];
    accent_detection?: string;

    // standard properties
    suggestions: string[];
    tips: string[];
    phoneticBreakdown: { [word: string]: string };
    accentInfluence?: string;
    coachMessage?: string;
    speakCorrectWords?: string[];
}

export async function generateFeedback(
    expectedText: string,
    transcript: string,
    incorrectWords: string[],
    unclearWords: string[],
    accent?: string
): Promise<FeedbackResult> {
    const isLibraryPractice = expectedText.trim().length > 0;
    const ai = getAi(isLibraryPractice);
    if (!ai) {
        console.warn('GEMINI API KEYS not set. Returning mock feedback.');
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
You are Nova, the AI pronunciation coach inside the Sonara speaking practice app.

Your task is to analyze a user's spoken sentence and give detailed pronunciation feedback.

User spoken transcript: "${transcript}"
Expected phrase (if applicable): "${expectedText || ''}"

${accentPrompt}

Instructions:
1. Focus on pronunciation clarity, vowel sounds, consonants, and syllable stress.
2. Identify the most important mispronounced words.
3. Highlight those words and explain the issue clearly.
4. Provide short coaching suggestions for improvement.
5. Keep the tone encouraging and supportive.

Return actionable learning advice strictly as a JSON object with this ALWAYS structure:
{
${isLibraryPractice ? `
  "match": true,
  "accuracy_score": 95,
  "fluency": 90,
  "wpm": 120,
  "word_analysis": [ { "word": "expected", "spoken": "spoken", "status": "incorrect", "tip": "Focus on..." } ],
  "missing_words": [],
  "extra_words": [],
  "coaching_tips": ["Focus on distinguishing..."],
  "coach_message": "...",
` : `
  "accuracy_score": 95,
  "fluency": 90,
  "wpm": 120,
  "problem_words": [ { "word": "spoken", "issue": "...", "tip": "..." } ],
  "coaching_tips": [ "..." ],
  "coach_message": "...",
`}
  "accent_detection": "...",
  "phoneticBreakdown": { "WordToImprove": "Word-To-Im-PROVE" },
  "tips": [
    "**Analyzing Speech Clarity**\\n\\nYour phrase was understandable, but a few sounds could be clearer.\\n\\n**Refining Pronunciation**\\n\\n• \\"books\\" sounded like \\"box\\". Try rounding your lips slightly.\\n• In \\"celebrations\\", the syllable stress should fall on **\\"bra\\"**.\\n\\nCoaching tip: Slow down slightly and emphasize vowel clarity."
  ],
  "suggestions": []
}

Rules:
- Give a Phonetic Breakdown for any mispronounced or unclear word.
- The upstream System has identified potential mispronounced words: ${incorrectWords.join(', ') || 'None'}
- The upstream System has identified skipped/unclear words: ${unclearWords.join(', ') || 'None'}
- CRITICAL INSTRUCTION: The user may have only read a portion of the text and stopped early. DO NOT list words as "skipped/missing" if the user simply hasn't spoken them yet. ONLY evaluate the portion of the text the user actually attempted.
- Do NOT use markdown code blocks, return ONLY valid JSON.
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
        let jsonStr = text;
        const start = jsonStr.indexOf('{');
        const end = jsonStr.lastIndexOf('}');
        if (start !== -1 && end !== -1 && end >= start) {
            jsonStr = jsonStr.substring(start, end + 1);
        }

        const parsed = JSON.parse(jsonStr);
        const normalizedCoach = buildCoachMessage(parsed);
        const speakCorrectWords = extractSpeakCorrectWords(parsed);

        return {
            ...parsed,
            accentInfluence: parsed.accent_detection || 'Unknown',
            suggestions: parsed.coaching_tips || parsed.suggestions || [],
            tips: parsed.tips || [],
            phoneticBreakdown: parsed.phoneticBreakdown || {},
            coachMessage: normalizedCoach,
            speakCorrectWords
        } as FeedbackResult;
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("Gemini API error in Feedback Agent:", error);
        return {
            phoneticBreakdown: {},
            tips: [`Error communicating with AI: ${message}`],
            suggestions: [],
            accentInfluence: "Unknown",
            coachMessage: 'I could not prepare pronunciation coaching right now.'
        };
    }
}

function extractSpeakCorrectWords(parsed: any): string[] {
    const explicit = Array.isArray(parsed?.speakCorrectWords) ? parsed.speakCorrectWords : [];
    const explicitStrings = explicit.filter((value: unknown): value is string => typeof value === 'string' && value.trim().length > 0);

    if (explicitStrings.length > 0) {
        return explicitStrings;
    }

    const wordsFromProblems = Array.isArray(parsed?.problem_words)
        ? parsed.problem_words.map((item: any) => item?.word).filter((value: unknown): value is string => typeof value === 'string' && value.trim().length > 0)
        : [];

    const wordsFromAnalysis = Array.isArray(parsed?.word_analysis)
        ? parsed.word_analysis
            .filter((item: any) => typeof item?.status === 'string' && item.status.toLowerCase() === 'incorrect')
            .map((item: any) => item?.word)
            .filter((value: unknown): value is string => typeof value === 'string' && value.trim().length > 0)
        : [];

    return [...new Set([...wordsFromProblems, ...wordsFromAnalysis])];
}

function buildCoachMessage(parsed: any): string {
    const problemWords = Array.isArray(parsed?.problem_words) ? parsed.problem_words : [];
    const phoneticBreakdown = parsed?.phoneticBreakdown || {};

    const blocks = problemWords.slice(0, 3).map((item: any) => {
        const word = typeof item?.word === 'string' ? item.word : '';
        if (!word) {
            return '';
        }

        const phonetic = typeof phoneticBreakdown[word] === 'string' && phoneticBreakdown[word].trim()
            ? phoneticBreakdown[word].trim()
            : 'Listen and repeat';
        const tip = typeof item?.tip === 'string' && item.tip.trim()
            ? item.tip.trim()
            : 'Listen and repeat this word slowly.';

        return [
            `Word needing improvement: *${word}*`,
            'Correct pronunciation:',
            phonetic.startsWith('/') ? phonetic : `/${phonetic}/`,
            'Breakdown:',
            phonetic,
            'Tip:',
            tip,
            `SpeakCorrectWord: ${word}`
        ].join('\n');
    }).filter(Boolean);

    if (blocks.length > 0) {
        return blocks.join('\n\n');
    }

    const rawCoachMessage = Array.isArray(parsed?.coach_message)
        ? parsed.coach_message.filter((item: unknown): item is string => typeof item === 'string').join(' ')
        : typeof parsed?.coach_message === 'string'
            ? parsed.coach_message
            : '';

    const cleaned = rawCoachMessage
        .replace(/\*\*[^*]+\*\*/g, '')
        .replace(/Analyzing[^.!\n]*[.!\n]?/gi, '')
        .replace(/Focusing on[^.!\n]*[.!\n]?/gi, '')
        .trim();

    return cleaned || 'Your pronunciation was mostly clear. Repeat the sentence once more.';
}
