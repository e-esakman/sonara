export interface SpeechProcessingResult {
    cleanTranscript: string;
    tokens: string[];
    wordCount: number;
}

export function processSpeech(transcript: string): SpeechProcessingResult {
    // lowercase text and remove punctuation
    const cleanTranscript = transcript.toLowerCase().replace(/[.,!?;:'"]/g, '').trim();

    // split into tokens
    const allTokens = cleanTranscript.split(/\s+/).filter(word => word.length > 0);

    // detect filler words (uh, um, like)
    const fillerWords = new Set(['uh', 'um', 'like', 'ah']);
    const tokens = allTokens.filter(t => !fillerWords.has(t));

    // compute word count
    const wordCount = tokens.length;

    return {
        cleanTranscript,
        tokens,
        wordCount
    };
}
