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
    const { accuracyScore, incorrectWords, unclearWords, unreadWords } = analyzePronunciationLocal(expectedText, tokens);

    // 3. Fluency & Pace Agent
    const { wpm, fluencyScore, paceCategory } = analyzeFluency(wordCount, 60, tokens);

    // 4. Feedback Generation Agent
    const feedback = await generateFeedback(expectedText, cleanTranscript, incorrectWords, unclearWords, accent);

    const result: FinalAnalysisResult = {
        accuracyScore,
        fluencyScore,
        pace: paceCategory,
        wpm,
        incorrectWords,
        unclearWords,
        unreadWords,
        suggestions: feedback.suggestions || [],
        tips: feedback.tips || [],
        phoneticBreakdown: feedback.phoneticBreakdown || {},
        accentInfluence: feedback.accentInfluence || 'Unknown'
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
