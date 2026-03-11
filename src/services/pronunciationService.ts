const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

export interface AnalysisResult {
    accuracyScore: number;
    incorrectWords: string[];
    unclearWords?: string[];
    unreadWords?: string[];
    phoneticBreakdown: { [key: string]: string };
    tips: string[];
    accentInfluence?: string;
    suggestions?: string[];
}

// ─── Retry Logic for 503 errors ──────────────────────────────────
const MAX_RETRIES = 2;
const BASE_DELAY_MS = 1000;

async function fetchWithRetry(
    url: string,
    options: RequestInit,
    onRetry?: (attempt: number) => void
): Promise<Response> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
            const response = await fetch(url, options);

            // Retry on 503 Service Unavailable
            if (response.status === 503 && attempt < MAX_RETRIES) {
                onRetry?.(attempt + 1);
                const delay = BASE_DELAY_MS * Math.pow(2, attempt);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }

            if (!response.ok) {
                throw new Error(`Error: ${response.status} ${response.statusText}`);
            }

            return response;
        } catch (error: any) {
            lastError = error;

            // Only retry on network errors or 503, not on other errors
            if (attempt < MAX_RETRIES && (error.message?.includes('503') || error.name === 'TypeError')) {
                onRetry?.(attempt + 1);
                const delay = BASE_DELAY_MS * Math.pow(2, attempt);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }

            throw error;
        }
    }

    throw lastError || new Error('Request failed after retries');
}

// ─── Minimum Word Validation ─────────────────────────────────────
const MIN_WORDS_FOR_ANALYSIS = 4;

export const analyzePronunciation = async (
    expectedText: string,
    transcript: string,
    accent?: string,
    onRetry?: (attempt: number) => void
): Promise<AnalysisResult> => {
    // Validate minimum word count
    const spokenWords = transcript.trim().split(/\s+/).filter(w => w.length > 0);
    if (spokenWords.length < MIN_WORDS_FOR_ANALYSIS) {
        return {
            accuracyScore: 0,
            incorrectWords: [],
            unclearWords: [],
            phoneticBreakdown: {},
            tips: ['Please read a full sentence or phrase for accurate pronunciation analysis.'],
            suggestions: ['Try reading at least 4–5 words so the AI can evaluate your pronunciation properly.'],
        };
    }

    try {
        const response = await fetchWithRetry(
            `${BACKEND_URL}/analyze`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: expectedText, transcript, accent }),
            },
            onRetry
        );

        const data: AnalysisResult = await response.json();

        // Derive unclear words: words not in incorrect list that have low similarity to expected
        if (!data.unclearWords) {
            data.unclearWords = deriveUnclearWords(expectedText, transcript, data.incorrectWords);
        }

        return data;
    } catch (error) {
        console.warn('Backend API unavailable, using mock AI evaluation.');
        // Mock fallback if backend is not running or Gemini API fails
        const words = expectedText.split(/\s+/);
        // Force an incorrect word for demo/mockup purposes
        const mockIncorrect = words.length > 5 ? words[3].replace(/[.,!?;:'"]/g, '') : '';
        const mockUnclear = words.length > 8 ? words[6].replace(/[.,!?;:'"]/g, '') : '';

        return {
            accuracyScore: 82,
            incorrectWords: mockIncorrect ? [mockIncorrect] : [],
            unclearWords: mockUnclear ? [mockUnclear] : [],
            phoneticBreakdown: mockIncorrect ? { [mockIncorrect]: 'kawn·fuh·dns' } : {},
            tips: [
                'You are speaking slightly too fast. Try slowing down for clearer enunciation.',
                'Pay attention to your consonant endings.'
            ],
            suggestions: [
                `Make sure to clearly pronounce "${mockIncorrect}".`,
                'Take a deeper breath before starting long sentences.'
            ],
            accentInfluence: 'Neutral English'
        };
    }
};

// ─── Derive "unclear" words (yellow underline) ───────────────────
function deriveUnclearWords(
    expectedText: string,
    transcript: string,
    incorrectWords: string[]
): string[] {
    const expectedWords = expectedText.toLowerCase().replace(/[.,!?;:'"]/g, '').split(/\s+/);
    const spokenWords = transcript.toLowerCase().replace(/[.,!?;:'"]/g, '').split(/\s+/);
    const incorrectSet = new Set(incorrectWords.map(w => w.toLowerCase()));

    const unclear: string[] = [];

    // Find roughly how far the user read into the expected text
    let lastMatchedIndex = -1;
    for (let i = Math.max(0, spokenWords.length - 10); i < spokenWords.length; i++) {
        const sw = spokenWords[i];
        if (sw.length < 3) continue;
        for (let j = expectedWords.length - 1; j >= 0; j--) {
            if (expectedWords[j] === sw || expectedWords[j].includes(sw) || sw.includes(expectedWords[j])) {
                if (j > lastMatchedIndex) {
                    lastMatchedIndex = j;
                }
                break;
            }
        }
    }

    const maxEvaluationIndex = lastMatchedIndex !== -1 ? lastMatchedIndex + 3 : spokenWords.length + 5;
    const evaluatedExpectedWords = expectedWords.slice(0, maxEvaluationIndex);

    const spokenWordsSet = new Set(spokenWords);

    // Words in the attempted portion that were skipped or slurred
    for (const word of evaluatedExpectedWords) {
        if (word.length < 2) continue;
        if (incorrectSet.has(word)) continue;

        const wasSpoken = spokenWordsSet.has(word);
        
        if (!wasSpoken) {
            const wasFuzzy = spokenWords.some(sw => sw.length >= 2 && (word.includes(sw) || sw.includes(word)));
            if (!wasFuzzy) {
                unclear.push(word);
            }
        }
    }

    return [...new Set(unclear)];
}
