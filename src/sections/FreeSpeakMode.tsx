import { useState, useEffect, useRef, useCallback } from 'react';
import { Icon } from '@iconify/react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { analyzePronunciation } from '../services/pronunciationService';
import type { AnalysisResult } from '../services/pronunciationService';
import { geminiLiveService } from '../services/geminiLiveService';
import { useStore } from '../store/useStore';
import { speakText, stopSpeaking } from '../utils/tts';

interface FreeSpeakModeProps {
    initialMode?: 'standard' | 'live';
    hideToggle?: boolean;
    titleMode?: 'free-speak' | 'speech-analysis' | 'live-coach';
}

const META_COACH_PATTERNS = [
    /\b(evaluating|re-evaluated|refining|confirming|analyzing|analysis|strategizing|planning|preparing|noted|homing in on|focusing on|clarifying|crafting|intention|goal)\b/,
    /\b(the user|they are|their progress|performance in this area|another evaluation|positive reinforcement|lingering slight mispronunciation)\b/,
    /\b(i|i'm|i’ve|i have|my)\b/,
];

const USER_FACING_PATTERNS = [
    /\/[^/]+\/$/,
    /\b(you|your|try|repeat|focus|stress|sound|syllable|pronunciation|listen|say|word|practice|again|slowly|correct)\b/,
];

const sanitizeCoachChunk = (text: string) => {
    const normalized = text
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\s+/g, ' ')
        .trim();

    const sentences = normalized
        .split(/(?<=[.!?])\s+/)
        .map(sentence => sentence.trim())
        .filter(Boolean);

    const filtered = sentences.filter(sentence => {
        const lower = sentence.toLowerCase();

        if (/^(clarifying|evaluating|refining|confirming|focusing)\b/i.test(sentence)) {
            return false;
        }

        return !META_COACH_PATTERNS.some(pattern => pattern.test(lower));
    });

    const userFacing = filtered.filter(sentence =>
        USER_FACING_PATTERNS.some(pattern => pattern.test(sentence.toLowerCase()) || pattern.test(sentence))
    );

    const metaDetected = sentences.some(sentence =>
        META_COACH_PATTERNS.some(pattern => pattern.test(sentence.toLowerCase()))
        || /^(clarifying|evaluating|refining|confirming|focusing)\b/i.test(sentence)
    );

    const sanitized = (userFacing.length > 0 ? userFacing : metaDetected ? [] : filtered)
        .join(' ')
        .replace(/\s+([,.!?;:])/g, '$1')
        .trim();

    return sanitized;
};

const FreeSpeakMode = ({ initialMode = 'standard', hideToggle = false, titleMode = 'free-speak' }: FreeSpeakModeProps) => {
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
    const {
        transcript: liveTranscript,
        startRecording: startLiveTranscriptRecording,
        stopRecording: stopLiveTranscriptRecording,
    } = useSpeechRecognition({
        continuous: true,
        interimResults: false,
        lang: 'en-US',
    });

    const [coachMode, setCoachMode] = useState<'standard' | 'live'>(initialMode);
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
    const [liveUserTranscript, setLiveUserTranscript] = useState('');
    const [lastLiveTranscript, setLastLiveTranscript] = useState('');
    const audioContextRef = useRef<AudioContext | null>(null);
    const micContextRef = useRef<AudioContext | null>(null);
    const audioQueueRef = useRef<AudioBufferSourceNode[]>([]);
    const liveStreamRef = useRef<MediaStream | null>(null);
    const liveRecorderRef = useRef<ScriptProcessorNode | null>(null);
    const nextAudioTimeRef = useRef<number>(0);
    const liveRecordingRef = useRef(false);
    const coachAudioPlayingRef = useRef(false);

    const stopAudioPlayback = useCallback(() => {
        audioQueueRef.current.forEach(source => { try { source.stop(); } catch (e) { } });
        audioQueueRef.current = [];
        nextAudioTimeRef.current = 0;
        coachAudioPlayingRef.current = false;
        geminiLiveService.interrupt();
    }, []);

    // Gemini Live callbacks
    const currentCoachTurnIdRef = useRef<string | null>(null);

    useEffect(() => {
        geminiLiveService.onStatus = setLiveStatus;
        
        geminiLiveService.onTextResponse = (t) => {
            const sanitizedText = sanitizeCoachChunk(t);
            if (!sanitizedText) return;

            setLiveMessages(prev => {
                const last = prev[prev.length - 1];
                if (currentCoachTurnIdRef.current && last && last.id === currentCoachTurnIdRef.current) {
                    const updated = [...prev];
                    const nextCoachText = sanitizeCoachChunk(`${last.text} ${sanitizedText}`);
                    updated[updated.length - 1] = {
                        ...last,
                        text: nextCoachText,
                    };
                    return updated;
                } else {
                    const newId = crypto.randomUUID();
                    currentCoachTurnIdRef.current = newId;
                    return [...prev, { id: newId, role: 'coach', text: sanitizedText }];
                }
            });
        };

        geminiLiveService.onTurnComplete = () => {
            currentCoachTurnIdRef.current = null;
        };

        geminiLiveService.onAudioResponse = (base64Audio) => {
            try {
                coachAudioPlayingRef.current = true;

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
                    if (audioQueueRef.current.length === 0) {
                        coachAudioPlayingRef.current = false;
                    }
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
        if (transcript || interimTranscript) {
            const combined = (transcript + ' ' + (interimTranscript || '')).trim();
            setSpokenText(combined);
            if (coachMode === 'standard') setLiveUserTranscript(combined);
        }
    }, [transcript, interimTranscript, coachMode]);

    // Live AI Coach Analysis logic
    const [liveMessages, setLiveMessages] = useState<Array<{ id: string, role: 'user'|'coach', text: string, analysis?: AnalysisResult }>>([{
        id: 'welcome_msg',
        role: 'coach',
        text: "Hi there! I'm Nova, your AI pronunciation coach. Tap the microphone and say something, and we can start practicing together!"
    }]);

    useEffect(() => {
        if (coachMode !== 'live' || !liveTranscript.trim() || liveTranscript === lastLiveTranscript) {
            return;
        }

        const chunkText = liveTranscript.trim();
        const msgId = crypto.randomUUID();

        setLiveMessages(prev => [...prev, { id: msgId, role: 'user', text: chunkText }]);
        setLastLiveTranscript(liveTranscript);

        analyzePronunciation(chunkText, chunkText, accentStyle)
            .then(result => setLiveMessages(prev => prev.map(m => m.id === msgId ? { ...m, analysis: result } : m)))
            .catch(e => console.error(e));
    }, [accentStyle, coachMode, lastLiveTranscript, liveTranscript]);

    // Standard analysis on stop
    useEffect(() => {
        if (coachMode !== 'standard' || !transcript || isRecording) return;

        const analyze = async () => {
            setIsAnalyzing(true);
            setApiError(null);
            setRetryMsg(null);
            try {
                const result = await analyzePronunciation(transcript, transcript, accentStyle, (attempt) => {
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

                    // Speak feedback using TTS
                    let feedbackText = '';
                    if (result.accuracyScore >= 90) {
                        feedbackText = "Excellent pronunciation! You sounded very natural.";
                    } else if (result.incorrectWords && result.incorrectWords.length > 0) {
                        feedbackText = `Good effort! Let's practice the word ${result.incorrectWords[0]}.`;
                    } else if (result.tips && result.tips.length > 0) {
                        feedbackText = result.tips[0];
                    } else {
                        feedbackText = "Good job! Keep practicing.";
                    }

                    speakText({
                        text: feedbackText,
                        accentStyle,
                        rate: autismMode ? 0.8 : 1.0
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
        setLiveUserTranscript('');
        setAnalysis(null);
        setWordsPerMinute(null);
        setLastLiveTranscript('');
        if (newMode === 'live') {
            await geminiLiveService.startSession();
        } else {
            geminiLiveService.stopSession();
            stopAudioPlayback();
            stopLiveRecording();
            stopLiveTranscriptRecording();
        }
    };

    useEffect(() => {
        if (initialMode && initialMode !== coachMode) {
            handleModeSwitch(initialMode);
        }
    }, [initialMode]);

    const startLiveRecording = useCallback(async () => {
        stopAudioPlayback();

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
            liveRecordingRef.current = true;
            setLastLiveTranscript('');
            startLiveTranscriptRecording();

        } catch (e) {
            console.error('[FreeSpeakMode] Mic error:', e);
            setLiveRecording(false);
            liveRecordingRef.current = false;
        }
    }, [startLiveTranscriptRecording, stopAudioPlayback, accentStyle]);

    const stopLiveRecording = useCallback(() => {
        if (!liveRecording && !liveRecorderRef.current) return;
        setLiveRecording(false);
        liveRecordingRef.current = false;
        geminiLiveService.sendAudioStreamEnd();
        if (liveRecorderRef.current) {
            liveRecorderRef.current.disconnect();
            liveRecorderRef.current = null;
        }
        if (liveStreamRef.current) {
            liveStreamRef.current.getTracks().forEach(t => t.stop());
            liveStreamRef.current = null;
        }
        stopLiveTranscriptRecording();
    }, [liveRecording, stopLiveTranscriptRecording]);

    const toggleLiveRecording = useCallback(async () => {
        if (liveRecording) {
            stopLiveRecording();
        } else {
            if (liveStatus === 'Disconnected') await geminiLiveService.startSession();
            startLiveRecording();
        }
    }, [liveRecording, liveStatus, startLiveRecording, stopLiveRecording]);

    const handleStandardStart = () => {
        stopSpeaking();
        recordingStartRef.current = Date.now();
        startRecording();
    };

    // ─── Pace meter ──────────────────────────────────────────────
    const renderPaceMeter = () => {
        if (wordsPerMinute === null) return null;
        let paceColor = 'bg-emerald-500';
        let paceBg = 'bg-emerald-50';
        let paceText = 'text-emerald-700';
        const percent = Math.min((wordsPerMinute / 250) * 100, 100);

        if (wordsPerMinute < 100) {
            paceColor = 'bg-blue-500';
            paceBg = 'bg-blue-50';
            paceText = 'text-blue-700';
        } else if (wordsPerMinute > 160) {
            paceColor = 'bg-amber-500';
            paceBg = 'bg-amber-50';
            paceText = 'text-amber-700';
        }

        return (
            <div className={`p-4 rounded-2xl border border-neutral-100/50 ${paceBg} w-full max-w-sm`}>
                <div className="flex justify-between items-center mb-2">
                    <span className={`text-sm font-semibold uppercase tracking-wider font-sans ${paceText}`}>Speaking Pace</span>
                    <span className={`text-sm font-bold font-sans ${paceText}`}>{wordsPerMinute} WPM</span>
                </div>
                <div className="w-full h-2 bg-white/50 rounded-full overflow-hidden mb-1.5">
                    <div className={`h-full ${paceColor} rounded-full transition-all duration-700`} style={{ width: `${percent}%` }} />
                </div>
                <div className="flex justify-between text-[10px] text-neutral-400 uppercase font-sans font-medium">
                    <span>Slow</span>
                    <span className={wordsPerMinute >= 100 && wordsPerMinute <= 160 ? paceText : ''}>Optimal (100-160)</span>
                    <span>Fast</span>
                </div>
            </div>
        );
    };

    const renderPhoneticWithStress = (phonetic: string) => {
        return phonetic.split(/([A-Z]+)/).map((part, i) =>
            /[A-Z]/.test(part) ? <span key={i} className="font-bold tracking-wider">{part}</span> : <span key={i}>{part}</span>
        );
    };

    return (
        <div className={`flex flex-col ${coachMode === 'live' ? '' : 'lg:grid lg:grid-cols-12'} gap-8 lg:gap-10 items-start`}>
            {/* Left: Speaking area */}
            <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className={`w-full ${coachMode === 'live' ? '' : 'lg:col-span-7'}`}
            >
                <div className="bg-white rounded-[32px] p-8 sm:p-10 md:p-12 shadow-[0_12px_40px_rgb(0,0,0,0.06)] border border-neutral-100/80 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-80 h-80 bg-violet-50/80 rounded-full blur-3xl opacity-60 -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                    {/* Mode toggle */}
                    {!hideToggle && (
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
                    )}

                    {/* Prompt text */}
                    <div className="relative z-10 text-center mb-10">
                        <h2 className="text-[28px] md:text-[32px] font-dm-sans font-semibold text-[#111] tracking-tight mb-3">
                            {titleMode === 'live-coach' ? 'Talk to Your AI Coach' : titleMode === 'speech-analysis' ? 'Speech Analysis' : 'Speak Freely'}
                        </h2>
                        <p className="text-neutral-500 font-sans text-[15px] md:text-base max-w-lg mx-auto leading-relaxed">
                            {titleMode === 'live-coach'
                                ? 'Tap the mic to start a conversational practice session with your AI speaking coach.'
                                : autismMode
                                    ? 'Press and hold the microphone. Say anything you like. I will give you friendly feedback.'
                                    : titleMode === 'speech-analysis'
                                        ? 'Record a phrase and receive detailed pronunciation feedback.'
                                        : 'Hold the microphone and say anything. AI will analyze your pronunciation, fluency, and pace.'}
                        </p>
                    </div>

                    {/* Live transcript sections */}
                    {coachMode === 'live' ? (
                        <div className="relative z-10 mb-6 flex flex-col gap-6 w-full">
                            <div className="flex-1 overflow-y-auto p-2 sm:p-4 flex flex-col gap-6 max-h-[400px]">
                                {liveMessages.map((msg) => {
                                    if (msg.role === 'coach') {
                                        const coachText = sanitizeCoachChunk(msg.text);
                                        if (!coachText) return null;

                                        return (
                                            <div key={msg.id} className="flex gap-3 sm:gap-4 max-w-[90%] sm:max-w-[85%]">
                                                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center mt-1 flex-shrink-0">
                                                    <Icon icon="solar:stars-bold-duotone" width="16" className="text-indigo-600" />
                                                </div>
                                                <div className="bg-white border border-neutral-200 rounded-2xl rounded-tl-sm p-3 sm:p-4 shadow-sm">
                                                    <p className="text-sm sm:text-base font-sans text-neutral-800 leading-relaxed" style={{ wordWrap: 'break-word', overflowWrap: 'break-word' }}>
                                                        {coachText}
                                                    </p>
                                                    <span className="text-xs text-neutral-400 mt-2 block font-sans">
                                                        Just now
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    } else {
                                        return (
                                            <div key={msg.id} className="flex gap-3 sm:gap-4 max-w-[90%] sm:max-w-[85%] self-end flex-row-reverse">
                                                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center mt-1 flex-shrink-0">
                                                    <span className="text-indigo-700 font-bold text-xs font-sans uppercase">You</span>
                                                </div>
                                                <div className="bg-indigo-600 rounded-2xl rounded-tr-sm p-3 sm:p-4 shadow-sm text-left">
                                                    {msg.analysis ? (
                                                        <p className="text-sm sm:text-base font-sans leading-relaxed text-white" style={{ wordWrap: 'break-word', overflowWrap: 'break-word' }}>
                                                            {msg.text.split(/\s+/).map((word, i) => {
                                                                const clean = word.toLowerCase().replace(/[.,!?;:'"]/g, '');
                                                                const isIncorrect = msg.analysis!.incorrectWords.map(w=>w.toLowerCase()).includes(clean);
                                                                const isUnclear = msg.analysis!.unclearWords?.map(w=>w.toLowerCase()).includes(clean);
                                                                
                                                                let colorClass = "text-white";
                                                                if(isIncorrect) colorClass = "bg-rose-500 text-white px-1 rounded-sm border-b-2 border-rose-300 font-bold";
                                                                else if(isUnclear) colorClass = "bg-amber-500 text-white px-1 rounded-sm border-b-2 border-amber-300 font-bold";
                                                                return <span key={i} className={`${colorClass} mr-1 inline-block`}>{word}</span>;
                                                            })}
                                                        </p>
                                                    ) : (
                                                        <p className="text-sm sm:text-base font-sans text-white leading-relaxed" style={{ wordWrap: 'break-word', overflowWrap: 'break-word' }}>
                                                            {msg.text.trim()}
                                                        </p>
                                                    )}
                                                    <div className="flex items-center justify-end gap-1 mt-2">
                                                        <span className="text-xs text-indigo-200 font-sans">Just now</span>
                                                        <Icon icon="solar:check-read-linear" className="w-4 h-4 text-indigo-200" />
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }
                                })}
                            </div>
                        </div>
                    ) : (
                        (spokenText || liveUserTranscript) && (
                            <div className="relative z-10 mb-6 space-y-3">
                                {/* You said */}
                                <div className="bg-neutral-50 rounded-2xl p-4 sm:p-5 border border-neutral-100">
                                    <h4 className="text-xs text-neutral-400 uppercase tracking-wider font-bold mb-2 flex items-center gap-1.5">
                                        <Icon icon="solar:user-speak-linear" width="14" />
                                        You said:
                                    </h4>
                                    <p className="text-base font-sans text-[#111] leading-relaxed" style={{ wordWrap: 'break-word', overflowWrap: 'break-word' }}>
                                        "{spokenText}"
                                    </p>
                                </div>

                                {/* Suggested corrections (Standard mode) */}
                                {analysis?.suggestions && analysis.suggestions.length > 0 && (
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
                        )
                    )}

                    {/* Pace meter */}
                    {wordsPerMinute !== null && (
                        <div className="relative z-10 mb-6 flex justify-center">
                            {renderPaceMeter()}
                        </div>
                    )}

                    {/* Mic controls */}
                    <div className="relative z-10 flex justify-center items-center gap-6 mt-8">
                        {coachMode === 'live' && (
                            <>
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={stopAudioPlayback}
                                    className="w-14 h-14 flex items-center justify-center rounded-full bg-neutral-100/80 text-neutral-600 hover:bg-neutral-200 hover:text-[#111] transition-colors"
                                    title="Stop AI playback"
                                >
                                    <Icon icon="solar:stop-circle-linear" width="24" />
                                </motion.button>
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={toggleLiveRecording}
                                    className={`w-20 h-20 sm:w-[88px] sm:h-[88px] flex items-center justify-center rounded-full text-white shadow-[0_8px_32px_rgba(99,102,241,0.25)] transition-colors hover:shadow-[0_12px_40px_rgba(99,102,241,0.35)] touch-none select-none relative ${liveRecording ? 'bg-rose-500' : 'bg-gradient-to-br from-indigo-500 to-indigo-700'}`}
                                    aria-label={liveRecording ? 'Stop speaking' : 'Start speaking'}
                                >
                                    {liveRecording && <div className="absolute inset-0 rounded-full animate-ping bg-rose-400 opacity-40"></div>}
                                    <Icon icon={liveRecording ? 'solar:stop-bold' : 'solar:microphone-2-bold'} width="36" className="relative z-10" />
                                </motion.button>
                            </>
                        )}
                        {coachMode === 'standard' && (
                            <>
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => { stopSpeaking(); if (audioUrl) { const a = new Audio(audioUrl); a.play().catch(console.error); } }}
                                    className="w-14 h-14 flex items-center justify-center rounded-full bg-neutral-100/80 text-neutral-600 hover:bg-neutral-200 hover:text-[#111] transition-colors disabled:opacity-50 disabled:pointer-events-none"
                                    title="Replay recording"
                                    disabled={!audioUrl}
                                >
                                    <Icon icon="solar:play-linear" width="24" />
                                </motion.button>
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onMouseDown={handleStandardStart}
                                    onMouseUp={stopRecording}
                                    onMouseLeave={isRecording ? stopRecording : undefined}
                                    onTouchStart={(e) => { e.preventDefault(); handleStandardStart(); }}
                                    onTouchEnd={(e) => { e.preventDefault(); stopRecording(); }}
                                    className={`w-20 h-20 sm:w-[88px] sm:h-[88px] flex items-center justify-center rounded-full text-white shadow-[0_8px_32px_rgba(99,102,241,0.25)] transition-colors hover:shadow-[0_12px_40px_rgba(99,102,241,0.35)] duration-200 touch-none select-none relative ${isRecording ? 'bg-rose-500' : 'bg-gradient-to-br from-indigo-500 to-indigo-700'}`}
                                    disabled={isAnalyzing || !isSupported}
                                    aria-label="Hold to speak"
                                >
                                    {isRecording && <div className="absolute inset-0 rounded-full animate-ping bg-rose-400 opacity-40"></div>}
                                    <Icon icon={isRecording ? 'solar:microphone-2-bold' : 'solar:microphone-2-bold'} width="36" className="relative z-10" />
                                </motion.button>
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
            </motion.div>

            {/* Right: Analysis panel */}
            {coachMode !== 'live' && (
            <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.1, ease: 'easeOut' }}
                className="w-full lg:col-span-5"
            >
                    <AnimatePresence mode="wait">
                        {!analysis && !isAnalyzing ? (
                            <motion.div 
                                key="idle" 
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
                                className="bg-white rounded-[32px] p-8 shadow-[0_12px_40px_rgb(0,0,0,0.06)] border border-neutral-100/80 flex flex-col items-center justify-center min-h-[400px] text-center gap-4"
                            >
                                <div className="w-20 h-20 bg-violet-50/80 rounded-full flex items-center justify-center">
                                    <Icon icon="solar:soundwave-circle-linear" width="40" className="text-violet-500" />
                                </div>
                                <div className="mt-2">
                                    <h3 className="font-dm-sans text-[22px] font-semibold text-[#111] mb-2">Free Speaking Feedback</h3>
                                    <p className="text-neutral-500 font-sans text-[15px] max-w-[280px] leading-relaxed mx-auto">
                                        Speak naturally and the AI will analyze your pronunciation, accent patterns, and fluency.
                                    </p>
                                </div>
                            </motion.div>
                        ) : isAnalyzing ? (
                            <motion.div 
                                key="analyzing" 
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
                                className="bg-white rounded-[32px] p-8 shadow-[0_12px_40px_rgb(0,0,0,0.06)] border border-neutral-100/80 flex flex-col items-center justify-center min-h-[400px] text-center gap-4"
                            >
                                <Icon icon="line-md:loading-twotone-loop" width="56" className="text-indigo-500" />
                                <h3 className="font-dm-sans text-xl font-semibold text-[#111]">Analyzing Speech</h3>
                                <p className="text-neutral-500 font-sans text-[15px] max-w-[250px]">Processing pronunciation...</p>
                            </motion.div>
                        ) : (
                            <motion.div 
                                key="results" 
                                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}
                                className="bg-white rounded-[32px] p-6 sm:p-8 md:p-10 shadow-[0_12px_40px_rgb(0,0,0,0.06)] border border-neutral-100/80 flex flex-col gap-6"
                            >
                                <div className="flex items-center gap-3 pb-4 border-b border-neutral-100/80">
                                    <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center shadow-md">
                                        <Icon icon="solar:chat-round-dots-bold" width="20" className="text-white" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[17px] font-semibold text-[#111] font-sans">Nova — your AI pronunciation coach</span>
                                        <span className="text-xs text-neutral-500 font-sans font-medium uppercase tracking-wider">Analysis Results</span>
                                    </div>
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
                                                    {analysis.phoneticBreakdown?.[word] && <span className="text-xs text-rose-400 ml-1.5">({renderPhoneticWithStress(analysis.phoneticBreakdown[word])})</span>}
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
                                    <div className="flex flex-col items-center justify-center gap-3 text-center py-4 border-t border-neutral-100 pt-6">
                                        <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center">
                                            <Icon icon="solar:check-circle-bold-duotone" width="40" className="text-emerald-500" />
                                        </div>
                                        <h3 className="text-xl font-dm-sans text-[#111]">
                                            {autismMode ? 'You spoke wonderfully!' : 'Great Speaking!'}
                                        </h3>
                                    </div>
                                )}

                                {/* Replay & Compare for FreeSpeak */}
                                {analysis && analysis.accuracyScore > 0 && audioUrl && (
                                    <div className="bg-neutral-50 rounded-2xl p-4 sm:p-5 border border-neutral-100/50 mt-2">
                                        <h4 className="text-neutral-700 text-xs font-medium uppercase tracking-tight flex items-center gap-1.5 font-sans mb-3 text-center justify-center">
                                            <Icon icon="solar:headphones-round-sound-linear" width="16" /> Compare Audio
                                        </h4>
                                        <div className="flex justify-center gap-4">
                                            <motion.button
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={() => { stopSpeaking(); const a = new Audio(audioUrl); a.play().catch(console.error); }}
                                                className="w-12 h-12 flex items-center justify-center rounded-full bg-white text-indigo-600 hover:bg-indigo-50 transition-colors shadow-sm"
                                                title="Replay Your Audio"
                                            >
                                                <Icon icon="solar:user-speak-linear" width="22" />
                                            </motion.button>
                                            <motion.button
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={() => {
                                                    stopSpeaking();
                                                    speakText({
                                                        text: transcript || "",
                                                        accentStyle,
                                                        rate: autismMode ? 0.8 : 1.0
                                                    });
                                                }}
                                                className="w-12 h-12 flex items-center justify-center rounded-full bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-[0_4px_12px_rgba(79,70,229,0.2)]"
                                                title="Listen to Native Speaker"
                                            >
                                                <Icon icon="solar:headphones-round-sound-bold" width="22" />
                                            </motion.button>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
            </motion.div>
            )}
        </div>
    );
};

export default FreeSpeakMode;
