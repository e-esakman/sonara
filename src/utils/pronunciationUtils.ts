export const EXPECTED_SENTENCE = "She sells seashells by the seashore.";

export const checkPronunciation = (spoken: string, expected: string) => {
    if (!spoken) return expected.split(' ').map(w => ({ word: w, correct: false }));

    const normalize = (val: string) => val.toLowerCase().replace(/[.,!?]/g, '');
    const spokenWords = normalize(spoken).split(' ');
    const expectedWords = normalize(expected).split(' ');

    return expectedWords.map(word => {
        // simple matching for demo purposes
        return {
            word,
            correct: spokenWords.includes(word)
        };
    });
}
