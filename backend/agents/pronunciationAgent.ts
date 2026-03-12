export interface PronunciationAnalysisResult {
    accuracyScore: number;
    incorrectWords: string[];
    unclearWords: string[];
    unreadWords: string[];
    wordAnalysis: { word: string; status: 'correct' | 'incorrect' | 'unclear' | 'unread'; score: number }[];
}

export function analyzePronunciationLocal(expectedText: string, transcriptTokens: string[]): PronunciationAnalysisResult {
    const expectedWords = expectedText.toLowerCase().replace(/[.,!?;:'"]/g, '').split(/\s+/).filter(w => w.length > 0);
    const spokenWords = transcriptTokens;

    const incorrectWords: string[] = [];
    const unclearWords: string[] = [];
    const unreadWords: string[] = [];
    const wordAnalysis: { word: string; status: 'correct' | 'incorrect' | 'unclear' | 'unread'; score: number }[] = [];

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

    let mistakes = 0;
    const spokenWordsSet = new Set(spokenWords);

    for (const word of evaluatedExpectedWords) {
        if (word.length < 2) continue;

        const wasSpoken = spokenWordsSet.has(word);
        let status: 'correct' | 'incorrect' | 'unclear' = 'correct';
        let score = 0.92;
        
        if (!wasSpoken) {
            const wasFuzzy = spokenWords.some(sw => sw.length >= 2 && (word.includes(sw) || sw.includes(word)));
            if (!wasFuzzy) {
                unclearWords.push(word);
                mistakes += 1;
                status = 'unclear';
                score = 0.72;
            } else {
                incorrectWords.push(word);
                mistakes += 0.5;
                status = 'incorrect';
                score = 0.48;
            }
        }

        wordAnalysis.push({ word, status, score });
    }

    for (const w of ignoredExpectedWords) {
        unreadWords.push(w);
        wordAnalysis.push({ word: w, status: 'unread', score: 0 });
    }

    const accuracyScore = evaluatedExpectedWords.length > 0
        ? Math.max(0, Math.round(((evaluatedExpectedWords.length - mistakes) / evaluatedExpectedWords.length) * 100))
        : 100;

    return {
        accuracyScore: isNaN(accuracyScore) ? 100 : accuracyScore,
        incorrectWords: [...new Set(incorrectWords)],
        unclearWords: [...new Set(unclearWords)],
        unreadWords: [...new Set(unreadWords)],
        wordAnalysis
    };
}
