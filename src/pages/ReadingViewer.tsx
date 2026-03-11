import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { getPassageById } from '../data/passages';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { analyzePronunciation } from '../services/pronunciationService';
import type { AnalysisResult } from '../services/pronunciationService';
import { useStore } from '../store/useStore';
import { speakText, stopSpeaking } from '../utils/tts';

const ReadingViewer = () => {
    const { id } = useParams<{ id: string }>();
    const passage = getPassageById(id || '');
    const { addSession, autismMode, accentStyle } = useStore();

    const {
        isRecording,
        transcript,
        audioUrl,
        isSupported,
        error: speechError,
        startRecording,
        stopRecording
    } = useSpeechRecognition();

    const [spokenTranscript, setSpokenTranscript] = useState('');
    const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);
    const [pronunciationScore, setPronunciationScore] = useState<number | null>(null);
    const [fluencyScore, setFluencyScore] = useState<number | null>(null);
    const [sessionSaved, setSessionSaved] = useState(false);
    const [showScores, setShowScores] = useState(false);
    const [currentReadingWordIdx, setCurrentReadingWordIdx] = useState<number>(-1);
    const [wordsPerMinute, setWordsPerMinute] = useState<number | null>(null);
    const recordingStartRef = useRef<number>(0);

    // Update spoken transcript in real-time
    useEffect(() => {
        if (transcript) setSpokenTranscript(transcript);
    }, [transcript]);

    // Analyze when recording finishes
    useEffect(() => {
        if (!passage) return;
        const analyze = async () => {
            if (transcript && !isRecording) {
                setIsAnalyzing(true);
                setApiError(null);
                setSessionSaved(false);
                setShowScores(false);
                try {
                    const result = await analyzePronunciation(passage.content, transcript, accentStyle);
                    setAnalysis(result);

                    const pScore = result.accuracyScore;
                    const totalWords = passage.content.split(/\s+/).length;
                    const spokenWords = transcript.split(/\s+/).length;
                    const fScore = Math.min(100, Math.round((spokenWords / totalWords) * 100));

                    const durationMs = Date.now() - recordingStartRef.current;
                    const durationMin = durationMs / 60000;
                    const wpm = Math.round(spokenWords / Math.max(durationMin, 0.1));
                    setWordsPerMinute(wpm);

                    const speechConsistency = Math.max(0, 100 - Math.abs(wpm - 130));
                    const cScore = Math.round(pScore * 0.5 + fScore * 0.3 + speechConsistency * 0.2);

                    setPronunciationScore(pScore);
                    setFluencyScore(fScore);

                    // Animate scores in
                    setTimeout(() => setShowScores(true), 100);

                    addSession({
                        passageId: passage.id,
                        expectedText: passage.content,
                        spokenTranscript: transcript,
                        pronunciationScore: pScore,
                        fluencyScore: fScore,
                        confidenceScore: Math.min(100, cScore),
                        wordsPerMinute: wpm,
                        pauseCount: Math.max(0, Math.round(durationMin * 2)),
                        incorrectWords: result.incorrectWords,
                        accentInfluence: result.accentInfluence,
                        audioUrl: audioUrl || undefined,
                    });
                    setSessionSaved(true);

                } catch (error: any) {
                    console.error('Analysis failed:', error);
                    setApiError(error.message || 'Failed connecting to backend.');
                } finally {
                    setIsAnalyzing(false);
                }
            }
        };
        const timer = setTimeout(analyze, 300);
        return () => clearTimeout(timer);
    }, [transcript, isRecording, passage, addSession, audioUrl]);

    const handleStartRecording = useCallback(() => {
        setCurrentReadingWordIdx(-1);
        stopSpeaking();
        recordingStartRef.current = Date.now();
        startRecording();
    }, [startRecording]);

    const playRecording = useCallback(() => {
        if (audioUrl) {
            const audio = new Audio(audioUrl);
            audio.play().catch(console.error);
        }
    }, [audioUrl]);

    const playCorrect = useCallback(() => {
        if (!passage) return;
        stopSpeaking(); // Stop any previous playback
        setCurrentReadingWordIdx(0);

        const words = passage.content.split(/\s+/);
        let charOffsets = [0];
        for (let i = 0; i < words.length; i++) {
            charOffsets.push(charOffsets[charOffsets.length - 1] + words[i].length + 1);
        }

        speakText({
            text: passage.content,
            accentStyle: accentStyle,
            rate: autismMode ? 0.7 : 0.9,
            onBoundary: (charIndex: number) => {
                const nextIdx = charOffsets.findIndex(off => off > charIndex);
                const wIdx = nextIdx === -1 ? Math.max(0, charOffsets.length - 2) : Math.max(0, nextIdx - 1);
                setCurrentReadingWordIdx(wIdx);
            },
            onEnd: () => setCurrentReadingWordIdx(-1)
        });
    }, [passage, accentStyle, autismMode]);

    const renderPhoneticWithStress = useCallback((phonetic: string) => {
        return phonetic.split(/([A-Z]+)/).map((part, i) =>
            /[A-Z]/.test(part) ? <span key={i} className="font-bold tracking-wider">{part}</span> : <span key={i}>{part}</span>
        );
    }, []);

    // Word-level comparison — inline-block for proper wrapping
    const passageNodes = useMemo(() => {
        if (!passage) return null;
        const words = passage.content.split(/\s+/);

        if (!analysis) {
            return words.map((word, idx) => {
                let className = 'inline text-neutral-700 transition-colors duration-300';
                if (idx === currentReadingWordIdx) {
                    className += ' ring-2 ring-indigo-400 bg-indigo-50 px-1 rounded';
                }
                return (
                    <span key={idx} className={className} style={{ marginRight: '0.3em', whiteSpace: 'nowrap' }}>
                        {word}
                    </span>
                );
            });
        }

        const incorrectSet = new Set(analysis.incorrectWords.map(w => w.toLowerCase()));
        const unclearSet = new Set((analysis.unclearWords || []).map(w => w.toLowerCase()));
        const unreadSet = new Set((analysis.unreadWords || []).map(w => w.toLowerCase()));

        return words.map((word, idx) => {
            const clean = word.toLowerCase().replace(/[.,!?;:'"]/g, '');
            const isIncorrect = incorrectSet.has(clean);
            const isUnclear = unclearSet.has(clean);
            const isUnread = unreadSet.has(clean);

            let className = 'inline transition-colors duration-300 ';
            if (isIncorrect) {
                className += 'text-rose-600 bg-rose-50 px-0.5 rounded border-b-2 border-rose-300 font-medium';
            } else if (isUnclear) {
                className += 'text-amber-600 bg-amber-50 px-0.5 rounded border-b-2 border-amber-300 font-medium';
            } else if (isUnread) {
                className += 'text-neutral-400 opacity-60';
            } else {
                className += 'text-emerald-700';
            }

            if (idx === currentReadingWordIdx) {
                className += ' ring-2 ring-indigo-400 bg-indigo-50 px-1 rounded';
            }

            return (
                <span
                    key={idx}
                    className={className}
                    style={{ marginRight: '0.3em', whiteSpace: 'nowrap' }}
                    title={isIncorrect ? `Mispronounced — try again` : isUnclear ? `Missed or unclear` : 'Correct'}
                >
                    {word}
                </span>
            );
        });
    }, [passage, analysis, currentReadingWordIdx]);

    if (!passage) {
        return (
            <div className="pt-36 min-h-screen bg-neutral-50 flex items-center justify-center">
                <div className="text-center">
                    <Icon icon="solar:book-2-linear" width="48" className="text-neutral-300 mb-4 mx-auto" />
                    <p className="text-neutral-500 font-sans mb-4">Passage not found.</p>
                    <Link to="/library" className="text-indigo-600 font-sans font-medium hover:underline">
                        ← Back to Library
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="pt-36 min-h-screen bg-neutral-50 pb-20 page-enter">
            <div className="max-w-6xl mx-auto px-4 sm:px-6">
                {/* Back link */}
                <Link to="/library" className="inline-flex items-center gap-1 text-neutral-500 font-sans text-sm mb-6 hover:text-[#111] transition-colors">
                    <Icon icon="solar:arrow-left-linear" width="16" />
                    Back to Library
                </Link>

                <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6 lg:gap-8 items-start">
                    {/* Left: Passage Reading Card */}
                    <div className="w-full lg:col-span-7">
                        <div className="bg-white rounded-3xl p-6 sm:p-8 md:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-neutral-100 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl opacity-40 -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                            {/* Header */}
                            <div className="relative z-10 mb-6">
                                <div className="flex items-center gap-3 mb-3 flex-wrap">
                                    <span className={`text-xs font-semibold uppercase tracking-wider text-white px-3 py-1 rounded-full ${passage.difficulty === 'Beginner' ? 'bg-emerald-500' :
                                        passage.difficulty === 'Intermediate' ? 'bg-amber-500' : 'bg-rose-500'
                                        }`}>
                                        {passage.difficulty}
                                    </span>
                                    <span className="text-xs text-neutral-400 font-sans uppercase tracking-wider">{passage.category}</span>
                                </div>
                                <h1 className="text-2xl md:text-3xl font-dm-sans text-[#111] tracking-tight">{passage.title}</h1>
                                <div className="flex items-center gap-4 mt-2 text-xs text-neutral-500 font-sans">
                                    <span className="flex items-center gap-1"><Icon icon="solar:clock-circle-linear" width="14" />{passage.readingTime}</span>
                                    <span className="flex items-center gap-1"><Icon icon="solar:text-linear" width="14" />{passage.wordCount} words</span>
                                </div>
                            </div>

                            {/* Passage Text — Fixed overflow */}
                            <div className="relative z-10 bg-neutral-50 rounded-2xl p-5 sm:p-6 border border-neutral-100 mb-6 min-h-[180px] max-w-full overflow-hidden">
                                    <p
                                        className={`text-base sm:text-lg font-sans max-w-full ${autismMode ? 'leading-loose tracking-wide text-lg' : 'leading-relaxed'}`}
                                        style={{
                                            overflowWrap: 'anywhere',
                                            wordBreak: 'keep-all',
                                            whiteSpace: 'normal',
                                            hyphens: 'none',
                                        }}
                                    >
                                        {passageNodes}
                                    </p>
                            </div>

                            {/* Spoken transcript */}
                            {spokenTranscript && (
                                <div className="relative z-10 mb-6 bg-indigo-50/50 rounded-2xl p-4 sm:p-5 border border-indigo-100 max-w-full overflow-hidden">
                                    <h4 className="text-xs text-indigo-500 uppercase tracking-wider font-semibold mb-2">You said:</h4>
                                    <p className="text-base font-sans text-[#111] italic leading-relaxed" style={{ wordWrap: 'break-word', overflowWrap: 'break-word' }}>
                                        "{spokenTranscript}"
                                    </p>
                                </div>
                            )}

                            {/* Controls */}
                            <div className="relative z-10 flex justify-center items-center gap-4 sm:gap-6">
                                <div className="flex gap-2">
                                    <button
                                        onClick={playCorrect}
                                        className="w-12 h-12 flex items-center justify-center rounded-l-full bg-neutral-100 text-neutral-600 hover:bg-neutral-200 transition-all duration-200 hover:scale-105"
                                        title="Listen to passage"
                                    >
                                        <Icon icon="solar:volume-loud-linear" width="22" />
                                    </button>
                                    <button
                                        onClick={stopSpeaking}
                                        className="w-12 h-12 flex items-center justify-center rounded-r-full bg-neutral-100 text-neutral-500 hover:bg-rose-50 hover:text-rose-600 transition-all hover:scale-105"
                                        title="Stop reading aloud"
                                    >
                                        <Icon icon="solar:stop-circle-linear" width="22" />
                                    </button>
                                </div>

                                <button
                                    onMouseDown={handleStartRecording}
                                    onMouseUp={stopRecording}
                                    onMouseLeave={isRecording ? stopRecording : undefined}
                                    onTouchStart={(e) => { e.preventDefault(); handleStartRecording(); }}
                                    onTouchEnd={(e) => { e.preventDefault(); stopRecording(); }}
                                    className={`w-16 h-16 flex items-center justify-center rounded-full text-white shadow-lg transition-all duration-200 touch-none select-none ${isRecording
                                        ? 'bg-rose-500 mic-recording scale-110'
                                        : 'bg-[#111] hover:scale-105 hover:shadow-xl'
                                        }`}
                                    disabled={isAnalyzing || !isSupported}
                                    aria-label="Hold to speak"
                                >
                                    <Icon icon={isRecording ? "solar:microphone-2-bold" : "solar:microphone-2-linear"} width="28" />
                                </button>

                                {audioUrl && (
                                    <button
                                        onClick={playRecording}
                                        className="w-12 h-12 flex items-center justify-center rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-all duration-200 hover:scale-105"
                                        title="Replay your recording"
                                    >
                                        <Icon icon="solar:play-linear" width="22" />
                                    </button>
                                )}
                            </div>

                            {/* Status */}
                            <div className="text-center mt-4 text-sm font-medium font-sans min-h-[20px]">
                                {!isSupported && <span className="text-rose-500">Browser doesn't support speech recognition.</span>}
                                {speechError && <span className="text-rose-500">{speechError}</span>}
                                {apiError && <span className="text-rose-500">{apiError}</span>}
                                {isRecording && (
                                    <span className="text-rose-500 animate-pulse flex items-center gap-2 justify-center">
                                        <span className="w-2 h-2 bg-rose-500 rounded-full animate-ping" />
                                        Listening... speak now
                                    </span>
                                )}
                                {isAnalyzing && (
                                    <span className="text-indigo-500 animate-pulse flex items-center gap-2 justify-center">
                                        <Icon icon="line-md:loading-loop" /> Analyzing pronunciation...
                                    </span>
                                )}
                                {sessionSaved && (
                                    <span className="text-emerald-500 flex items-center gap-1 justify-center">
                                        <Icon icon="solar:check-circle-linear" width="16" />
                                        {autismMode ? 'Great job! Try again when you are ready.' : 'Session saved! Hold mic to try again.'}
                                    </span>
                                )}
                                {!isRecording && !isAnalyzing && !analysis && !speechError && !apiError && (
                                    <span className="text-neutral-400">{autismMode ? 'Press and hold the microphone button. Read slowly and clearly.' : 'Hold microphone button to read the passage aloud'}</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right: AI Coach Feedback Panel */}
                    <div className="w-full lg:col-span-5">
                        {!analysis && !isAnalyzing ? (
                            <div className="bg-white rounded-3xl p-8 shadow-[0_20px_40px_rgb(0,0,0,0.06)] border border-neutral-100 flex flex-col items-center justify-center min-h-[300px] text-center gap-4">
                                <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center">
                                    <Icon icon="solar:chat-round-dots-linear" width="32" className="text-indigo-400" />
                                </div>
                                <div>
                                    <h3 className="font-dm-sans text-lg text-[#111] mb-1">AI Live Coach</h3>
                                    <p className="text-neutral-500 font-sans text-sm max-w-[250px]">
                                        {autismMode
                                            ? 'Hold the microphone and read when you feel ready. I will listen carefully and give you friendly feedback.'
                                            : 'Hold the microphone to read the passage. Detailed feedback will appear here.'}
                                    </p>
                                </div>
                            </div>
                        ) : isAnalyzing ? (
                            <div className="bg-white rounded-3xl p-8 shadow-[0_20px_40px_rgb(0,0,0,0.06)] border border-neutral-100 flex flex-col items-center justify-center min-h-[300px] text-center gap-4">
                                <Icon icon="line-md:loading-twotone-loop" width="48" className="text-indigo-500" />
                                <h3 className="font-dm-sans text-lg text-[#111]">AI Coach Analyzing</h3>
                                <p className="text-neutral-500 font-sans text-sm max-w-[250px]">Processing your pronunciation...</p>
                            </div>
                        ) : (
                            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-[0_20px_40px_rgb(0,0,0,0.06)] border border-neutral-100 flex flex-col gap-5">
                                {/* AI Coach Header */}
                                <div className="flex items-center gap-2 pb-3 border-b border-neutral-100">
                                    <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center">
                                        <Icon icon="solar:chat-round-dots-bold" width="16" className="text-white" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-semibold text-[#111] font-sans">Nova — your AI pronunciation coach</span>
                                        <span className="text-xs text-neutral-500 font-sans">AI Coach Feedback</span>
                                    </div>
                                </div>

                                {/* Scores — animated */}
                                <div className={`grid grid-cols-3 gap-3 transition-all duration-500 ${showScores ? 'opacity-100' : 'opacity-0 translate-y-2'}`}>
                                    <div className="bg-indigo-50 rounded-2xl p-4 text-center">
                                        <span className={`text-2xl font-dm-sans font-medium text-indigo-600 ${showScores ? 'score-animate' : ''}`}>{pronunciationScore}</span>
                                        <p className="text-xs text-indigo-500 mt-1 font-sans">Accuracy</p>
                                    </div>
                                    <div className="bg-emerald-50 rounded-2xl p-4 text-center">
                                        <span className={`text-2xl font-dm-sans font-medium text-emerald-600 ${showScores ? 'score-animate' : ''}`}>{fluencyScore}</span>
                                        <p className="text-xs text-emerald-500 mt-1 font-sans">Fluency</p>
                                    </div>
                                    <div className="bg-amber-50 rounded-2xl p-4 text-center">
                                        <span className={`text-2xl font-dm-sans font-medium text-amber-600 ${showScores ? 'score-animate' : ''}`}>{wordsPerMinute || 0}</span>
                                        <p className="text-xs text-amber-500 mt-1 font-sans">WPM</p>
                                    </div>
                                </div>

                                {/* Score bar */}
                                <div className="flex justify-between items-center border-b border-neutral-100 pb-4">
                                    <span className="text-sm font-medium text-neutral-400 uppercase tracking-tight font-sans">Overall</span>
                                    <div className="flex items-center gap-2">
                                        <div className="w-28 h-2.5 bg-neutral-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-indigo-500 rounded-full transition-all duration-700 ease-out" style={{ width: `${analysis?.accuracyScore || 0}%` }} />
                                        </div>
                                        <span className="text-sm font-bold text-indigo-600 font-sans">{analysis?.accuracyScore}%</span>
                                    </div>
                                </div>

                                {/* Incorrect words */}
                                {analysis?.incorrectWords && analysis.incorrectWords.length > 0 && (
                                    <div>
                                        <h4 className="text-neutral-500 text-xs uppercase tracking-tight mb-2 font-sans flex items-center gap-1">
                                            <Icon icon="solar:danger-triangle-linear" />
                                            {autismMode ? 'Words to Practice More' : 'Needs Work'}
                                        </h4>
                                        <div className="flex flex-wrap gap-2">
                                            {analysis.incorrectWords.map((word, i) => (
                                                <span key={i} className="text-sm tracking-tight text-rose-500 font-medium font-sans bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-100">
                                                    {word}
                                                    {analysis.phoneticBreakdown?.[word] && (
                                                        <span className="text-xs font-sans text-rose-400 ml-1.5">({renderPhoneticWithStress(analysis.phoneticBreakdown[word])})</span>
                                                    )}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Accent */}
                                {analysis?.accentInfluence && (
                                    <div>
                                        <h4 className="text-neutral-500 text-xs uppercase tracking-tight mb-1 font-sans">Detected Accent</h4>
                                        <p className="text-sm font-medium text-[#111] font-sans p-3 bg-neutral-50 rounded-xl border border-neutral-100">{analysis.accentInfluence}</p>
                                    </div>
                                )}

                                {/* Tips */}
                                {analysis?.tips && analysis.tips.length > 0 && (
                                    <div className="bg-amber-50 rounded-2xl p-4 sm:p-5 border border-amber-100/50 flex flex-col gap-3">
                                        <h4 className="text-amber-700 text-xs font-medium uppercase tracking-tight flex items-center gap-1.5 font-sans">
                                            <Icon icon="solar:lightbulb-linear" width="16" />
                                            {autismMode ? 'Helpful Tips' : 'Coaching Tips'}
                                        </h4>
                                        <ul className="text-sm text-amber-900 leading-relaxed font-sans space-y-2 list-disc pl-4">
                                            {analysis.tips.map((tip, i) => <li key={i}>{tip}</li>)}
                                        </ul>
                                    </div>
                                )}

                                {/* Suggestions */}
                                {analysis?.suggestions && analysis.suggestions.length > 0 && (
                                    <div className="bg-indigo-50 rounded-2xl p-4 sm:p-5 border border-indigo-100/50 flex flex-col gap-3">
                                        <h4 className="text-indigo-700 text-xs font-medium uppercase tracking-tight flex items-center gap-1.5 font-sans">
                                            <Icon icon="solar:magic-stick-3-linear" width="16" /> Suggestions
                                        </h4>
                                        <ul className="text-sm text-indigo-900 leading-relaxed font-sans space-y-2 list-disc pl-4">
                                            {analysis.suggestions.map((sug, i) => <li key={i}>{sug}</li>)}
                                        </ul>
                                    </div>
                                )}

                                {/* Perfect score */}
                                {analysis?.incorrectWords && analysis.incorrectWords.length === 0 && (
                                    <div className="flex flex-col items-center justify-center gap-3 text-center py-4">
                                        <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center">
                                            <Icon icon="solar:check-circle-bold-duotone" width="40" className="text-emerald-500" />
                                        </div>
                                        <h3 className="text-xl font-dm-sans text-[#111]">
                                            {autismMode ? 'Amazing Job! You Did It!' : 'Excellent Pronunciation!'}
                                        </h3>
                                        <p className="text-sm text-neutral-500 font-sans max-w-[250px]">
                                            {autismMode ? 'Your reading was wonderful. Be proud of yourself!' : 'Your reading sounds natural and clear.'}
                                        </p>
                                    </div>
                                )}

                                {/* Replay & Compare */}
                                {analysis && analysis.accuracyScore > 0 && audioUrl && (
                                    <div className="bg-neutral-50 rounded-2xl p-4 sm:p-5 border border-neutral-100/50 mt-2">
                                        <h4 className="text-neutral-700 text-xs font-medium uppercase tracking-tight flex items-center gap-1.5 font-sans mb-3 text-center justify-center">
                                            <Icon icon="solar:headphones-round-sound-linear" width="16" /> Compare Pronunciation
                                        </h4>
                                        <div className="flex justify-center gap-4">
                                            <button
                                                onClick={playRecording}
                                                className="flex-1 flex items-center justify-center gap-2 bg-white border border-neutral-200 py-2.5 rounded-xl text-sm font-sans font-medium hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm"
                                            >
                                                <Icon icon="solar:play-circle-linear" width="18" /> Replay Yours
                                            </button>
                                            <div className="flex-1 flex gap-2">
                                                <button
                                                    onClick={playCorrect}
                                                    className="flex-[3] flex items-center justify-center gap-2 bg-white border border-neutral-200 py-2.5 rounded-xl text-sm font-sans font-medium hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition-all shadow-sm"
                                                >
                                                    <Icon icon="solar:soundwave-circle-linear" width="18" /> Hear AI Coach
                                                </button>
                                                <button
                                                    onClick={stopSpeaking}
                                                    className="flex-1 flex items-center justify-center bg-white border border-neutral-200 py-2.5 rounded-xl text-neutral-500 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-all shadow-sm"
                                                    title="Stop Audio"
                                                >
                                                    <Icon icon="solar:stop-circle-linear" width="18" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReadingViewer;
