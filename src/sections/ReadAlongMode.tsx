import { useState, useEffect, useRef } from 'react';
import { Icon } from '@iconify/react';
import type { Passage } from '../data/passages';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { analyzePronunciation } from '../services/pronunciationService';
import type { AnalysisResult } from '../services/pronunciationService';
import { useStore } from '../store/useStore';
import { speakText, stopSpeaking } from '../utils/tts';

interface Props {
    passage: Passage;
}

const ReadAlongMode = ({ passage }: Props) => {
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
    } = useSpeechRecognition();

    const [customText, setCustomText] = useState('');
    const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);
    const [retryMsg, setRetryMsg] = useState<string | null>(null);
    const [spokenTranscript, setSpokenTranscript] = useState('');
    const [showScores, setShowScores] = useState(false);
    const [sessionSaved, setSessionSaved] = useState(false);
    const [wordsPerMinute, setWordsPerMinute] = useState<number | null>(null);
    const [currentReadingWordIdx, setCurrentReadingWordIdx] = useState<number>(-1);
    const recordingStartRef = useRef<number>(0);

    const actualText = passage.id === 'custom' ? customText : passage.content;

    // Reset state when passage changes
    useEffect(() => {
        setAnalysis(null);
        setSpokenTranscript('');
        setApiError(null);
        setRetryMsg(null);
        setShowScores(false);
        setSessionSaved(false);
        setCustomText('');
        setWordsPerMinute(null);
    }, [passage.id]);

    useEffect(() => {
        if (transcript || interimTranscript) {
            setSpokenTranscript((transcript + ' ' + (interimTranscript || '')).trim());
        }
    }, [transcript, interimTranscript]);

    // Analyze on stop
    useEffect(() => {
        if (!actualText || !transcript || isRecording) return;

        const analyze = async () => {
            setIsAnalyzing(true);
            setApiError(null);
            setRetryMsg(null);
            setSessionSaved(false);
            setShowScores(false);

            try {
                const result = await analyzePronunciation(actualText, transcript, (attempt) => {
                    setRetryMsg(`AI coach is busy, retrying... (attempt ${attempt})`);
                });
                setRetryMsg(null);
                setAnalysis(result);

                // Only save real sessions (not the "too few words" result)
                if (result.accuracyScore > 0) {
                    const durationMs = Date.now() - recordingStartRef.current;
                    const durationMin = Math.max(durationMs / 60000, 0.1);
                    const spokenWords = transcript.split(/\s+/).length;
                    const wpm = Math.round(spokenWords / durationMin);
                    setWordsPerMinute(wpm);

                    const fScore = Math.min(100, Math.round((spokenWords / actualText.split(/\s+/).length) * 100));
                    const speechConsistency = Math.max(0, 100 - Math.abs(wpm - 130));
                    const cScore = Math.min(100, Math.round(result.accuracyScore * 0.5 + fScore * 0.3 + speechConsistency * 0.2));

                    addSession({
                        passageId: passage.id,
                        expectedText: actualText,
                        spokenTranscript: transcript,
                        pronunciationScore: result.accuracyScore,
                        fluencyScore: fScore,
                        confidenceScore: cScore,
                        wordsPerMinute: wpm,
                        pauseCount: Math.max(0, Math.round(durationMin * 2)),
                        incorrectWords: result.incorrectWords,
                        accentInfluence: result.accentInfluence,
                        audioUrl: audioUrl || undefined,
                    });
                    setSessionSaved(true);
                }

                setTimeout(() => setShowScores(true), 100);

                // Speak feedback using TTS
                let feedbackText = '';
                if (result.accuracyScore >= 95) {
                    feedbackText = "Excellent pronunciation! You sounded very natural.";
                } else if (result.incorrectWords.length > 0) {
                    feedbackText = `Good effort! Let's practice the word ${result.incorrectWords[0]}.`;
                } else if (result.accuracyScore >= 80) {
                    feedbackText = "Great job! Your fluency is improving.";
                } else {
                    feedbackText = "Keep practicing, you're getting there.";
                }

                speakText({
                    text: feedbackText,
                    accentStyle,
                    rate: autismMode ? 0.8 : 1.0
                });

            } catch (error: any) {
                setRetryMsg(null);
                setApiError(error.message || 'Failed connecting to backend.');
            } finally {
                setIsAnalyzing(false);
            }
        };

        const timer = setTimeout(analyze, 300);
        return () => clearTimeout(timer);
    }, [transcript, isRecording]);

    const handleStart = () => {
        stopSpeaking();
        setCurrentReadingWordIdx(-1);
        setSpokenTranscript('');
        recordingStartRef.current = Date.now();
        startRecording();
    };

    const playCorrect = () => {
        setCurrentReadingWordIdx(0);

        // Count words to map charIndex to wordIndex roughly
        const words = actualText.split(/\s+/);
        let charOffsets = [0];
        for (let i = 0; i < words.length; i++) {
            charOffsets.push(charOffsets[charOffsets.length - 1] + words[i].length + 1);
        }

        speakText({
            text: actualText.slice(0, 300),
            accentStyle,
            rate: autismMode ? 0.7 : 0.9,
            onBoundary: (charIndex: number) => {
                const wIdx = charOffsets.findIndex(off => off > charIndex) - 1;
                if (wIdx >= 0) setCurrentReadingWordIdx(wIdx);
            },
            onEnd: () => setCurrentReadingWordIdx(-1)
        });
    };

    // ─── Word-level highlights: green/red/yellow ─────────────────
    const renderHighlightedText = () => {
        const words = actualText.split(/\s+/);

        return words.map((word, idx) => {
            if (!analysis || analysis.accuracyScore === 0) {
                return (
                    <span key={idx} className="inline text-neutral-700" style={{ marginRight: '0.3em', whiteSpace: 'nowrap' }}>
                        {word}
                    </span>
                );
            }

            const clean = word.toLowerCase().replace(/[.,!?;:'"]/g, '');
            const isIncorrect = analysis.incorrectWords.map(w => w.toLowerCase()).includes(clean);
            const isUnclear = analysis.unclearWords?.map(w => w.toLowerCase()).includes(clean);

            let className = 'inline transition-colors duration-300 ';
            if (isIncorrect) {
                className += 'text-rose-600 bg-rose-50 px-0.5 rounded border-b-2 border-rose-400 font-medium';
            } else if (isUnclear) {
                className += 'text-amber-600 bg-amber-50 px-0.5 rounded border-b-2 border-amber-300 font-medium';
            } else {
                className += 'text-emerald-700';
            }

            // Guided Reading highlight
            if (idx === currentReadingWordIdx) {
                className += ' ring-2 ring-indigo-400 bg-indigo-50 px-1 rounded';
            }

            return (
                <span
                    key={idx}
                    className={className}
                    style={{ marginRight: '0.3em', whiteSpace: 'nowrap' }}
                    title={isIncorrect ? 'Mispronounced' : isUnclear ? 'Unclear' : 'Correct'}
                >
                    {word}
                </span>
            );
        });
    };

    // ─── Pace indicator ──────────────────────────────────────────
    const renderPaceMeter = () => {
        if (wordsPerMinute === null) return null;

        let paceLabel = 'Good pace';
        let paceColor = 'text-emerald-600 bg-emerald-50';
        let paceIcon = 'solar:check-circle-linear';

        if (wordsPerMinute < 100) {
            paceLabel = 'Speaking slowly — try a bit faster';
            paceColor = 'text-blue-600 bg-blue-50';
            paceIcon = 'solar:clock-circle-linear';
        } else if (wordsPerMinute > 180) {
            paceLabel = 'Speaking fast — try to slow down';
            paceColor = 'text-amber-600 bg-amber-50';
            paceIcon = 'solar:bolt-circle-linear';
        }

        return (
            <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl ${paceColor} text-sm font-sans font-medium`}>
                <Icon icon={paceIcon} width="16" />
                <span>{wordsPerMinute} WPM</span>
                <span className="text-xs opacity-70">— {paceLabel}</span>
            </div>
        );
    };

    const pScore = analysis?.accuracyScore || 0;
    const fScore = pScore > 0
        ? Math.min(100, Math.round((transcript.split(/\s+/).length / Math.max(actualText.split(/\s+/).length, 1)) * 100))
        : 0;

    return (
        <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6 lg:gap-8 items-start">
            {/* Left: Passage + Controls */}
            <div className="w-full lg:col-span-7">
                <div className="bg-white rounded-3xl p-6 sm:p-8 md:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-neutral-100 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl opacity-40 -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                    {/* Header */}
                    <div className="relative z-10 mb-5">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <span className="text-2xl">📘</span>
                            <div>
                                <h2 className="text-xl font-dm-sans text-[#111] tracking-tight">{passage.title}</h2>
                                <p className="text-xs text-neutral-400 font-sans">{passage.category} • {passage.difficulty}</p>
                            </div>
                        </div>
                    </div>

                    {/* Text body — custom text input or passage */}
                    <div className="relative z-10 bg-neutral-50 rounded-2xl p-5 sm:p-6 border border-neutral-100 mb-6 min-h-[180px] max-w-full overflow-hidden">
                        {passage.id === 'custom' ? (
                            <textarea
                                value={customText}
                                onChange={e => setCustomText(e.target.value)}
                                placeholder="Type or paste the text you want to practice reading..."
                                className="w-full min-h-[200px] bg-transparent text-base sm:text-lg font-sans leading-relaxed text-neutral-700 resize-none outline-none placeholder:text-neutral-400"
                            />
                        ) : (
                            <p
                                className={`text-base sm:text-lg font-sans max-w-full ${autismMode ? 'leading-loose tracking-wide text-lg' : 'leading-relaxed'}`}
                                style={{ overflowWrap: 'anywhere', wordBreak: 'keep-all', whiteSpace: 'normal', hyphens: 'none' }}
                            >
                                {renderHighlightedText()}
                            </p>
                        )}
                    </div>

                    {/* Spoken transcript */}
                    {spokenTranscript && (
                        <div className="relative z-10 mb-5 bg-indigo-50/50 rounded-2xl p-4 sm:p-5 border border-indigo-100 max-w-full overflow-hidden">
                            <h4 className="text-xs text-indigo-500 uppercase tracking-wider font-semibold mb-2">You said:</h4>
                            <p className="text-base font-sans text-[#111] italic leading-relaxed" style={{ wordWrap: 'break-word', overflowWrap: 'break-word' }}>
                                "{spokenTranscript}"
                            </p>
                        </div>
                    )}

                    {/* Pace meter */}
                    {wordsPerMinute !== null && (
                        <div className="relative z-10 mb-5">
                            {renderPaceMeter()}
                        </div>
                    )}

                    {/* Controls */}
                    <div className="relative z-10 flex justify-center items-center gap-4 sm:gap-6">
                        <div className="flex gap-2">
                            <button
                                onClick={playCorrect}
                                className="w-12 h-12 flex items-center justify-center rounded-l-full bg-neutral-100 text-neutral-600 hover:bg-neutral-200 transition-all hover:scale-105"
                                title="Listen to passage"
                                disabled={!actualText}
                            >
                                <Icon icon="solar:volume-loud-linear" width="22" />
                            </button>
                            <button
                                onClick={stopSpeaking}
                                className="w-12 h-12 flex items-center justify-center rounded-r-full bg-neutral-100 text-neutral-500 hover:bg-rose-50 hover:text-rose-600 transition-all hover:scale-105"
                                title="Stop AI Coach"
                                disabled={!actualText}
                            >
                                <Icon icon="solar:stop-circle-linear" width="22" />
                            </button>
                        </div>

                        <button
                            onMouseDown={handleStart}
                            onMouseUp={stopRecording}
                            onMouseLeave={isRecording ? stopRecording : undefined}
                            onTouchStart={(e) => { e.preventDefault(); handleStart(); }}
                            onTouchEnd={(e) => { e.preventDefault(); stopRecording(); }}
                            className={`w-16 h-16 flex items-center justify-center rounded-full text-white shadow-lg transition-all duration-200 touch-none select-none ${isRecording
                                ? 'bg-rose-500 mic-recording scale-110'
                                : 'bg-[#111] hover:scale-105 hover:shadow-xl'
                                }`}
                            disabled={isAnalyzing || !isSupported || !actualText}
                            aria-label="Hold to speak"
                        >
                            <Icon icon={isRecording ? "solar:microphone-2-bold" : "solar:microphone-2-linear"} width="28" />
                        </button>

                        {audioUrl && (
                            <button
                                onClick={() => { stopSpeaking(); const a = new Audio(audioUrl); a.play().catch(console.error); }}
                                className="w-12 h-12 flex items-center justify-center rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-all hover:scale-105"
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
                        {retryMsg && <span className="text-amber-600 animate-pulse flex items-center gap-2 justify-center"><Icon icon="line-md:loading-loop" />{retryMsg}</span>}
                        {isRecording && (
                            <span className="text-rose-500 animate-pulse flex items-center gap-2 justify-center">
                                <span className="w-2 h-2 bg-rose-500 rounded-full animate-ping" />
                                Listening... speak now
                            </span>
                        )}
                        {isAnalyzing && !retryMsg && <span className="text-indigo-500 animate-pulse flex items-center gap-2 justify-center"><Icon icon="line-md:loading-loop" /> Analyzing pronunciation...</span>}
                        {sessionSaved && (
                            <span className="text-emerald-500 flex items-center gap-1 justify-center">
                                <Icon icon="solar:check-circle-linear" width="16" />
                                {autismMode ? 'Great job! Try again when you are ready.' : 'Session saved! Hold mic to try again.'}
                            </span>
                        )}
                        {!isRecording && !isAnalyzing && !analysis && !speechError && !apiError && !retryMsg && (
                            <span className="text-neutral-400">{autismMode ? 'Press and hold the microphone. Read slowly and clearly.' : 'Hold microphone to read the passage aloud'}</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Right: AI Coach Feedback */}
            <div className="w-full lg:col-span-5">
                {!analysis && !isAnalyzing ? (
                    <div className="bg-white rounded-3xl p-8 shadow-[0_20px_40px_rgb(0,0,0,0.06)] border border-neutral-100 flex flex-col items-center justify-center min-h-[300px] text-center gap-4">
                        <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center">
                            <Icon icon="solar:chat-round-dots-linear" width="32" className="text-indigo-400" />
                        </div>
                        <div>
                            <h3 className="font-dm-sans text-lg text-[#111] mb-1">AI Coach</h3>
                            <p className="text-neutral-500 font-sans text-sm max-w-[250px]">
                                {autismMode
                                    ? 'Hold the microphone and read when you feel ready. I will give you friendly feedback.'
                                    : 'Hold the microphone to read. Scores and feedback will appear here.'
                                }
                            </p>
                        </div>

                        {/* Pronunciation heatmap legend */}
                        <div className="flex items-center gap-4 mt-4 text-xs font-sans text-neutral-500">
                            <span className="flex items-center gap-1"><span className="w-3 h-1 rounded bg-emerald-500" /> Correct</span>
                            <span className="flex items-center gap-1"><span className="w-3 h-1 rounded bg-amber-400" /> Unclear</span>
                            <span className="flex items-center gap-1"><span className="w-3 h-1 rounded bg-rose-500" /> Incorrect</span>
                        </div>
                    </div>
                ) : isAnalyzing ? (
                    <div className="bg-white rounded-3xl p-8 shadow-[0_20px_40px_rgb(0,0,0,0.06)] border border-neutral-100 flex flex-col items-center justify-center min-h-[300px] text-center gap-4">
                        <Icon icon="line-md:loading-twotone-loop" width="48" className="text-indigo-500" />
                        <h3 className="font-dm-sans text-lg text-[#111]">Analyzing Speech</h3>
                        <p className="text-neutral-500 font-sans text-sm max-w-[250px]">Processing your pronunciation...</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-[0_20px_40px_rgb(0,0,0,0.06)] border border-neutral-100 flex flex-col gap-5">
                        {/* Coach Header */}
                        <div className="flex items-center gap-2 pb-3 border-b border-neutral-100">
                            <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center">
                                <Icon icon="solar:chat-round-dots-bold" width="16" className="text-white" />
                            </div>
                            <span className="text-sm font-semibold text-[#111] font-sans">AI Coach Feedback</span>
                        </div>

                        {/* Scores */}
                        {pScore > 0 && (
                            <div className={`grid grid-cols-3 gap-3 transition-all duration-500 ${showScores ? 'opacity-100' : 'opacity-0 translate-y-2'}`}>
                                <div className="bg-indigo-50 rounded-2xl p-4 text-center">
                                    <span className={`text-2xl font-dm-sans font-medium text-indigo-600 ${showScores ? 'score-animate' : ''}`}>{pScore}</span>
                                    <p className="text-xs text-indigo-500 mt-1 font-sans">Accuracy</p>
                                </div>
                                <div className="bg-emerald-50 rounded-2xl p-4 text-center">
                                    <span className={`text-2xl font-dm-sans font-medium text-emerald-600 ${showScores ? 'score-animate' : ''}`}>{fScore}</span>
                                    <p className="text-xs text-emerald-500 mt-1 font-sans">Fluency</p>
                                </div>
                                <div className="bg-amber-50 rounded-2xl p-4 text-center">
                                    <span className={`text-2xl font-dm-sans font-medium text-amber-600 ${showScores ? 'score-animate' : ''}`}>{wordsPerMinute || 0}</span>
                                    <p className="text-xs text-amber-500 mt-1 font-sans">WPM</p>
                                </div>
                            </div>
                        )}

                        {/* Progress bar */}
                        {pScore > 0 && (
                            <div className="flex justify-between items-center border-b border-neutral-100 pb-4">
                                <span className="text-sm font-medium text-neutral-400 uppercase tracking-tight font-sans">Overall</span>
                                <div className="flex items-center gap-2">
                                    <div className="w-28 h-2.5 bg-neutral-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-indigo-500 rounded-full transition-all duration-700 ease-out" style={{ width: `${pScore}%` }} />
                                    </div>
                                    <span className="text-sm font-bold text-indigo-600 font-sans">{pScore}%</span>
                                </div>
                            </div>
                        )}

                        {/* Incorrect words */}
                        {analysis?.incorrectWords && analysis.incorrectWords.length > 0 && (
                            <div>
                                <h4 className="text-neutral-500 text-xs uppercase tracking-tight mb-2 font-sans flex items-center gap-1">
                                    <Icon icon="solar:danger-triangle-linear" />
                                    {autismMode ? "Let's practice these words together" : 'Needs Work'}
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                    {analysis.incorrectWords.map((word, i) => (
                                        <span key={i} className="text-sm tracking-tight text-rose-500 font-medium font-sans bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-100">
                                            {word}
                                            {analysis.phoneticBreakdown?.[word] && (
                                                <span className="text-xs text-rose-400 ml-1.5">({analysis.phoneticBreakdown[word]})</span>
                                            )}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Unclear words */}
                        {analysis?.unclearWords && analysis.unclearWords.length > 0 && (
                            <div>
                                <h4 className="text-neutral-500 text-xs uppercase tracking-tight mb-2 font-sans flex items-center gap-1">
                                    <Icon icon="solar:question-circle-linear" />
                                    {autismMode ? 'Try saying these again — you were close!' : 'Unclear'}
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                    {analysis.unclearWords.map((word, i) => (
                                        <span key={i} className="text-sm tracking-tight text-amber-600 font-medium font-sans bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-100">
                                            {word}
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
                            <div className="bg-amber-50 rounded-2xl p-4 sm:p-5 border border-amber-100/50">
                                <h4 className="text-amber-700 text-xs font-medium uppercase tracking-tight flex items-center gap-1.5 font-sans mb-2">
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
                            <div className="bg-indigo-50 rounded-2xl p-4 sm:p-5 border border-indigo-100/50">
                                <h4 className="text-indigo-700 text-xs font-medium uppercase tracking-tight flex items-center gap-1.5 font-sans mb-2">
                                    <Icon icon="solar:magic-stick-3-linear" width="16" /> Suggested Corrections
                                </h4>
                                <ul className="text-sm text-indigo-900 leading-relaxed font-sans space-y-2 list-disc pl-4">
                                    {analysis.suggestions.map((sug, i) => <li key={i}>{sug}</li>)}
                                </ul>
                            </div>
                        )}

                        {/* Perfect score */}
                        {pScore > 0 && analysis?.incorrectWords && analysis.incorrectWords.length === 0 && (
                            <div className="flex flex-col items-center justify-center gap-3 text-center py-4 border-t border-neutral-100 pt-6">
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
                        {pScore > 0 && audioUrl && (
                            <div className="bg-neutral-50 rounded-2xl p-4 sm:p-5 border border-neutral-100/50 mt-2">
                                <h4 className="text-neutral-700 text-xs font-medium uppercase tracking-tight flex items-center gap-1.5 font-sans mb-3 text-center justify-center">
                                    <Icon icon="solar:headphones-round-sound-linear" width="16" /> Compare Pronunciation
                                </h4>
                                <div className="flex justify-center gap-4">
                                    <button
                                        onClick={() => { stopSpeaking(); const a = new Audio(audioUrl); a.play().catch(console.error); }}
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
    );
};

export default ReadAlongMode;
