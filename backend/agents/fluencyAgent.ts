export interface FluencyResult {
    wpm: number;
    fluencyScore: number;
    paceCategory: 'slow' | 'optimal' | 'fast';
}

export function analyzeFluency(wordCount: number, durationSeconds: number = 60, tokens: string[]): FluencyResult {
    // Detect pauses or duplicated/repeated words
    let repeatedWords = 0;
    for (let i = 1; i < tokens.length; i++) {
        if (tokens[i] === tokens[i - 1]) {
            repeatedWords++;
        }
    }

    // Default wpm estimation based on standard speech pattern if duration is arbitrary
    // The previous frontend generated wpm based on timestamp, but our backend doesn't receive that via POST /analyze. 
    // We compute a synthetic WPM for the sake of the orchestrator architecture or rely on wordCount.
    let wpm = 130;

    // In a real production environment, you'd pass recording ms instead of arbitrary 60s
    if (durationSeconds) {
        wpm = Math.max(0, Math.round((wordCount / durationSeconds) * 60));
        // Clamp to logical bounds if length was too short
        if (wpm < 30 || wpm > 300) {
            wpm = 130;
        }
    }

    let paceCategory: 'slow' | 'optimal' | 'fast' = 'optimal';
    if (wpm < 100) paceCategory = 'slow';
    else if (wpm > 160) paceCategory = 'fast';

    // compute fluency tracking repeats
    const baseScore = 95;
    const fluencyScore = Math.max(0, Math.min(100, baseScore - repeatedWords * 10));

    return {
        wpm,
        fluencyScore,
        paceCategory
    };
}
