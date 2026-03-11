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
            accuracy: "N/A",
            variety: "N/A",
            bandEstimate: "N/A",
            tips: [],
            suggestions: []
        };
    }

    const systemPrompt = `You are a supportive, clear, and instructional IELTS Grammar Coach.
The user has provided a sentence or passage to evaluate. This might be a response to a specific rule or an IELTS exercise.
Ensure your response is strictly formatted as valid JSON with no markdown block wrappers (do not wrap in \`\`\`json).

Evaluate the text for:
1. Grammar correctness
2. Sentence complexity
3. IELTS grammar band level estimate

Return a single JSON object with the following structure:
{
    "correction": "The corrected sentence (if it was perfect, just repeat it or say 'Your sentence is perfect!').",
    "explanation": "A clear explanation of the grammatical rules applied and why the original was wrong (keep it concise).",
    "accuracy": "Good", // Or "Needs improvement"
    "variety": "Simple", // Or "Moderate" or "Advanced"
    "bandEstimate": "Band 5 - 6", // E.g., Band 5 - 6, Band 6 - 7, Band 7 - 8
    "tips": ["Try using more complex sentence structures", "A tip connecting to the rule used"],
    "suggestions": ["Alternative way using a complex clause 1", "Alternative way 2"]
}

Rules:
- Keep the explanation concise but educational.
- Tone should be supportive and instructional, avoiding overly long explanations.
- Focus on helping the user improve grammatical accuracy and range.
- Provide "suggestions" that elevate the sentence to a higher band score (e.g., adding relative clauses, passive voice, or conditionals).
- If the original is completely correct, provide a positive explanation and offer stylistic suggestions.
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
            accuracy: "N/A",
            variety: "N/A",
            bandEstimate: "N/A",
            tips: [],
            suggestions: []
        };
    }
}
