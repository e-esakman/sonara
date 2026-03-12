import { GoogleGenAI } from '@google/genai';

let _aiGrammarInstance: GoogleGenAI | null = null;

function getAi() {
    const key = process.env.GEMINI_FEEDBACK_KEY || process.env.GEMINI_API_KEY;
    if (key) {
        if (!_aiGrammarInstance) _aiGrammarInstance = new GoogleGenAI({ apiKey: key });
        return _aiGrammarInstance;
    }
    return null;
}

export interface GrammarResult {
    correction: string;
    explanation: string;
    rule: string;
    structureChart: Array<Record<string, string>>;
    exampleSentence: string;
    exampleBreakdown: string[];
    quickTip: string;
    tips: string[];
    suggestions: string[];
    accuracy: string;
    variety: string;
    bandEstimate: string;
}

export async function checkGrammar(text: string): Promise<GrammarResult> {
    const ai = getAi();
    if (!ai) {
        return {
            correction: "Cannot check grammar currently.",
            explanation: "No AI key provided.",
            rule: "Grammar coach is unavailable right now.",
            structureChart: [],
            exampleSentence: text,
            exampleBreakdown: [],
            quickTip: "Try again when the AI connection is available.",
            accuracy: "N/A",
            variety: "N/A",
            bandEstimate: "N/A",
            tips: [],
            suggestions: []
        };
    }

    const systemPrompt = `You are an English grammar tutor for Sonara, an AI speaking coach.
Your job is to explain grammar rules clearly using structured visual charts instead of long paragraphs.
The user has provided a sentence or passage to evaluate.
Ensure your response is strictly formatted as valid JSON with no markdown block wrappers.

Evaluate the text for:
1. Grammar correctness
2. Sentence complexity
3. IELTS grammar band level estimate

Always return a single JSON object with this structure:
{
  "correction": "The corrected sentence. If the sentence is already correct, repeat it or say 'Your sentence is correct.'",
  "explanation": "A short visual-style explanation summary in 1-2 sentences.",
  "rule": "A short and simple grammar rule.",
  "structureChart": [
    { "Subject": "I", "Helping Verb": "am", "Main Verb": "going" },
    { "Subject": "You", "Helping Verb": "are", "Main Verb": "going" }
  ],
  "exampleSentence": "I am going now",
  "exampleBreakdown": [
    "I -> subject",
    "am -> helping verb",
    "going -> action happening now",
    "now -> time indicator"
  ],
  "quickTip": "Present continuous = Subject + am/is/are + verb-ing",
  "accuracy": "Good",
  "variety": "Simple",
  "bandEstimate": "Band 5 - 6",
  "tips": ["One short grammar tip"],
  "suggestions": ["One better example sentence", "Another better example sentence"]
}

Rules:
- Do NOT write long paragraphs.
- Keep the response concise, visual, and easy for language learners.
- Prefer simple labels like Subject, Helping Verb, Main Verb, Time Word, Object, Connector.
- "structureChart" must be a usable table for the frontend.
- "exampleBreakdown" must explain how each word or chunk functions.
- "quickTip" must be one short learning tip.
- If the sentence is incorrect, explain the correct pattern using the corrected sentence.
- If the sentence is already correct, still provide the rule, chart, and breakdown.
`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ role: 'user', parts: [{ text }] }],
            config: {
                systemInstruction: systemPrompt,
                temperature: 0.3,
            }
        });

        const rawText = response.text || "{}";
        const cleanedText = rawText.replace(/```json\n?|\n?```/g, "").trim();
        const jsonResponse = JSON.parse(cleanedText);

        return {
            correction: jsonResponse.correction || text,
            explanation: jsonResponse.explanation || "No explanation provided.",
            rule: jsonResponse.rule || "Review the sentence pattern and keep the structure consistent.",
            structureChart: Array.isArray(jsonResponse.structureChart) ? jsonResponse.structureChart : [],
            exampleSentence: jsonResponse.exampleSentence || jsonResponse.correction || text,
            exampleBreakdown: Array.isArray(jsonResponse.exampleBreakdown) ? jsonResponse.exampleBreakdown : [],
            quickTip: jsonResponse.quickTip || "Use the sentence pattern again with a new example.",
            accuracy: jsonResponse.accuracy || "Moderate",
            variety: jsonResponse.variety || "Simple",
            bandEstimate: jsonResponse.bandEstimate || "Band 5 - 6",
            tips: jsonResponse.tips || [],
            suggestions: jsonResponse.suggestions || []
        };
    } catch (error) {
        console.error("Error in Grammar Agent:", error);
        return {
            correction: "Error occurred while checking grammar.",
            explanation: "The AI agent failed to process the request.",
            rule: "The grammar coach could not build the rule right now.",
            structureChart: [],
            exampleSentence: text,
            exampleBreakdown: [],
            quickTip: "Please try again.",
            accuracy: "N/A",
            variety: "N/A",
            bandEstimate: "N/A",
            tips: [],
            suggestions: []
        };
    }
}
