import { useState, useEffect, useRef, useCallback } from 'react';
import { Icon } from '@iconify/react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { analyzePronunciation } from '../services/pronunciationService';
import type { AnalysisResult } from '../services/pronunciationService';
import { saveSession } from '../services/progressService';
import { geminiLiveService } from '../services/geminiLiveService';

const EXPECTED_SENTENCE = "She sells seashells by the seashore.";

const Trainer = () => {
    const {
        isRecording,
        transcript,
        isSupported,
        error: speechError,
        startRecording,
        stopRecording
    } = useSpeechRecognition();

    const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);

    const [mode, setMode] = useState<'standard' | 'live'>('standard');
    const [liveStatus, setLiveStatus] = useState<string>('Disconnected');
    const audioContextRef = useRef<AudioContext | null>(null);
    const micContextRef = useRef<AudioContext | null>(null);
    const audioQueueRef = useRef<AudioBufferSourceNode[]>([]);
    const liveStreamRef = useRef<MediaStream | null>(null);
    const liveRecorderRef = useRef<ScriptProcessorNode | null>(null);
    const [liveRecording, setLiveRecording] = useState(false);
    const [liveTranscript, setLiveTranscript] = useState('');
    const nextAudioTimeRef = useRef<number>(0);

    const stopAudioPlayback = useCallback(() => {
        audioQueueRef.current.forEach(source => {
            try { source.stop(); } catch (e) { }
        });
        audioQueueRef.current = [];
        nextAudioTimeRef.current = 0;
    }, []);

    useEffect(() => {
        geminiLiveService.onStatus = setLiveStatus;
        geminiLiveService.onTextResponse = (t) => {
            setLiveTranscript(prev => prev + " " + t);
        };
        geminiLiveService.onAudioResponse = (base64Audio) => {
            try {
                // Decode base64 to binary
                const binaryString = atob(base64Audio);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }

                // Create a separate playback context at 24kHz (Gemini output rate)
                if (!audioContextRef.current) {
                    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
                }
                const ctx = audioContextRef.current;

                // Convert PCM16 LE bytes to Float32
                const float32Data = new Float32Array(bytes.length / 2);
                const dataView = new DataView(bytes.buffer);
                for (let i = 0; i < float32Data.length; i++) {
                    float32Data[i] = dataView.getInt16(i * 2, true) / 32768.0;
                }

                // Gemini Live outputs at 24kHz
                const audioBuffer = ctx.createBuffer(1, float32Data.length, 24000);
                audioBuffer.getChannelData(0).set(float32Data);

                const source = ctx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(ctx.destination);

                // Schedule sequential playback
                if (nextAudioTimeRef.current < ctx.currentTime) {
                    nextAudioTimeRef.current = ctx.currentTime;
                }
                source.start(nextAudioTimeRef.current);
                nextAudioTimeRef.current += audioBuffer.duration;

                audioQueueRef.current.push(source);

                source.onended = () => {
                    const idx = audioQueueRef.current.indexOf(source);
                    if (idx > -1) {
                        audioQueueRef.current.splice(idx, 1);
                    }
                };
            } catch (e) {
                console.error('[Trainer] Error playing audio response:', e);
            }
        };
        geminiLiveService.onError = (err) => {
            console.error('[Trainer] Live error:', err);
            setLiveStatus('Error: ' + err.message);
        };
        return () => {
            geminiLiveService.stopSession();
            stopAudioPlayback();
        };
    }, [stopAudioPlayback]);

    const handleModeSwitch = async (newMode: 'standard' | 'live') => {
        setMode(newMode);
        setLiveTranscript('');
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

            // Use a SEPARATE AudioContext for mic capture at 16kHz
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
                outputData.fill(0); // Prevent mic loopback

                const inputData = e.inputBuffer.getChannelData(0);
                const pcm16 = new Int16Array(inputData.length);
                for (let i = 0; i < inputData.length; i++) {
                    const s = Math.max(-1, Math.min(1, inputData[i]));
                    pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
                }
                const bytes = new Uint8Array(pcm16.buffer);
                let binary = '';
                for (let i = 0; i < bytes.byteLength; i++) {
                    binary += String.fromCharCode(bytes[i]);
                }
                geminiLiveService.sendAudioChunk(btoa(binary));
            };
            liveRecorderRef.current = processor;
            setLiveRecording(true); // Only set AFTER mic is actually acquired!
        } catch (e) {
            console.error('[Trainer] Mic error:', e);
            setLiveRecording(false);
        }
    }, [stopAudioPlayback]);

    const stopLiveRecording = useCallback(() => {
        if (!liveRecording && !liveRecorderRef.current) return; // Guard against double-calls
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
            // Auto-reconnect if the session was disconnected
            if (liveStatus === 'Disconnected') {
                await geminiLiveService.startSession();
            }
            startLiveRecording();
        }
    }, [liveRecording, liveStatus, startLiveRecording, stopLiveRecording]);




    // Trigger analysis when transcript updates and recording finishes
    useEffect(() => {
        const analyze = async () => {
            if (transcript && !isRecording) {
                setIsAnalyzing(true);
                setApiError(null);
                try {
                    const result = await analyzePronunciation(EXPECTED_SENTENCE, transcript);
                    setAnalysis(result);

                    // Fire-and-forget session save
                    saveSession({
                        text: EXPECTED_SENTENCE,
                        accuracyScore: result.accuracyScore,
                        fluencyScore: 85,
                        timestamp: new Date()
                    }).catch(console.error);

                } catch (error: any) {
                    console.error("Analysis failed:", error);
                    setApiError(error.message || 'Failed connecting to backend.');
                } finally {
                    setIsAnalyzing(false);
                }
            }
        };

        // Debounce slightly to ensure state is settled before hitting the API
        const timer = setTimeout(analyze, 300);
        return () => clearTimeout(timer);
    }, [transcript, isRecording]);

    const playCorrect = () => {
        const utterance = new SpeechSynthesisUtterance(EXPECTED_SENTENCE);
        utterance.lang = 'en-US';
        window.speechSynthesis.speak(utterance);
    };

    // Calculate word correctness safely
    const words = EXPECTED_SENTENCE.split(' ');

    const checkWord = (word: string) => {
        const clean = word.toLowerCase().replace(/[.,!?]/g, '');
        return analysis?.incorrectWords.map(w => w.toLowerCase()).includes(clean) ?? false;
    };

    // Determine current UI states
    const statusText = () => {
        if (mode === 'live') {
            if (liveRecording) {
                return <span className="text-rose-500 animate-pulse flex items-center gap-2 justify-center">
                    <Icon icon="line-md:loading-twotone-loop" /> Listening to you... (tap mic to stop)
                </span>;
            }
            return <span className="text-emerald-500 flex items-center gap-2 justify-center">
                {liveStatus} — Tap the mic to speak
            </span>;
        }

        if (!isSupported) return <span className="text-rose-500">Browser doesn't support speech recognition.</span>;
        if (speechError) return <span className="text-rose-500">{speechError}</span>;
        if (apiError) return <span className="text-rose-500">{apiError}</span>;

        if (isRecording) {
            return (
                <span className="text-rose-500 animate-pulse flex items-center gap-2 justify-center">
                    <Icon icon="line-md:loading-twotone-loop" /> Listening...
                </span>
            );
        }
        if (isAnalyzing) {
            return (
                <span className="text-indigo-500 animate-pulse flex items-center gap-2 justify-center">
                    <Icon icon="line-md:loading-loop" /> Analyzing pronunciation...
                </span>
            );
        }

        if (analysis) return <span className="text-emerald-500">Analysis complete. Hold mic to try again.</span>;
        return <span className="text-neutral-500">Hold microphone button to speak</span>;
    };


    return (
        <section className="w-full pr-6 pb-32 pl-6 pt-16">
            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-stretch">

                {/* Visual Pronunciation Card */}
                <div className="lg:col-span-7 h-full">
                    <div className="bg-white rounded-3xl p-8 md:p-12 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-neutral-100 relative overflow-hidden h-full flex flex-col justify-between">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

                        <div className="text-center mb-16 relative z-10">
                            {/* Mode Toggle */}
                            <div className="flex bg-neutral-100 rounded-full p-1 mx-auto mb-8 w-fit relative z-10 border border-neutral-200 shadow-sm">
                                <button onClick={() => handleModeSwitch('standard')} className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ${mode === 'standard' ? 'bg-white shadow-[0_2px_8px_rgba(0,0,0,0.08)] text-indigo-600' : 'text-neutral-500 hover:text-[#111]'}`}>Standard Analysis</button>
                                <button onClick={() => handleModeSwitch('live')} className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 flex items-center gap-2 ${mode === 'live' ? 'bg-indigo-50 text-indigo-700 shadow-[0_2px_8px_rgba(99,102,241,0.2)] border border-indigo-100' : 'text-neutral-500 hover:text-[#111]'}`}>
                                    <Icon icon="solar:microphone-3-bold-duotone" className={mode === 'live' ? 'animate-pulse text-indigo-500' : ''} /> Live AI Coach
                                </button>
                            </div>

                            <div className="text-3xl md:text-4xl font-medium tracking-tight text-[#111] flex flex-wrap justify-center gap-x-3 gap-y-4 mb-6">
                                {words.map((word, idx) => {
                                    const isIncorrect = analysis && checkWord(word);
                                    const isCorrect = analysis && !isIncorrect;

                                    return (
                                        <div key={idx} className="flex flex-col items-center gap-2 relative">
                                            <span className={`font-normal font-dm-sans transition-colors duration-300 ${isIncorrect ? 'text-rose-500 border-b-2 border-rose-500/30 pb-1' : (isCorrect ? 'text-emerald-700' : '')}`}>
                                                {word}
                                            </span>
                                            {isCorrect && <Icon icon="solar:check-circle-linear" className="text-emerald-500 text-base absolute -bottom-6 animate-pulse-soft" />}
                                            {isIncorrect && <Icon icon="solar:close-circle-linear" className="text-rose-500 text-base absolute -bottom-6" />}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Show transcript underneath gracefully if there is one */}
                            {transcript && mode === 'standard' && (
                                <p className="text-neutral-400 text-sm mt-8 italic font-sans break-words bg-neutral-50 p-3 rounded-xl border border-neutral-100 inline-block">
                                    You said: "{transcript}"
                                </p>
                            )}
                            {liveTranscript && mode === 'live' && (
                                <div className="mt-8 flex flex-col items-center">
                                    <span className="text-xs uppercase tracking-widest text-indigo-400 font-bold mb-2">Live Coach Response</span>
                                    <p className="text-indigo-900 text-base font-medium font-sans break-words bg-indigo-50/80 p-5 rounded-2xl border border-indigo-100 inline-block max-w-[90%] shadow-sm">
                                        "{liveTranscript}"
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-center items-center gap-6 relative z-10 mt-auto">
                            <button
                                onClick={playCorrect}
                                className="w-12 h-12 flex items-center justify-center rounded-full bg-neutral-100 text-neutral-600 hover:bg-neutral-200 transition-colors"
                                disabled={isRecording}
                                title="Listen to correct pronunciation"
                            >
                                <Icon icon="solar:volume-loud-linear" width="24" />
                            </button>

                            {/* Mic Button: Click-toggle in Live mode, Hold-to-speak in Standard mode */}
                            {mode === 'live' ? (
                                <button
                                    onClick={toggleLiveRecording}
                                    className={`w-16 h-16 flex items-center justify-center rounded-full text-white shadow-lg transition-transform touch-none select-none ${liveRecording ? 'bg-rose-500 mic-pulse scale-110' : 'bg-[#111] hover:scale-105'}`}
                                    aria-label={liveRecording ? "Stop speaking" : "Start speaking"}
                                >
                                    <Icon icon={liveRecording ? "solar:stop-bold" : "solar:microphone-2-linear"} width="28" />
                                </button>
                            ) : (
                                <button
                                    onMouseDown={startRecording}
                                    onMouseUp={stopRecording}
                                    onMouseLeave={stopRecording}
                                    onTouchStart={(e) => { e.preventDefault(); startRecording(); }}
                                    onTouchEnd={(e) => { e.preventDefault(); stopRecording(); }}
                                    className={`w-16 h-16 flex items-center justify-center rounded-full text-white shadow-lg transition-transform touch-none select-none ${isRecording ? 'bg-rose-500 mic-pulse scale-110' : 'bg-[#111] hover:scale-105'}`}
                                    disabled={isAnalyzing || !isSupported}
                                    aria-label="Hold to speak"
                                >
                                    <Icon icon="solar:microphone-2-linear" width="28" />
                                </button>
                            )}

                            {/* Stop/Pause Button */}
                            <button
                                onClick={mode === 'live' ? stopAudioPlayback : undefined}
                                className="w-12 h-12 flex items-center justify-center rounded-full bg-neutral-100 text-neutral-600 hover:bg-neutral-200 transition-colors"
                                title={mode === 'live' ? "Stop AI playback" : "Play track"}
                            >
                                <Icon icon={mode === 'live' ? "solar:stop-circle-linear" : "solar:play-linear"} width="24" />
                            </button>
                        </div>

                        <div className="text-center mt-6 text-sm font-medium font-sans min-h-[20px] transition-all">
                            {statusText()}
                        </div>
                    </div>
                </div>

                {/* Advanced Analysis Output */}
                <div className="lg:col-span-5 relative flex h-full">
                    {!analysis && !isAnalyzing ? (
                        <div className="bg-white rounded-3xl p-8 shadow-[0_20px_40px_rgb(0,0,0,0.06)] border border-neutral-100 w-full flex flex-col items-center justify-center min-h-[300px] text-center gap-4">
                            <Icon icon="solar:clipboard-text-linear" width="48" className="text-neutral-200" />
                            <p className="text-neutral-500 font-sans text-sm">Hold the microphone to read the sentence.<br />Detailed feedback will appear here.</p>
                        </div>
                    ) : isAnalyzing ? (
                        <div className="bg-white rounded-3xl p-8 shadow-[0_20px_40px_rgb(0,0,0,0.06)] border border-neutral-100 w-full flex flex-col items-center justify-center min-h-[300px] text-center gap-4">
                            <Icon icon="line-md:loading-twotone-loop" width="48" className="text-indigo-500" />
                            <h3 className="font-dm-sans text-lg text-[#111]">Analyzing Speech</h3>
                            <p className="text-neutral-500 font-sans text-sm max-w-[250px]">Gemini is processing your pronunciation and matching accents...</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-3xl p-8 shadow-[0_20px_40px_rgb(0,0,0,0.06)] border border-neutral-100 hover:rotate-0 transition-transform duration-500 w-full flex flex-col gap-6">

                            {/* Score header */}
                            <div className="flex justify-between items-center border-b border-neutral-100 pb-4">
                                <span className="text-sm font-medium text-neutral-400 uppercase tracking-tight font-sans">Analysis</span>
                                <div className="flex items-center gap-2">
                                    <div className="w-24 h-2 bg-neutral-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${analysis?.accuracyScore || 0}%` }} />
                                    </div>
                                    <span className="text-sm font-bold text-indigo-600 font-sans">
                                        {analysis?.accuracyScore}%
                                    </span>
                                </div>
                            </div>

                            {analysis?.incorrectWords && analysis.incorrectWords.length > 0 ? (
                                <div className="flex-1 flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar">
                                    <div>
                                        <h4 className="text-neutral-500 text-xs uppercase tracking-tight mb-2 font-sans flex items-center gap-1"><Icon icon="solar:danger-triangle-linear" /> Needs Work</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {analysis.incorrectWords.map((word, i) => (
                                                <span key={i} className="text-lg tracking-tight text-rose-500 font-normal font-dm-sans bg-rose-50 px-3 py-1 rounded-lg border border-rose-100">
                                                    {word}
                                                    {analysis.phoneticBreakdown?.[word] && (
                                                        <span className="text-sm font-sans text-rose-400 ml-2">({analysis.phoneticBreakdown[word]})</span>
                                                    )}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {analysis.accentInfluence && (
                                        <div>
                                            <h4 className="text-neutral-500 text-xs uppercase tracking-tight mb-1 font-sans">Detected Accent</h4>
                                            <p className="text-sm font-medium text-[#111] font-sans p-3 bg-neutral-50 rounded-xl border border-neutral-100">{analysis.accentInfluence}</p>
                                        </div>
                                    )}

                                    {analysis.tips && analysis.tips.length > 0 && (
                                        <div className="bg-amber-50 rounded-2xl p-5 border border-amber-100/50 flex flex-col gap-3">
                                            <h4 className="text-amber-700 text-xs font-medium uppercase tracking-tight flex items-center gap-1.5 font-sans">
                                                <Icon icon="solar:lightbulb-linear" width="16" />
                                                Coaching Tips
                                            </h4>
                                            <ul className="text-sm text-amber-900 leading-relaxed font-sans space-y-2 list-disc pl-4">
                                                {analysis.tips.map((tip, i) => (
                                                    <li key={i}>{tip}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {analysis.suggestions && analysis.suggestions.length > 0 && (
                                        <div className="bg-indigo-50 rounded-2xl p-5 border border-indigo-100/50 flex flex-col gap-3">
                                            <h4 className="text-indigo-700 text-xs font-medium uppercase tracking-tight flex items-center gap-1.5 font-sans">
                                                <Icon icon="solar:magic-stick-3-linear" width="16" />
                                                Improvement Suggestions
                                            </h4>
                                            <ul className="text-sm text-indigo-900 leading-relaxed font-sans space-y-2 list-disc pl-4">
                                                {analysis.suggestions.map((sug, i) => (
                                                    <li key={i}>{sug}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center flex-1 gap-4 text-center">
                                    <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-2">
                                        <Icon icon="solar:check-circle-bold-duotone" width="48" className="text-emerald-500" />
                                    </div>
                                    <h3 className="text-2xl font-dm-sans text-[#111]">Perfect Pronunciation!</h3>
                                    <p className="text-sm text-neutral-500 font-sans max-w-[250px]">Your accent sounds extremely natural and all words were perfectly articulated.</p>

                                    {analysis?.accentInfluence && (
                                        <p className="text-sm font-medium text-[#111] font-sans p-3 bg-neutral-50 rounded-xl border border-neutral-100 mt-4">
                                            <span className="text-neutral-500 text-xs uppercase block mb-1">Detected Profile</span>
                                            {analysis.accentInfluence}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
};

export default Trainer;
