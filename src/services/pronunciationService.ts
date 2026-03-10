const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

export interface AnalysisResult {
    accuracyScore: number;
    incorrectWords: string[];
    unclearWords?: string[];
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
    text: string,
    transcript: string,
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
                body: JSON.stringify({ text, transcript }),
            },
            onRetry
        );

        const data: AnalysisResult = await response.json();

        // Derive unclear words: words not in incorrect list that have low similarity to expected
        if (!data.unclearWords) {
            data.unclearWords = deriveUnclearWords(text, transcript, data.incorrectWords);
        }

        return data;
    } catch (error) {
        console.error('Failed to analyze pronunciation:', error);
        throw error;
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

    // Words in expected that were not spoken at all (skipped) — mark as unclear
    for (const word of expectedWords) {
        if (word.length < 2) continue;
        if (incorrectSet.has(word)) continue;

        // Check if word was roughly spoken (fuzzy match)
        const wasSpoken = spokenWords.some(sw => sw === word);
        const wasFuzzy = spokenWords.some(sw => {
            if (sw.length < 2 || word.length < 2) return false;
            const maxLen = Math.max(sw.length, word.length);
            let matches = 0;
            for (let i = 0; i < Math.min(sw.length, word.length); i++) {
                if (sw[i] === word[i]) matches++;
            }
            const similarity = matches / maxLen;
            return similarity >= 0.5 && similarity < 0.85;
        });

        if (!wasSpoken && wasFuzzy) {
            unclear.push(word);
        }
    }

    return [...new Set(unclear)];
}
