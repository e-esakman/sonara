import { useState, useEffect, useRef, useCallback } from 'react';
import { Icon } from '@iconify/react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { analyzePronunciation } from '../services/pronunciationService';
import type { AnalysisResult } from '../services/pronunciationService';
import { geminiLiveService } from '../services/geminiLiveService';
import { useStore } from '../store/useStore';

const FreeSpeakMode = () => {
    const { addSession, autismMode } = useStore();

    const {
        isRecording,
        transcript,
        audioUrl,
        isSupported,
        error: speechError,
        startRecording,
        stopRecording,
    } = useSpeechRecognition();

    const [coachMode, setCoachMode] = useState<'standard' | 'live'>('standard');
    const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);
    const [retryMsg, setRetryMsg] = useState<string | null>(null);
    const [spokenText, setSpokenText] = useState('');
    const [wordsPerMinute, setWordsPerMinute] = useState<number | null>(null);
    const recordingStartRef = useRef<number>(0);

    // Live AI Coach state
    const [liveStatus, setLiveStatus] = useState<string>('Disconnected');
    const [liveRecording, setLiveRecording] = useState(false);
    const [liveTranscript, setLiveTranscript] = useState('');
    const [liveUserTranscript, setLiveUserTranscript] = useState('');
    const audioContextRef = useRef<AudioContext | null>(null);
    const micContextRef = useRef<AudioContext | null>(null);
    const audioQueueRef = useRef<AudioBufferSourceNode[]>([]);
    const liveStreamRef = useRef<MediaStream | null>(null);
    const liveRecorderRef = useRef<ScriptProcessorNode | null>(null);
    const nextAudioTimeRef = useRef<number>(0);

    const stopAudioPlayback = useCallback(() => {
        audioQueueRef.current.forEach(source => { try { source.stop(); } catch (e) { } });
        audioQueueRef.current = [];
        nextAudioTimeRef.current = 0;
    }, []);

    // Gemini Live callbacks
    useEffect(() => {
        geminiLiveService.onStatus = setLiveStatus;
        geminiLiveService.onTextResponse = (t) => setLiveTranscript(prev => prev + ' ' + t);
        geminiLiveService.onAudioResponse = (base64Audio) => {
            try {
                const binaryString = atob(base64Audio);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);

                if (!audioContextRef.current) {
                    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
                }
                const ctx = audioContextRef.current;

                const float32Data = new Float32Array(bytes.length / 2);
                const dataView = new DataView(bytes.buffer);
                for (let i = 0; i < float32Data.length; i++) float32Data[i] = dataView.getInt16(i * 2, true) / 32768.0;

                const audioBuffer = ctx.createBuffer(1, float32Data.length, 24000);
                audioBuffer.getChannelData(0).set(float32Data);

                const source = ctx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(ctx.destination);

                if (nextAudioTimeRef.current < ctx.currentTime) nextAudioTimeRef.current = ctx.currentTime;
                source.start(nextAudioTimeRef.current);
                nextAudioTimeRef.current += audioBuffer.duration;
                audioQueueRef.current.push(source);

                source.onended = () => {
                    const idx = audioQueueRef.current.indexOf(source);
                    if (idx > -1) audioQueueRef.current.splice(idx, 1);
                };
            } catch (e) { console.error('[FreeSpeakMode] Audio error:', e); }
        };
        geminiLiveService.onError = (err) => {
            console.error('[FreeSpeakMode] Live error:', err);
            setLiveStatus('Error: ' + err.message);
        };
        return () => {
            geminiLiveService.stopSession();
            stopAudioPlayback();
            audioContextRef.current?.close().catch(() => { /* intentionally ignored */ });
            audioContextRef.current = null;
            micContextRef.current?.close().catch(() => { /* intentionally ignored */ });
            micContextRef.current = null;
        };
    }, [stopAudioPlayback]);

    useEffect(() => {
        if (transcript) {
            setSpokenText(transcript);
            if (coachMode === 'standard') setLiveUserTranscript(transcript);
        }
    }, [transcript, coachMode]);

    // Standard analysis on stop
    useEffect(() => {
        if (coachMode !== 'standard' || !transcript || isRecording) return;

        const analyze = async () => {
            setIsAnalyzing(true);
            setApiError(null);
            setRetryMsg(null);
            try {
                const result = await analyzePronunciation(transcript, transcript, (attempt) => {
                    setRetryMsg(`AI coach is busy, retrying... (attempt ${attempt})`);
                });
                setRetryMsg(null);
                setAnalysis(result);

                if (result.accuracyScore > 0) {
                    const durationMs = Date.now() - recordingStartRef.current;
                    const durationMin = Math.max(durationMs / 60000, 0.1);
                    const spokenWords = transcript.split(/\s+/).length;
                    const wpm = Math.round(spokenWords / durationMin);
                    setWordsPerMinute(wpm);

                    addSession({
                        passageId: 'free-speak',
                        expectedText: transcript,
                        spokenTranscript: transcript,
                        pronunciationScore: result.accuracyScore,
                        fluencyScore: 85,
                        confidenceScore: Math.min(100, Math.round(result.accuracyScore * 0.6 + 85 * 0.4)),
                        wordsPerMinute: wpm,
                        pauseCount: 0,
                        incorrectWords: result.incorrectWords,
                        accentInfluence: result.accentInfluence,
                        audioUrl: audioUrl || undefined,
                    });
                }
            } catch (error: any) {
                setRetryMsg(null);
                setApiError(error.message || 'Analysis failed');
            } finally {
                setIsAnalyzing(false);
            }
        };

        const timer = setTimeout(analyze, 300);
        return () => clearTimeout(timer);
    }, [transcript, isRecording, coachMode]);

    // Mode switch
    const handleModeSwitch = async (newMode: 'standard' | 'live') => {
        setCoachMode(newMode);
        setLiveTranscript('');
        setLiveUserTranscript('');
        setAnalysis(null);
        setWordsPerMinute(null);
        if (newMode === 'live') {
            await geminiLiveService.startSession();
        } else {
            geminiLiveService.stopSession();
            stopAudioPlayback();
            stopLiveRecording();
        }
    };

    const startLiveRecording = useCallback(async () => {
        stopAudioPlayback();
        setLiveTranscript('');

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true, noiseSuppression: true }
            });
            liveStreamRef.current = stream;

            if (!micContextRef.current) {
                micContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            }

            const micCtx = micContextRef.current;
            const source = micCtx.createMediaStreamSource(stream);
            const processor = micCtx.createScriptProcessor(4096, 1, 1);
            source.connect(processor);
            processor.connect(micCtx.destination);

            processor.onaudioprocess = (e) => {
                const outputData = e.outputBuffer.getChannelData(0);
                outputData.fill(0);

                const inputData = e.inputBuffer.getChannelData(0);
                const pcm16 = new Int16Array(inputData.length);
                for (let i = 0; i < inputData.length; i++) {
                    const s = Math.max(-1, Math.min(1, inputData[i]));
                    pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
                }
                const bytes = new Uint8Array(pcm16.buffer);
                let binary = '';
                for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
                geminiLiveService.sendAudioChunk(btoa(binary));
            };

            liveRecorderRef.current = processor;
            setLiveRecording(true);
        } catch (e) {
            console.error('[FreeSpeakMode] Mic error:', e);
            setLiveRecording(false);
        }
    }, [stopAudioPlayback]);

    const stopLiveRecording = useCallback(() => {
        if (!liveRecording && !liveRecorderRef.current) return;
        setLiveRecording(false);
        geminiLiveService.sendAudioStreamEnd();
        if (liveRecorderRef.current) {
            liveRecorderRef.current.disconnect();
            liveRecorderRef.current = null;
        }
        if (liveStreamRef.current) {
            liveStreamRef.current.getTracks().forEach(t => t.stop());
            liveStreamRef.current = null;
        }
    }, [liveRecording]);

    const toggleLiveRecording = useCallback(async () => {
        if (liveRecording) {
            stopLiveRecording();
        } else {
            if (liveStatus === 'Disconnected') await geminiLiveService.startSession();
            startLiveRecording();
        }
    }, [liveRecording, liveStatus, startLiveRecording, stopLiveRecording]);

    const handleStandardStart = () => {
        recordingStartRef.current = Date.now();
        startRecording();
    };

    // ─── Pace meter ──────────────────────────────────────────────
    const renderPaceMeter = () => {
        if (wordsPerMinute === null) return null;
        let paceLabel = 'Good pace';
        let paceColor = 'text-emerald-600 bg-emerald-50';
        if (wordsPerMinute < 100) { paceLabel = 'Speaking slowly'; paceColor = 'text-blue-600 bg-blue-50'; }
        else if (wordsPerMinute > 180) { paceLabel = 'Speaking fast'; paceColor = 'text-amber-600 bg-amber-50'; }

        return (
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl ${paceColor} text-sm font-sans font-medium`}>
                <Icon icon="solar:speedometer-linear" width="16" />
                {wordsPerMinute} WPM — {paceLabel}
            </div>
        );
    };

    return (
        <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6 lg:gap-8 items-start">
            {/* Left: Speaking area */}
            <div className="w-full lg:col-span-7">
                <div className="bg-white rounded-3xl p-6 sm:p-8 md:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-neutral-100 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-violet-50 rounded-full blur-3xl opacity-40 -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                    {/* Mode toggle */}
                    <div className="relative z-10 flex bg-neutral-100 rounded-full p-1 mx-auto mb-8 w-fit border border-neutral-200 shadow-sm">
                        <button
                            onClick={() => handleModeSwitch('standard')}
                            className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ${coachMode === 'standard' ? 'bg-white shadow-[0_2px_8px_rgba(0,0,0,0.08)] text-indigo-600' : 'text-neutral-500 hover:text-[#111]'}`}
                        >Standard Analysis</button>
                        <button
                            onClick={() => handleModeSwitch('live')}
                            className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 flex items-center gap-2 ${coachMode === 'live' ? 'bg-indigo-50 text-indigo-700 shadow-[0_2px_8px_rgba(99,102,241,0.2)] border border-indigo-100' : 'text-neutral-500 hover:text-[#111]'}`}
                        >
                            <Icon icon="solar:microphone-3-bold-duotone" className={coachMode === 'live' ? 'animate-pulse text-indigo-500' : ''} />
                            Live AI Coach
                        </button>
                    </div>

                    {/* Prompt text */}
                    <div className="relative z-10 text-center mb-8">
                        <h2 className="text-2xl md:text-3xl font-dm-sans text-[#111] tracking-tight mb-2">
                            {coachMode === 'live' ? 'Talk to Your AI Coach' : 'Speak Freely'}
                        </h2>
                        <p className="text-neutral-500 font-sans text-sm max-w-lg mx-auto">
                            {coachMode === 'live'
                                ? 'Tap the mic to start a conversational practice session with your AI speaking coach.'
                                : autismMode
                                    ? 'Press and hold the microphone. Say anything you like. I will give you friendly feedback.'
                                    : 'Hold the microphone and say anything. AI will analyze your pronunciation, fluency, and pace.'}
                        </p>
                    </div>

                    {/* Live transcript sections */}
                    {(spokenText || liveUserTranscript) && (
                        <div className="relative z-10 mb-6 space-y-3">
                            {/* You said */}
                            <div className="bg-neutral-50 rounded-2xl p-4 sm:p-5 border border-neutral-100">
                                <h4 className="text-xs text-neutral-400 uppercase tracking-wider font-bold mb-2 flex items-center gap-1.5">
                                    <Icon icon="solar:user-speak-linear" width="14" />
                                    You said:
                                </h4>
                                <p className="text-base font-sans text-[#111] leading-relaxed" style={{ wordWrap: 'break-word', overflowWrap: 'break-word' }}>
                                    "{coachMode === 'live' ? (liveUserTranscript || spokenText) : spokenText}"
                                </p>
                            </div>

                            {/* AI Coach Response (Live mode) */}
                            {coachMode === 'live' && liveTranscript && (
                                <div className="bg-indigo-50/60 rounded-2xl p-4 sm:p-5 border border-indigo-100">
                                    <h4 className="text-xs text-indigo-500 uppercase tracking-wider font-bold mb-2 flex items-center gap-1.5">
                                        <Icon icon="solar:chat-round-dots-linear" width="14" />
                                        AI Coach Response:
                                    </h4>
                                    <p className="text-base font-sans text-indigo-900 leading-relaxed" style={{ wordWrap: 'break-word', overflowWrap: 'break-word' }}>
                                        "{liveTranscript.trim()}"
                                    </p>
                                </div>
                            )}

                            {/* Suggested corrections (Standard mode) */}
                            {coachMode === 'standard' && analysis?.suggestions && analysis.suggestions.length > 0 && (
                                <div className="bg-emerald-50/50 rounded-2xl p-4 sm:p-5 border border-emerald-100">
                                    <h4 className="text-xs text-emerald-600 uppercase tracking-wider font-bold mb-2 flex items-center gap-1.5">
                                        <Icon icon="solar:magic-stick-3-linear" width="14" />
                                        Suggested Correction:
                                    </h4>
                                    <ul className="text-sm text-emerald-900 leading-relaxed font-sans space-y-1 list-disc pl-4">
                                        {analysis.suggestions.map((s, i) => <li key={i}>{s}</li>)}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Pace meter */}
                    {wordsPerMinute !== null && (
                        <div className="relative z-10 mb-6 flex justify-center">
                            {renderPaceMeter()}
                        </div>
                    )}

                    {/* Mic controls */}
                    <div className="relative z-10 flex justify-center items-center gap-6">
                        {coachMode === 'live' ? (
                            <>
                                <button
                                    onClick={stopAudioPlayback}
                                    className="w-12 h-12 flex items-center justify-center rounded-full bg-neutral-100 text-neutral-600 hover:bg-neutral-200 transition-all hover:scale-105"
                                    title="Stop AI playback"
                                >
                                    <Icon icon="solar:stop-circle-linear" width="22" />
                                </button>
                                <button
                                    onClick={toggleLiveRecording}
                                    className={`w-16 h-16 flex items-center justify-center rounded-full text-white shadow-lg transition-all touch-none select-none ${liveRecording ? 'bg-rose-500 mic-recording scale-110' : 'bg-[#111] hover:scale-105'}`}
                                    aria-label={liveRecording ? 'Stop speaking' : 'Start speaking'}
                                >
                                    <Icon icon={liveRecording ? 'solar:stop-bold' : 'solar:microphone-2-linear'} width="28" />
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    onClick={() => { if (audioUrl) { const a = new Audio(audioUrl); a.play().catch(console.error); } }}
                                    className="w-12 h-12 flex items-center justify-center rounded-full bg-neutral-100 text-neutral-600 hover:bg-neutral-200 transition-all hover:scale-105"
                                    title="Replay recording"
                                    disabled={!audioUrl}
                                >
                                    <Icon icon="solar:play-linear" width="22" />
                                </button>
                                <button
                                    onMouseDown={handleStandardStart}
                                    onMouseUp={stopRecording}
                                    onMouseLeave={isRecording ? stopRecording : undefined}
                                    onTouchStart={(e) => { e.preventDefault(); handleStandardStart(); }}
                                    onTouchEnd={(e) => { e.preventDefault(); stopRecording(); }}
                                    className={`w-16 h-16 flex items-center justify-center rounded-full text-white shadow-lg transition-all duration-200 touch-none select-none ${isRecording ? 'bg-rose-500 mic-recording scale-110' : 'bg-[#111] hover:scale-105 hover:shadow-xl'}`}
                                    disabled={isAnalyzing || !isSupported}
                                    aria-label="Hold to speak"
                                >
                                    <Icon icon={isRecording ? 'solar:microphone-2-bold' : 'solar:microphone-2-linear'} width="28" />
                                </button>
                            </>
                        )}
                    </div>

                    {/* Status */}
                    <div className="text-center mt-4 text-sm font-medium font-sans min-h-[20px]">
                        {speechError && <span className="text-rose-500">{speechError}</span>}
                        {apiError && <span className="text-rose-500">{apiError}</span>}
                        {retryMsg && <span className="text-amber-600 animate-pulse flex items-center gap-2 justify-center"><Icon icon="line-md:loading-loop" />{retryMsg}</span>}
                        {coachMode === 'live' && liveRecording && (
                            <span className="text-rose-500 animate-pulse flex items-center gap-2 justify-center">
                                <Icon icon="line-md:loading-twotone-loop" /> Listening to you... (tap mic to stop)
                            </span>
                        )}
                        {coachMode === 'live' && !liveRecording && (
                            <span className="text-emerald-500 flex items-center gap-2 justify-center">{liveStatus} — Tap the mic to speak</span>
                        )}
                        {coachMode === 'standard' && isRecording && (
                            <span className="text-rose-500 animate-pulse flex items-center gap-2 justify-center">
                                <span className="w-2 h-2 bg-rose-500 rounded-full animate-ping" /> Listening...
                            </span>
                        )}
                        {coachMode === 'standard' && isAnalyzing && !retryMsg && (
                            <span className="text-indigo-500 animate-pulse flex items-center gap-2 justify-center"><Icon icon="line-md:loading-loop" /> Analyzing...</span>
                        )}
                        {coachMode === 'standard' && analysis && !isAnalyzing && (
                            <span className="text-emerald-500">Analysis complete. Hold mic to try again.</span>
                        )}
                        {coachMode === 'standard' && !isRecording && !isAnalyzing && !analysis && !speechError && !apiError && !retryMsg && (
                            <span className="text-neutral-400">Hold microphone to speak freely</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Right: Analysis panel */}
            <div className="w-full lg:col-span-5">
                {coachMode === 'live' ? (
                    <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-[0_20px_40px_rgb(0,0,0,0.06)] border border-neutral-100 flex flex-col gap-5 min-h-[300px]">
                        <div className="flex items-center gap-2 pb-3 border-b border-neutral-100">
                            <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center">
                                <Icon icon="solar:chat-round-dots-bold" width="16" className="text-white" />
                            </div>
                            <span className="text-sm font-semibold text-[#111] font-sans">Live AI Coach</span>
                            <span className={`ml-auto text-xs font-sans px-2.5 py-1 rounded-full ${liveStatus === 'Connected' ? 'bg-emerald-50 text-emerald-600' : liveStatus.startsWith('Error') ? 'bg-rose-50 text-rose-600' : 'bg-neutral-100 text-neutral-500'}`}>
                                {liveStatus}
                            </span>
                        </div>

                        <div className="flex-1 flex flex-col items-center justify-center text-center gap-4">
                            <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center">
                                <Icon icon="solar:microphone-3-bold-duotone" width="32" className="text-indigo-400" />
                            </div>
                            <p className="text-neutral-500 font-sans text-sm max-w-[280px]">
                                The Live AI Coach will respond with voice and text. Tap the mic to begin your conversation.
                            </p>
                        </div>

                        {/* Conversation log */}
                        {(spokenText || liveTranscript) && (
                            <div className="space-y-3 border-t border-neutral-100 pt-4">
                                {spokenText && (
                                    <div>
                                        <h4 className="text-xs text-neutral-400 uppercase font-bold mb-1 font-sans">You</h4>
                                        <p className="text-sm text-[#111] font-sans bg-neutral-50 p-3 rounded-xl">{spokenText}</p>
                                    </div>
                                )}
                                {liveTranscript && (
                                    <div>
                                        <h4 className="text-xs text-indigo-500 uppercase font-bold mb-1 font-sans">Coach</h4>
                                        <p className="text-sm text-indigo-900 font-sans bg-indigo-50 p-3 rounded-xl">{liveTranscript.trim()}</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    <>
                        {!analysis && !isAnalyzing ? (
                            <div className="bg-white rounded-3xl p-8 shadow-[0_20px_40px_rgb(0,0,0,0.06)] border border-neutral-100 flex flex-col items-center justify-center min-h-[300px] text-center gap-4">
                                <div className="w-16 h-16 bg-violet-50 rounded-full flex items-center justify-center">
                                    <Icon icon="solar:soundwave-circle-linear" width="32" className="text-violet-400" />
                                </div>
                                <div>
                                    <h3 className="font-dm-sans text-lg text-[#111] mb-1">Free Speaking Feedback</h3>
                                    <p className="text-neutral-500 font-sans text-sm max-w-[250px]">
                                        Speak naturally and the AI will analyze your pronunciation, accent patterns, and fluency.
                                    </p>
                                </div>
                            </div>
                        ) : isAnalyzing ? (
                            <div className="bg-white rounded-3xl p-8 shadow-[0_20px_40px_rgb(0,0,0,0.06)] border border-neutral-100 flex flex-col items-center justify-center min-h-[300px] text-center gap-4">
                                <Icon icon="line-md:loading-twotone-loop" width="48" className="text-indigo-500" />
                                <h3 className="font-dm-sans text-lg text-[#111]">Analyzing Speech</h3>
                                <p className="text-neutral-500 font-sans text-sm max-w-[250px]">Processing pronunciation...</p>
                            </div>
                        ) : (
                            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-[0_20px_40px_rgb(0,0,0,0.06)] border border-neutral-100 flex flex-col gap-5">
                                <div className="flex items-center gap-2 pb-3 border-b border-neutral-100">
                                    <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center">
                                        <Icon icon="solar:chat-round-dots-bold" width="16" className="text-white" />
                                    </div>
                                    <span className="text-sm font-semibold text-[#111] font-sans">Analysis Results</span>
                                </div>

                                {/* Score bar */}
                                {analysis && analysis.accuracyScore > 0 && (
                                    <div className="flex justify-between items-center border-b border-neutral-100 pb-4">
                                        <span className="text-sm font-medium text-neutral-400 uppercase tracking-tight font-sans">Score</span>
                                        <div className="flex items-center gap-2">
                                            <div className="w-28 h-2.5 bg-neutral-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-indigo-500 rounded-full transition-all duration-700" style={{ width: `${analysis.accuracyScore}%` }} />
                                            </div>
                                            <span className="text-sm font-bold text-indigo-600 font-sans">{analysis.accuracyScore}%</span>
                                        </div>
                                    </div>
                                )}

                                {/* Incorrect words */}
                                {analysis?.incorrectWords && analysis.incorrectWords.length > 0 && (
                                    <div>
                                        <h4 className="text-neutral-500 text-xs uppercase tracking-tight mb-2 font-sans flex items-center gap-1">
                                            <Icon icon="solar:danger-triangle-linear" />
                                            {autismMode ? "Let's try these again" : 'Needs Work'}
                                        </h4>
                                        <div className="flex flex-wrap gap-2">
                                            {analysis.incorrectWords.map((word, i) => (
                                                <span key={i} className="text-sm text-rose-500 font-medium font-sans bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-100">
                                                    {word}
                                                    {analysis.phoneticBreakdown?.[word] && <span className="text-xs text-rose-400 ml-1.5">({analysis.phoneticBreakdown[word]})</span>}
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

                                {/* Perfect score */}
                                {analysis && analysis.accuracyScore > 0 && (!analysis.incorrectWords || analysis.incorrectWords.length === 0) && (
                                    <div className="flex flex-col items-center justify-center gap-3 text-center py-4">
                                        <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center">
                                            <Icon icon="solar:check-circle-bold-duotone" width="40" className="text-emerald-500" />
                                        </div>
                                        <h3 className="text-xl font-dm-sans text-[#111]">
                                            {autismMode ? 'You spoke wonderfully!' : 'Great Speaking!'}
                                        </h3>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default FreeSpeakMode;
