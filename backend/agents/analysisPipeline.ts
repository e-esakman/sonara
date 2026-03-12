import { processSpeech } from './speechProcessor.ts';
import { analyzePronunciationLocal } from './pronunciationAgent.ts';
import { analyzeFluency } from './fluencyAgent.ts';
import { generateFeedback } from './feedbackAgent.ts';

export interface FinalAnalysisResult {
    accuracyScore: number;
    fluencyScore: number;
    pace: string;
    wpm: number;
    incorrectWords: string[];
    unclearWords: string[];
    unreadWords: string[];
    suggestions: string[];
    tips: string[];
    phoneticBreakdown: { [word: string]: string };
    accentInfluence?: string;
    coachMessage?: string;
    speakCorrectWords?: string[];
    wordAnalysis?: { word: string; status: 'correct' | 'incorrect' | 'unclear' | 'unread'; score: number }[];
    wordScores?: { word: string; score: number }[];
    analysis?: {
        mispronounced_words: string[];
        phonetic: { [word: string]: string };
        unclear_words: string[];
        unread_words: string[];
    };
}

const analysisCache = new Map<string, FinalAnalysisResult>();
const CACHE_MAX_SIZE = 1000;

function getCacheKey(text: string, transcript: string, accent?: string) {
    return `${text}|${transcript}|${accent || ''}`;
}

export async function runAnalysisPipeline(expectedText: string, transcript: string, accent?: string): Promise<FinalAnalysisResult> {
    // Cache Integration
    const cacheKey = getCacheKey(expectedText, transcript, accent);
    if (analysisCache.has(cacheKey)) {
        console.log(`[Cache Hit] Returning cached analysis for transcript: "${transcript.substring(0, 30)}..."`);
        return analysisCache.get(cacheKey)!;
    }

    console.log(`[Analysis Pipeline] Starting analysis for transcript...`);

    // 1. Speech Processing Agent
    const { cleanTranscript, tokens, wordCount } = processSpeech(transcript);

    // 2. Pronunciation Agent
    const localPronunciation = analyzePronunciationLocal(expectedText, tokens);

    // 3. Fluency & Pace Agent
    const { wpm, fluencyScore, paceCategory } = analyzeFluency(wordCount, 60, tokens);

    // 4. Feedback Generation Agent
    const feedback = await generateFeedback(
        expectedText,
        cleanTranscript,
        localPronunciation.incorrectWords,
        localPronunciation.unclearWords,
        accent
    );

    const pronunciation = normalizeForComparison(expectedText) === normalizeForComparison(cleanTranscript)
        ? buildFreeSpeechPronunciation(transcript, feedback, localPronunciation)
        : localPronunciation;

    const result: FinalAnalysisResult = {
        accuracyScore: pronunciation.accuracyScore,
        fluencyScore,
        pace: paceCategory,
        wpm,
        incorrectWords: pronunciation.incorrectWords,
        unclearWords: pronunciation.unclearWords,
        unreadWords: pronunciation.unreadWords,
        suggestions: feedback.suggestions || [],
        tips: feedback.tips || [],
        phoneticBreakdown: feedback.phoneticBreakdown || {},
        accentInfluence: feedback.accentInfluence || 'Unknown',
        coachMessage: feedback.coachMessage,
        speakCorrectWords: feedback.speakCorrectWords || pronunciation.incorrectWords,
        wordAnalysis: pronunciation.wordAnalysis,
        wordScores: pronunciation.wordAnalysis?.map((item) => ({ word: item.word, score: item.score })) || [],
        analysis: {
            mispronounced_words: pronunciation.incorrectWords,
            phonetic: feedback.phoneticBreakdown || {},
            unclear_words: pronunciation.unclearWords,
            unread_words: pronunciation.unreadWords
        }
    };

    // Store in cache
    if (analysisCache.size >= CACHE_MAX_SIZE) {
        const firstKey = analysisCache.keys().next().value;
        if (firstKey) analysisCache.delete(firstKey);
    }
    analysisCache.set(cacheKey, result);

    console.log(`[Analysis Pipeline] Analysis complete.`);

    return result;
}

function normalizeForComparison(value: string) {
    return value.toLowerCase().replace(/[.,!?;:'"]/g, '').replace(/\s+/g, ' ').trim();
}

function buildFreeSpeechPronunciation(
    transcript: string,
    feedback: Awaited<ReturnType<typeof generateFeedback>>,
    fallback: ReturnType<typeof analyzePronunciationLocal>
) {
    const words = transcript.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) {
        return fallback;
    }

    const flagged = new Set((feedback.speakCorrectWords || []).map((word) => normalizeForComparison(word)));
    const wordAnalysis = words.map((word) => {
        const clean = normalizeForComparison(word);
        if (flagged.has(clean)) {
            return { word, status: 'incorrect' as const, score: 0.48 };
        }
        return { word, status: 'correct' as const, score: 0.92 };
    });

    const incorrectWords = wordAnalysis.filter((item) => item.status === 'incorrect').map((item) => item.word);
    const accuracyScore = Math.round((wordAnalysis.reduce((sum, item) => sum + item.score, 0) / wordAnalysis.length) * 100);

    return {
        accuracyScore,
        incorrectWords,
        unclearWords: [],
        unreadWords: [],
        wordAnalysis
    };
}
