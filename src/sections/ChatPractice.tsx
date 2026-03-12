import { useState, useEffect, useRef, useCallback } from 'react';
import { Icon } from '@iconify/react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { analyzePronunciation } from '../services/pronunciationService';
import type { AnalysisResult } from '../services/pronunciationService';
import { useStore } from '../store/useStore';
import { speakText, stopSpeaking } from '../utils/tts';

export type PracticeMode = 'live-coach';

interface ChatMessage {
    id: string;
    role: 'user' | 'coach';
    text: string;
    analysis?: AnalysisResult;
    timestamp: Date;
}

interface ChatPracticeProps {
    mode: PracticeMode;
    passageText?: string;
}

const ChatPractice = (_props: ChatPracticeProps) => {
    const { addSession, autismMode, accentStyle } = useStore();
    const {
        isRecording,
        transcript,
        interimTranscript,
        audioUrl,
        isSupported,
        error: speechError,
        startRecording,
        stopRecording,
    } = useSpeechRecognition({
        continuous: false,
        interimResults: false,
        lang: 'en-US',
    });

    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: 'welcome',
            role: 'coach',
            text: 'Say a sentence, then press Analyze. I will transcribe it, mark the words you actually spoke, and give pronunciation feedback like a speaking coach.',
            timestamp: new Date(),
        }
    ]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);
    const [retryMsg, setRetryMsg] = useState<string | null>(null);
    const [lastTranscript, setLastTranscript] = useState('');
    const [pendingMessageId, setPendingMessageId] = useState<string | null>(null);
    const recordingStartRef = useRef<number>(0);
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isAnalyzing, interimTranscript]);

    useEffect(() => {
        if (!transcript || isRecording || transcript === lastTranscript) {
            return;
        }

        const userMsgId = crypto.randomUUID();
        setMessages((prev) => [
            ...prev,
            {
                id: userMsgId,
                role: 'user',
                text: transcript.trim(),
                timestamp: new Date(),
            }
        ]);
        setPendingMessageId(userMsgId);
        setLastTranscript(transcript);
        setApiError(null);
        setRetryMsg(null);
    }, [isRecording, lastTranscript, transcript]);

    const handleStart = useCallback(() => {
        stopSpeaking();
        setApiError(null);
        setRetryMsg(null);
        recordingStartRef.current = Date.now();
        startRecording();
    }, [startRecording]);

    const handleAnalyze = useCallback(async () => {
        if (!transcript.trim() || !pendingMessageId || isAnalyzing) {
            return;
        }

        setIsAnalyzing(true);
        setApiError(null);
        setRetryMsg(null);

        try {
            const result = await analyzePronunciation(transcript, transcript, accentStyle, (attempt) => {
                setRetryMsg(`AI coach is retrying... (attempt ${attempt})`);
            });

            setMessages((prev) => prev.map((message) =>
                message.id === pendingMessageId ? { ...message, analysis: result } : message
            ));

            const coachReply = buildCoachReply(result);
            setMessages((prev) => [
                ...prev,
                {
                    id: crypto.randomUUID(),
                    role: 'coach',
                    text: coachReply,
                    analysis: result,
                    timestamp: new Date(),
                }
            ]);

            const durationMs = Date.now() - recordingStartRef.current;
            const durationMin = Math.max(durationMs / 60000, 0.1);
            const spokenWords = transcript.trim().split(/\s+/).filter(Boolean).length;
            const wpm = Math.round(spokenWords / durationMin);

            addSession({
                passageId: 'live-coach',
                expectedText: transcript,
                spokenTranscript: transcript,
                pronunciationScore: result.accuracyScore,
                fluencyScore: result.accuracyScore,
                confidenceScore: Math.min(100, Math.round(result.accuracyScore * 0.7 + 20)),
                wordsPerMinute: wpm,
                pauseCount: 0,
                incorrectWords: result.incorrectWords,
                accentInfluence: result.accentInfluence,
                audioUrl: audioUrl || undefined,
            });

            speakLesson(coachReply, result.speakCorrectWords || result.incorrectWords || [], accentStyle, autismMode);

            setPendingMessageId(null);
            setRetryMsg(null);
        } catch (error: any) {
            setRetryMsg(null);
            setApiError(error.message || 'Analysis failed');
        } finally {
            setIsAnalyzing(false);
        }
    }, [accentStyle, addSession, audioUrl, autismMode, isAnalyzing, pendingMessageId, transcript]);

    const renderHighlightedText = (text: string, analysis: AnalysisResult) => {
        const words = text.trim().split(/\s+/).filter(Boolean);
        const analyzedWords = analysis.wordAnalysis?.length === words.length
            ? analysis.wordAnalysis
            : words.map((word) => ({ word, status: 'correct' as const, score: 0.93 }));

        return analyzedWords.map((item, index) => {
            let className = 'text-emerald-700 bg-emerald-50';

            if (item.status === 'incorrect' || (item.score ?? 1) < 0.65) {
                className = 'text-rose-700 bg-rose-50';
            } else if (item.status === 'unclear' || (item.score ?? 1) < 0.85) {
                className = 'text-amber-700 bg-amber-50';
            } else if (item.status === 'unread') {
                className = 'text-neutral-400 bg-transparent';
            }

            return (
                <span
                    key={`${item.word}-${index}`}
                    className={`${className} mr-1 inline-block rounded-md px-1 py-0.5 font-medium transition-colors duration-300`}
                >
                    {words[index]}
                </span>
            );
        });
    };

    return (
        <div className="flex flex-col h-full min-h-[calc(100vh-220px)]">
            <div className="flex-1 overflow-y-auto px-2 sm:px-4 pb-4 space-y-4 max-h-[calc(100vh-380px)]">
                <AnimatePresence initial={false}>
                    {messages.map((msg) => (
                        <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.25, ease: 'easeOut' }}
                            className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            {msg.role === 'coach' && (
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center mt-1 flex-shrink-0 shadow-sm">
                                    <Icon icon="solar:stars-bold-duotone" width="16" className="text-white" />
                                </div>
                            )}

                            <div className={`max-w-[80%] sm:max-w-[75%] px-4 py-3 ${msg.role === 'user'
                                ? 'bg-indigo-600 text-white rounded-2xl rounded-tr-md'
                                : 'bg-white border border-neutral-200/80 text-neutral-800 rounded-2xl rounded-tl-md shadow-[0_2px_8px_rgba(0,0,0,0.04)]'
                                }`}>
                                {msg.role === 'user' && msg.analysis ? (
                                    <div>
                                        <p className="text-sm sm:text-[15px] font-sans leading-relaxed">
                                            {renderHighlightedText(msg.text, msg.analysis)}
                                        </p>
                                        <div className="mt-2 pt-2 border-t border-indigo-500/30 flex items-center gap-2">
                                            <div className="w-16 h-1.5 bg-indigo-500/30 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full rounded-full transition-all duration-500"
                                                    style={{
                                                        width: `${msg.analysis.accuracyScore}%`,
                                                        backgroundColor: msg.analysis.accuracyScore >= 85 ? '#34d399' : msg.analysis.accuracyScore >= 65 ? '#fbbf24' : '#f87171'
                                                    }}
                                                />
                                            </div>
                                            <span className="text-xs text-indigo-200 font-medium">{msg.analysis.accuracyScore}%</span>
                                        </div>
                                    </div>
                                ) : msg.role === 'coach' ? (
                                    <div>
                                        <div className="text-sm sm:text-[15px] font-sans leading-relaxed whitespace-pre-line">
                                            {msg.text.split('\n').map((line, lineIndex) => (
                                                <span key={lineIndex}>
                                                    {line.split(/(\*[^*]+\*)/g).map((part, partIndex) =>
                                                        part.startsWith('*') && part.endsWith('*')
                                                            ? <strong key={partIndex} className="text-indigo-600 font-semibold">{part.slice(1, -1)}</strong>
                                                            : <span key={partIndex}>{part}</span>
                                                    )}
                                                    {lineIndex < msg.text.split('\n').length - 1 && '\n'}
                                                </span>
                                            ))}
                                        </div>
                                        {msg.analysis?.speakCorrectWords?.length ? (
                                            <div className="mt-3 flex flex-wrap gap-2">
                                                {msg.analysis.speakCorrectWords.map((word) => (
                                                    <button
                                                        key={word}
                                                        onClick={() => speakWordQueue([word], accentStyle, autismMode)}
                                                        className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100 transition-colors"
                                                        title={`Play pronunciation for ${word}`}
                                                    >
                                                        <span>{word}</span>
                                                        <Icon icon="solar:volume-loud-linear" width="14" />
                                                    </button>
                                                ))}
                                            </div>
                                        ) : null}
                                    </div>
                                ) : (
                                    <p className="text-sm sm:text-[15px] font-sans leading-relaxed whitespace-pre-line">{msg.text}</p>
                                )}

                                <span className={`text-[11px] mt-1.5 block ${msg.role === 'user' ? 'text-indigo-200' : 'text-neutral-400'} font-sans`}>
                                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>

                            {msg.role === 'user' && (
                                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center mt-1 flex-shrink-0">
                                    <span className="text-indigo-700 font-bold text-[10px] font-sans uppercase">You</span>
                                </div>
                            )}
                        </motion.div>
                    ))}
                </AnimatePresence>

                {isRecording && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-end gap-3">
                        <div className="max-w-[75%] bg-indigo-500/80 text-white rounded-2xl rounded-tr-md px-4 py-3">
                            <p className="text-sm font-sans leading-relaxed opacity-75 italic">
                                {interimTranscript || 'Listening...'}
                            </p>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center mt-1 flex-shrink-0">
                            <span className="text-indigo-700 font-bold text-[10px] font-sans uppercase">You</span>
                        </div>
                    </motion.div>
                )}

                {isAnalyzing && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3 justify-start">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center mt-1 flex-shrink-0 shadow-sm">
                            <Icon icon="solar:stars-bold-duotone" width="16" className="text-white" />
                        </div>
                        <div className="bg-white border border-neutral-200/80 rounded-2xl rounded-tl-md px-5 py-3.5 shadow-sm">
                            <div className="flex gap-1.5 items-center">
                                <div className="w-2 h-2 bg-indigo-400 rounded-full typing-dot" />
                                <div className="w-2 h-2 bg-indigo-400 rounded-full typing-dot" />
                                <div className="w-2 h-2 bg-indigo-400 rounded-full typing-dot" />
                            </div>
                        </div>
                    </motion.div>
                )}

                <div ref={chatEndRef} />
            </div>

            <div className="border-t border-neutral-200/60 bg-white/60 backdrop-blur-md px-4 py-5 rounded-b-2xl">
                <div className="text-center mb-4 text-sm font-medium font-sans min-h-[20px]">
                    {speechError && <span className="text-rose-500">Microphone access is required for voice practice.</span>}
                    {apiError && <span className="text-rose-500">{apiError}</span>}
                    {retryMsg && <span className="text-amber-600">{retryMsg}</span>}
                    {!speechError && !apiError && !retryMsg && isRecording && (
                        <span className="text-rose-500 animate-pulse">Listening...</span>
                    )}
                    {!speechError && !apiError && !retryMsg && !isRecording && pendingMessageId && !isAnalyzing && (
                        <span className="text-neutral-500">Transcript ready. Press Analyze for pronunciation feedback.</span>
                    )}
                    {!speechError && !apiError && !retryMsg && !isRecording && !pendingMessageId && !isAnalyzing && (
                        <span className="text-neutral-400">Start speaking, stop when finished, then analyze the transcript.</span>
                    )}
                </div>

                <div className="flex justify-center items-center gap-3 flex-wrap">
                    <button
                        onClick={handleStart}
                        disabled={!isSupported || isRecording || isAnalyzing}
                        className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-700 transition-colors"
                    >
                        Start
                    </button>
                    <button
                        onClick={stopRecording}
                        disabled={!isSupported || !isRecording}
                        className="px-4 py-2.5 rounded-xl bg-neutral-100 text-neutral-700 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-200 transition-colors"
                    >
                        Stop
                    </button>
                    <button
                        onClick={handleAnalyze}
                        disabled={!pendingMessageId || isRecording || isAnalyzing}
                        className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-emerald-700 transition-colors"
                    >
                        Analyze
                    </button>
                    <button
                        onClick={stopSpeaking}
                        className="w-10 h-10 flex items-center justify-center rounded-full bg-neutral-100 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-700 transition-colors"
                        title="Stop AI playback"
                    >
                        <Icon icon="solar:stop-circle-linear" width="18" />
                    </button>
                </div>
            </div>
        </div>
    );
};

function buildCoachReply(result: AnalysisResult) {
    if (result.coachMessage?.trim()) {
        return result.coachMessage.trim();
    }

    if (result.accuracyScore === 0) {
        return "I couldn't analyze that properly. Say a full sentence and try again.";
    }

    const focusWords = [...(result.incorrectWords || []), ...(result.unclearWords || [])].slice(0, 3);
    if (focusWords.length === 0) {
        return 'No major pronunciation issue detected in this sentence.';
    }

    return focusWords.map((word) => {
        const phonetic = result.phoneticBreakdown?.[word];
        return [
            `Word needing improvement: ${word}`,
            'Correct pronunciation:',
            phonetic ? `/${phonetic}/` : '/listen and repeat/',
            'Breakdown:',
            phonetic || word,
            'Tip:',
            `Say ${word} slowly and stress the strongest syllable clearly.`,
            `SpeakCorrectWord: ${word}`
        ].join('\n');
    }).join('\n\n');
}

function speakLesson(
    coachReply: string,
    correctedWords: string[],
    accentStyle: 'American' | 'British' | 'Indian',
    autismMode: boolean
) {
    const words = correctedWords.filter(Boolean);
    if (words.length === 0) {
        speakText({ text: coachReply, accentStyle, rate: autismMode ? 0.8 : 1 });
        return;
    }

    speakText({
        text: coachReply,
        accentStyle,
        rate: autismMode ? 0.8 : 1,
        onEnd: () => speakWordQueue(words, accentStyle, autismMode)
    });
}

function speakWordQueue(
    words: string[],
    accentStyle: 'American' | 'British' | 'Indian',
    autismMode: boolean
) {
    const [current, ...rest] = words;
    if (!current) {
        return;
    }

    speakText({
        text: current,
        accentStyle,
        rate: autismMode ? 0.72 : 0.82,
        onEnd: () => {
            if (rest.length > 0) {
                speakWordQueue(rest, accentStyle, autismMode);
            }
        }
    });
}

export default ChatPractice;
