export interface PronunciationAnalysisResult {
    accuracyScore: number;
    incorrectWords: string[];
    unclearWords: string[];
    unreadWords: string[];
}

export function analyzePronunciationLocal(expectedText: string, transcriptTokens: string[]): PronunciationAnalysisResult {
    const expectedWords = expectedText.toLowerCase().replace(/[.,!?;:'"]/g, '').split(/\s+/).filter(w => w.length > 0);
    const spokenWords = transcriptTokens;

    const incorrectWords: string[] = [];
    const unclearWords: string[] = [];
    const unreadWords: string[] = [];

    // Incrementally find how far the user read
    let expectedIndex = 0;

    for (const sw of spokenWords) {
        if (sw.length < 2) continue;
        let found = false;
        // Search ahead up to 10 words
        for (let j = expectedIndex; j < Math.min(expectedIndex + 10, expectedWords.length); j++) {
            if (expectedWords[j] === sw) {
                expectedIndex = j + 1;
                found = true;
                break;
            }
        }
        if (!found) {
            // Fuzzy search ahead up to 15 words
            for (let j = expectedIndex; j < Math.min(expectedIndex + 15, expectedWords.length); j++) {
                if (sw.length >= 3 && (expectedWords[j].includes(sw) || sw.includes(expectedWords[j]))) {
                    expectedIndex = j + 1;
                    break;
                }
            }
        }
    }

    const maxEvaluationIndex = Math.min(expectedIndex + 2, expectedWords.length);
    const evaluatedExpectedWords = expectedWords.slice(0, maxEvaluationIndex);
    const ignoredExpectedWords = expectedWords.slice(maxEvaluationIndex);

    for (const w of ignoredExpectedWords) {
        unreadWords.push(w);
    }

    let mistakes = 0;

    for (const word of evaluatedExpectedWords) {
        if (word.length < 2) continue;

        // Check if word was roughly spoken
        const wasSpoken = spokenWords.some(sw => sw === word);
        const wasFuzzy = spokenWords.some(sw => {
            if (sw.length < 2 || word.length < 2) return false;
            if (word.includes(sw) || sw.includes(word)) return true;
            return false;
        });

        if (!wasSpoken && !wasFuzzy) {
            unclearWords.push(word);
            mistakes += 1;
        } else if (!wasSpoken && wasFuzzy) {
            incorrectWords.push(word);
            mistakes += 0.5;
        }
    }

    const accuracyScore = evaluatedExpectedWords.length > 0
        ? Math.max(0, Math.round(((evaluatedExpectedWords.length - mistakes) / evaluatedExpectedWords.length) * 100))
        : 100;

    return {
        accuracyScore: isNaN(accuracyScore) ? 100 : accuracyScore,
        incorrectWords: [...new Set(incorrectWords)],
        unclearWords: [...new Set(unclearWords)],
        unreadWords: [...new Set(unreadWords)]
    };
}
