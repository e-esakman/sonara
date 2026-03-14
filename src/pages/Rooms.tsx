import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import type { Socket } from 'socket.io-client';
import { useStore } from '../store/useStore';
import {
    base64ToBlob,
    blobToBase64,
    type ClientTranscriptPayload,
    copyToClipboard,
    createConversationRoomSocket,
    pcmFloat32ToBase64,
    type AIFeedback,
    type InviteRoomCreatedPayload,
    type LiveTranscriptPayload,
    type RoomReadyPayload,
    type TranscriptEntry,
    type UserConnectedPayload,
    type UserPresencePayload,
} from '../services/liveConversationRoom';

type CallState = 'idle' | 'waiting' | 'connected';
type ToastState = {
    id: string;
    title: string;
    message: string;
    tone: 'default' | 'success' | 'warning';
};

const relayMimeType = (() => {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        return 'audio/webm;codecs=opus';
    }
    return 'audio/webm';
})();

const waveformBars = [0, 1, 2, 3, 4];

type BrowserSpeechRecognition = {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    start: () => void;
    stop: () => void;
    abort: () => void;
    onresult: ((event: {
        resultIndex: number;
        results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
    }) => void) | null;
    onerror: ((event: { error: string }) => void) | null;
    onend: (() => void) | null;
};

const Rooms = () => {
    const { user } = useStore();
    const [callState, setCallState] = useState<CallState>('idle');
    const [callStatus, setCallStatus] = useState('Invite someone to start a conversation');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [roomId, setRoomId] = useState<string | null>(null);
    const [inviteUrl, setInviteUrl] = useState('');
    const [userRole, setUserRole] = useState<'userA' | 'userB'>('userA');
    const [selfLabel, setSelfLabel] = useState(user?.name || 'You');
    const [partnerLabel, setPartnerLabel] = useState('Waiting for another speaker');
    const [isSocketConnected, setIsSocketConnected] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isMicActive, setIsMicActive] = useState(false);
    const [selfLevel, setSelfLevel] = useState(0);
    const [partnerLevel, setPartnerLevel] = useState(0);
    const [isAISpeaking, setIsAISpeaking] = useState(false);
    const [liveTranscript, setLiveTranscript] = useState<LiveTranscriptPayload | null>(null);
    const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
    const [feedbackItems, setFeedbackItems] = useState<AIFeedback[]>([]);
    const [toast, setToast] = useState<ToastState | null>(null);
    const [copyToast, setCopyToast] = useState(false);

    const socketRef = useRef<Socket | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const relayRecorderRef = useRef<MediaRecorder | null>(null);
    const micContextRef = useRef<AudioContext | null>(null);
    const pcmProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const micSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const partnerAudioQueueRef = useRef<Array<{ audio: string; mimeType: string }>>([]);
    const isPlayingPartnerAudioRef = useRef(false);
    const isMutedRef = useRef(false);
    const isRoomActiveRef = useRef(false);
    const isMicActiveRef = useRef(false);
    const userRoleRef = useRef<'userA' | 'userB'>('userA');
    const inviteJoinAttemptedRef = useRef(false);
    const pendingStartCallRef = useRef(false);
    const speechVoicesRef = useRef<SpeechSynthesisVoice[]>([]);
    const toastTimerRef = useRef<number | null>(null);
    const copyToastTimerRef = useRef<number | null>(null);
    const partnerLevelTimerRef = useRef<number | null>(null);
    const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
    const recognitionStoppedRef = useRef(false);

    useEffect(() => {
        isMutedRef.current = isMuted;
    }, [isMuted]);

    useEffect(() => {
        isMicActiveRef.current = isMicActive;
    }, [isMicActive]);

    useEffect(() => {
        userRoleRef.current = userRole;
    }, [userRole]);

    useEffect(() => {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            const updateVoices = () => {
                speechVoicesRef.current = window.speechSynthesis.getVoices();
            };
            updateVoices();
            window.speechSynthesis.addEventListener('voiceschanged', updateVoices);
            return () => {
                window.speechSynthesis.removeEventListener('voiceschanged', updateVoices);
            };
        }
        return undefined;
    }, []);

    const showToast = (title: string, message: string, tone: ToastState['tone'] = 'default') => {
        setToast({
            id: crypto.randomUUID(),
            title,
            message,
            tone,
        });
        if (toastTimerRef.current) {
            window.clearTimeout(toastTimerRef.current);
        }
        toastTimerRef.current = window.setTimeout(() => {
            setToast(null);
        }, 3000);
    };

    const pickVoice = (voices: SpeechSynthesisVoice[]) =>
        voices.find((voice) => /english/i.test(voice.lang) && /female|samantha|victoria|serena|aria|ava|allison/i.test(voice.name))
        ?? voices.find((voice) => /english/i.test(voice.lang))
        ?? voices[0]
        ?? null;

    const speakFeedback = (feedback: AIFeedback) => {
        if (typeof window === 'undefined' || !('speechSynthesis' in window) || !feedback.speechText.trim()) {
            return;
        }

        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(feedback.speechText);
        const voice = pickVoice(speechVoicesRef.current);
        if (voice) {
            utterance.voice = voice;
        }
        utterance.rate = 1;
        utterance.pitch = 1;
        utterance.onstart = () => setIsAISpeaking(true);
        utterance.onend = () => setIsAISpeaking(false);
        utterance.onerror = () => setIsAISpeaking(false);
        window.speechSynthesis.speak(utterance);
    };

    const playNextPartnerChunk = async () => {
        if (isPlayingPartnerAudioRef.current) {
            return;
        }

        const nextChunk = partnerAudioQueueRef.current.shift();
        if (!nextChunk) {
            return;
        }

        isPlayingPartnerAudioRef.current = true;
        const blob = base64ToBlob(nextChunk.audio, nextChunk.mimeType);
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);

        const finish = () => {
            URL.revokeObjectURL(url);
            isPlayingPartnerAudioRef.current = false;
            if (partnerAudioQueueRef.current.length === 0) {
                setPartnerLevel(0);
            }
            void playNextPartnerChunk();
        };

        audio.onended = finish;
        audio.onerror = finish;

        try {
            await audio.play();
        } catch {
            finish();
        }
    };

    const stopTranscriptRecognition = () => {
        recognitionStoppedRef.current = true;
        recognitionRef.current?.stop();
    };

    const startTranscriptRecognition = () => {
        const recognitionWindow = window as Window & {
            SpeechRecognition?: new () => BrowserSpeechRecognition;
            webkitSpeechRecognition?: new () => BrowserSpeechRecognition;
        };
        const SpeechRecognitionCtor = recognitionWindow.SpeechRecognition || recognitionWindow.webkitSpeechRecognition;
        if (!SpeechRecognitionCtor || !socketRef.current) {
            return;
        }

        if (!recognitionRef.current) {
            const recognition = new SpeechRecognitionCtor();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'en-US';

            recognition.onresult = (event: {
                resultIndex: number;
                results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
            }) => {
                let interimTranscript = '';

                for (let i = event.resultIndex; i < event.results.length; i += 1) {
                    const transcript = event.results[i]?.[0]?.transcript?.trim();
                    if (!transcript) {
                        continue;
                    }

                    if (event.results[i].isFinal) {
                        socketRef.current?.emit('client-final-transcript', { transcript } satisfies ClientTranscriptPayload);
                    } else {
                        interimTranscript = transcript;
                    }
                }

                if (interimTranscript) {
                    socketRef.current?.emit('client-live-transcript', { transcript: interimTranscript } satisfies ClientTranscriptPayload);
                }
            };

            recognition.onerror = (event: { error: string }) => {
                if (event.error !== 'no-speech' && event.error !== 'aborted') {
                    setErrorMessage(`Speech recognition error: ${event.error}`);
                }
            };

            recognition.onend = () => {
                if (recognitionStoppedRef.current) {
                    recognitionStoppedRef.current = false;
                    return;
                }

                if (isRoomActiveRef.current && isMicActiveRef.current) {
                    try {
                        recognition.start();
                    } catch {
                        // intentionally ignored
                    }
                }
            };

            recognitionRef.current = recognition;
        }

        recognitionStoppedRef.current = false;
        try {
            recognitionRef.current?.start();
        } catch {
            // intentionally ignored
        }
    };

    const stopSpeaking = () => {
        socketRef.current?.emit('audio-stream-end');
        stopTranscriptRecognition();

        if (relayRecorderRef.current && relayRecorderRef.current.state !== 'inactive') {
            relayRecorderRef.current.stop();
        }
        relayRecorderRef.current = null;

        if (pcmProcessorRef.current) {
            pcmProcessorRef.current.disconnect();
            pcmProcessorRef.current.onaudioprocess = null;
            pcmProcessorRef.current = null;
        }

        if (micSourceRef.current) {
            micSourceRef.current.disconnect();
            micSourceRef.current = null;
        }

        setIsMicActive(false);
        setSelfLevel(0);
    };

    useEffect(() => {
        const socket = createConversationRoomSocket();
        socketRef.current = socket;

        socket.on('connect', () => {
            setIsSocketConnected(true);
            setErrorMessage(null);

            if (pendingStartCallRef.current) {
                pendingStartCallRef.current = false;
                socket.emit('start-call', { name: user?.name || 'Host' });
            }

            const roomParam = new URLSearchParams(window.location.search).get('room');
            if (roomParam && !inviteJoinAttemptedRef.current) {
                inviteJoinAttemptedRef.current = true;
                socket.emit('join-room', { roomId: roomParam, name: user?.name || 'Guest' });
            }
        });

        socket.on('disconnect', () => {
            setIsSocketConnected(false);
        });

        socket.on('connect_error', () => {
            setIsSocketConnected(false);
            setErrorMessage('Unable to reach the room server on port 3000.');
        });

        socket.on('invite-room-created', (payload: InviteRoomCreatedPayload) => {
            setRoomId(payload.roomId);
            setInviteUrl(payload.shareUrl);
            setUserRole(payload.role);
            setSelfLabel(payload.selfLabel);
            setPartnerLabel('Waiting for another speaker');
            setCallState('waiting');
            setCallStatus('Waiting for another speaker...');
            isRoomActiveRef.current = true;
        });

        socket.on('room-ready', (payload: RoomReadyPayload) => {
            setRoomId(payload.roomId);
            setUserRole(payload.role);
            setSelfLabel(payload.selfLabel);
            setPartnerLevel(0);
            setPartnerLabel(payload.partnerLabel === 'Waiting for join' ? 'Waiting for another speaker' : payload.partnerLabel);
            setCallState(payload.partnerLabel === 'Waiting for join' ? 'waiting' : 'connected');
            setCallStatus(payload.partnerLabel === 'Waiting for join' ? 'Waiting for another speaker...' : 'Speaker connected');
            isRoomActiveRef.current = true;
        });

        socket.on('user-joined', (payload: UserPresencePayload) => {
            const partner = payload.participants.find((participant) => participant.role !== userRoleRef.current);
            if (partner) {
                setPartnerLabel(partner.label);
                setCallState('connected');
                setCallStatus('Speaker connected');
            }
        });

        socket.on('user-connected', (payload: UserConnectedPayload) => {
            setCallState('connected');
            showToast(payload.title, payload.message, 'success');
        });

        socket.on('room-full', ({ message }: { message: string }) => {
            setErrorMessage(message);
            showToast('Room full', message, 'warning');
        });

        socket.on('room-error', ({ message }: { message: string }) => {
            setErrorMessage(message);
        });

        socket.on('room-ended', ({ message }: { message: string }) => {
            setPartnerLabel('Waiting for another speaker');
            setCallState('waiting');
            setCallStatus('Waiting for another speaker...');
            setLiveTranscript(null);
            isRoomActiveRef.current = false;
            setPartnerLevel(0);
            stopSpeaking();
            showToast('Partner left', message || 'Your partner left the conversation', 'warning');
        });

        socket.on('live-transcript', (payload: LiveTranscriptPayload) => {
            if (payload.isFinal) {
                setLiveTranscript(null);
                return;
            }
            setLiveTranscript(payload);
        });

        socket.on('transcript-entry', (entry: TranscriptEntry) => {
            setTranscripts((current) => [entry, ...current].slice(0, 30));
        });

        socket.on('ai-feedback', (feedback: AIFeedback) => {
            setFeedbackItems((current) => [feedback, ...current].slice(0, 10));
            speakFeedback(feedback);
        });

        socket.on('partner-audio', ({ audio, mimeType }: { audio: string; mimeType: string }) => {
            partnerAudioQueueRef.current.push({ audio, mimeType });
            setPartnerLevel(0.88);
            if (partnerLevelTimerRef.current) {
                window.clearTimeout(partnerLevelTimerRef.current);
            }
            partnerLevelTimerRef.current = window.setTimeout(() => {
                setPartnerLevel(0.18);
            }, 380);
            void playNextPartnerChunk();
        });

        return () => {
            if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
            if (copyToastTimerRef.current) window.clearTimeout(copyToastTimerRef.current);
            if (partnerLevelTimerRef.current) window.clearTimeout(partnerLevelTimerRef.current);
            window.speechSynthesis?.cancel();
            recognitionRef.current?.abort();
            stopSpeaking();
            mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
            socket.disconnect();
        };
    }, [user?.name]);

    const ensureMicrophone = async () => {
        if (mediaStreamRef.current) {
            return mediaStreamRef.current;
        }

        const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                sampleRate: 16000,
                channelCount: 1,
                echoCancellation: true,
                noiseSuppression: true,
            },
        });
        mediaStreamRef.current = stream;
        return stream;
    };

    const startSpeaking = async () => {
        if (!roomId || !socketRef.current) {
            setErrorMessage('Start a call or join a room before speaking.');
            return;
        }

        const stream = await ensureMicrophone();
        const socket = socketRef.current;

        if (!micContextRef.current) {
            const AudioContextCtor = window.AudioContext || (window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
            if (!AudioContextCtor) {
                throw new Error('AudioContext is not supported in this browser.');
            }
            micContextRef.current = new AudioContextCtor({ sampleRate: 16000 });
        }

        const micContext = micContextRef.current;
        const source = micContext.createMediaStreamSource(stream);
        const processor = micContext.createScriptProcessor(4096, 1, 1);
        source.connect(processor);
        processor.connect(micContext.destination);
        micSourceRef.current = source;
        pcmProcessorRef.current = processor;

        processor.onaudioprocess = (event) => {
            const outputData = event.outputBuffer.getChannelData(0);
            outputData.fill(0);

            const inputData = event.inputBuffer.getChannelData(0);
            let sum = 0;
            for (let i = 0; i < inputData.length; i += 1) {
                sum += inputData[i] * inputData[i];
            }

            const rms = Math.sqrt(sum / inputData.length);
            const normalized = Math.min(1, rms * 8);
            setSelfLevel(normalized);

            if (isMutedRef.current || !isRoomActiveRef.current) {
                return;
            }

            socket.emit('audio-stream', {
                pcmData: pcmFloat32ToBase64(inputData),
                pcmMimeType: 'audio/pcm;rate=16000',
            });
        };

        const relayRecorder = new MediaRecorder(stream, { mimeType: relayMimeType });
        relayRecorder.ondataavailable = async (event) => {
            if (!event.data.size || isMutedRef.current || !isRoomActiveRef.current) {
                return;
            }

            const mediaData = await blobToBase64(event.data);
            socket.emit('audio-stream', {
                mediaData,
                mediaMimeType: event.data.type || relayMimeType,
            });
        };

        relayRecorder.onstop = () => {
            setIsMicActive(false);
            setSelfLevel(0);
        };

        relayRecorder.start(250);
        relayRecorderRef.current = relayRecorder;
        setIsMicActive(true);
        startTranscriptRecognition();
    };

    const handleStartCall = () => {
        const socket = socketRef.current;
        if (!socket) {
            return;
        }

        setErrorMessage(null);
        setTranscripts([]);
        setFeedbackItems([]);
        setLiveTranscript(null);
        setCopyToast(false);

        if (!isSocketConnected) {
            pendingStartCallRef.current = true;
            socket.connect();
            return;
        }

        socket.emit('start-call', { name: user?.name || 'Host' });
    };

    const handleCopyInvite = async () => {
        if (!inviteUrl) {
            return;
        }

        try {
            await copyToClipboard(inviteUrl);
            setCopyToast(true);
            if (copyToastTimerRef.current) {
                window.clearTimeout(copyToastTimerRef.current);
            }
            copyToastTimerRef.current = window.setTimeout(() => {
                setCopyToast(false);
            }, 2000);
        } catch {
            setErrorMessage('Could not copy invite link.');
        }
    };

    const toggleMicrophone = async () => {
        if (!roomId) {
            return;
        }

        if (isMicActive) {
            stopSpeaking();
            return;
        }

        setErrorMessage(null);
        await startSpeaking();
    };

    const leaveRoom = () => {
        stopSpeaking();
        socketRef.current?.emit('leave-room');
        setRoomId(null);
        setInviteUrl('');
        setCallState('idle');
        setCallStatus('Invite someone to start a conversation');
        setPartnerLabel('Waiting for another speaker');
        setLiveTranscript(null);
        setTranscripts([]);
        setFeedbackItems([]);
        isRoomActiveRef.current = false;
    };

    const auraLevel = useMemo(() => {
        if (isAISpeaking) return 0.72;
        if (partnerLevel > 0.12) return partnerLevel;
        if (selfLevel > 0.12 && isMicActive && !isMuted) return selfLevel;
        return callState === 'connected' ? 0.22 : 0.12;
    }, [callState, isAISpeaking, isMicActive, isMuted, partnerLevel, selfLevel]);

    const speakerStatus = useMemo(() => {
        if (isAISpeaking) return 'AI coaching';
        if (partnerLevel > 0.22) return 'Partner speaking';
        if (selfLevel > 0.18 && isMicActive && !isMuted) return 'You are speaking';
        return 'Listening';
    }, [isAISpeaking, partnerLevel, selfLevel, isMicActive, isMuted]);

    const helperMessage = callState === 'idle'
        ? 'Invite someone to start a conversation'
        : callState === 'waiting'
            ? 'Waiting for another speaker...'
            : '';

    const feedbackTone = feedbackItems[0]?.severity === 'red'
        ? 'text-rose-600'
        : feedbackItems[0]?.severity === 'yellow'
            ? 'text-amber-600'
            : 'text-emerald-600';

    const toastTone = toast?.tone === 'success'
        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
        : toast?.tone === 'warning'
            ? 'border-amber-200 bg-amber-50 text-amber-700'
            : 'border-slate-200 bg-white text-slate-700';

    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,#f7fafc,transparent_30%),linear-gradient(180deg,#f6f4ef_0%,#eef3f8_100%)] px-4 pb-8 pt-24 text-slate-900 md:px-8">
            <div className="mx-auto w-full max-w-6xl rounded-[34px] border border-white/70 bg-white/82 shadow-[0_28px_120px_rgba(15,23,42,0.10)] backdrop-blur">
                <div className="px-5 pb-10 pt-6 md:px-10 md:pt-8">
                    <div className="mb-6 flex items-center justify-between gap-4">
                        <div>
                            <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Sonara Live</p>
                            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Voice room</h1>
                            <p className="mt-2 text-sm text-slate-500">{callStatus}</p>
                        </div>
                        {roomId && (
                            <button
                                onClick={leaveRoom}
                                className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 transition hover:border-rose-300 hover:bg-rose-100"
                            >
                                Leave
                            </button>
                        )}
                    </div>

                    <div className="mb-6 rounded-[26px] border border-slate-200/80 bg-white/90 px-4 py-4 shadow-sm md:px-5">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center">
                            <div className="min-w-0 flex-1">
                                <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Room Link</p>
                                <p className="mt-2 truncate text-sm text-slate-600">
                                    {inviteUrl || 'Create a room to get your invite link'}
                                </p>
                                <p className="mt-1 text-xs text-slate-400">Share this link with a friend to start speaking</p>
                            </div>
                            <div className="flex gap-2">
                                {!roomId && (
                                    <button
                                        onClick={handleStartCall}
                                        className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                                    >
                                        Start Call
                                    </button>
                                )}
                                <button
                                    onClick={() => void handleCopyInvite()}
                                    disabled={!inviteUrl}
                                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:text-slate-300"
                                >
                                    Copy Link
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="relative flex min-h-[60vh] flex-col items-center justify-center overflow-hidden rounded-[30px] bg-[radial-gradient(circle_at_top,rgba(103,232,249,0.20),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.95),rgba(241,245,249,0.88))] px-4 py-10 text-center">
                        {toast && (
                            <div className={`absolute top-5 z-20 rounded-2xl border px-4 py-3 text-left shadow-lg transition-all duration-300 ${toastTone}`}>
                                <p className="text-sm font-semibold">{toast.title}</p>
                                <p className="text-sm">{toast.message}</p>
                            </div>
                        )}

                        {copyToast && (
                            <div className="absolute top-5 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-lg">
                                Invite link copied
                            </div>
                        )}

                        <div className="absolute inset-0 opacity-70">
                            <div className="absolute left-1/2 top-[18%] h-56 w-56 -translate-x-1/2 rounded-full bg-cyan-100/70 blur-3xl animate-pulse" />
                            <div className="absolute bottom-[10%] left-[18%] h-40 w-40 rounded-full bg-amber-100/50 blur-3xl" />
                            <div className="absolute right-[16%] top-[24%] h-44 w-44 rounded-full bg-sky-100/60 blur-3xl" />
                        </div>

                        <div className="relative z-10 flex flex-col items-center">
                            <div className="mb-5 flex items-center gap-6 text-sm text-slate-500">
                                <div className={`rounded-full border px-3 py-1.5 transition ${
                                    callState === 'connected'
                                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                        : 'border-slate-200 bg-white text-slate-500'
                                }`}>
                                    {selfLabel}
                                </div>
                                <div className="h-px w-14 bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
                                <div className={`rounded-full border px-3 py-1.5 transition ${
                                    callState === 'connected'
                                        ? 'border-cyan-200 bg-cyan-50 text-cyan-700'
                                        : 'border-slate-200 bg-white text-slate-500'
                                }`}>
                                    {partnerLabel}
                                </div>
                            </div>

                            <button
                                onClick={() => void toggleMicrophone()}
                                disabled={!roomId}
                                className="group relative h-[260px] w-[260px] rounded-full disabled:cursor-default"
                            >
                                <span
                                    className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(34,211,238,0.45),rgba(56,189,248,0.18)_42%,transparent_72%)] animate-[aura-breathe_2.2s_ease-in-out_infinite]"
                                    style={{ transform: `scale(${1 + auraLevel * 0.18})` }}
                                />
                                <span
                                    className="absolute inset-[10%] rounded-full bg-[radial-gradient(circle,rgba(125,211,252,0.42),rgba(56,189,248,0.14)_60%,transparent_75%)] transition duration-150"
                                    style={{ transform: `scale(${1 + auraLevel * 0.12})` }}
                                />
                                <span className="absolute inset-0 flex items-center justify-center">
                                    <Icon
                                        icon={isMuted ? 'lucide:mic-off' : 'lucide:mic'}
                                        className={`h-14 w-14 transition ${
                                            isMuted ? 'text-rose-500' : 'text-slate-800'
                                        } ${roomId ? 'opacity-100' : 'opacity-50'}`}
                                    />
                                </span>
                            </button>

                            <div className="mt-4 min-h-[28px]">
                                {helperMessage ? (
                                    <p className="text-base text-slate-500">
                                        {helperMessage}
                                    </p>
                                ) : (
                                    <p className={`text-base font-medium ${isAISpeaking ? 'text-cyan-700' : feedbackTone || 'text-slate-600'}`}>
                                        {speakerStatus}
                                    </p>
                                )}
                            </div>

                            {isAISpeaking && (
                                <div className="mt-4 flex items-center gap-3 rounded-full border border-cyan-200 bg-cyan-50 px-4 py-2 text-cyan-700 shadow-sm">
                                    <div>
                                        <p className="text-xs uppercase tracking-[0.2em]">AI Coach</p>
                                        <p className="text-sm">Giving feedback...</p>
                                    </div>
                                    <div className="flex items-end gap-1">
                                        {waveformBars.map((bar) => (
                                            <span
                                                key={bar}
                                                className="w-1.5 rounded-full bg-cyan-500 animate-pulse"
                                                style={{ height: `${10 + (bar % 3) * 7}px`, animationDelay: `${bar * 0.12}s` }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="mt-5 flex items-center gap-3">
                                {roomId && (
                                    <button
                                        onClick={() => setIsMuted((current) => !current)}
                                        className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                                            isMuted
                                                ? 'border-rose-200 bg-rose-50 text-rose-700'
                                                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                                        }`}
                                    >
                                        {isMuted ? 'Unmute' : 'Mute'}
                                    </button>
                                )}
                                {feedbackItems[0] && !isAISpeaking && (
                                    <div className={`rounded-full px-3 py-2 text-sm font-medium ${
                                        feedbackItems[0].severity === 'red'
                                            ? 'bg-rose-50 text-rose-700'
                                            : feedbackItems[0].severity === 'yellow'
                                                ? 'bg-amber-50 text-amber-700'
                                                : 'bg-emerald-50 text-emerald-700'
                                    }`}>
                                        {feedbackItems[0].severity === 'red' ? 'Pronunciation issue' : feedbackItems[0].severity === 'yellow' ? 'Grammar correction' : 'Pronunciation good'}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
                        <div className="rounded-[26px] border border-slate-200/80 bg-white/90 p-4 shadow-sm">
                            <div className="space-y-3">
                                {liveTranscript && (
                                    <div className="rounded-2xl border border-cyan-100 bg-cyan-50 px-4 py-3">
                                        <div className="flex items-center gap-2 text-sm text-cyan-700">
                                            <span className="font-medium">{liveTranscript.speakerLabel}</span>
                                            <span>Live</span>
                                        </div>
                                        <p className="mt-2 text-base text-slate-900">{liveTranscript.transcript}</p>
                                    </div>
                                )}
                                {transcripts.length > 0 ? transcripts.map((entry) => (
                                    <div key={entry.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                                        <div className="flex items-center gap-2 text-sm text-slate-500">
                                            <span className="font-medium text-slate-800">{entry.speakerLabel}</span>
                                            <span>{new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                        <p className="mt-2 text-base text-slate-900">{entry.transcript}</p>
                                    </div>
                                )) : (
                                    <p className="px-2 py-3 text-sm text-slate-400">Transcript will appear here while you talk.</p>
                                )}
                            </div>
                        </div>

                        <div className="rounded-[26px] border border-slate-200/80 bg-white/90 p-4 shadow-sm">
                            {feedbackItems[0] ? (
                                <div className="space-y-3">
                                    {feedbackItems[0].correction && (
                                        <div className="rounded-2xl bg-slate-50 px-4 py-3">
                                            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Correction</p>
                                            <p className="mt-2 text-base text-slate-900">{feedbackItems[0].correction}</p>
                                        </div>
                                    )}
                                    {feedbackItems[0].pronunciationTip && (
                                        <div className="rounded-2xl bg-slate-50 px-4 py-3">
                                            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Pronunciation</p>
                                            <p className="mt-2 text-base text-slate-900">{feedbackItems[0].pronunciationTip}</p>
                                        </div>
                                    )}
                                    {feedbackItems[0].interruptTip && (
                                        <div className="rounded-2xl bg-slate-50 px-4 py-3">
                                            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Immediate Tip</p>
                                            <p className="mt-2 text-base text-slate-900">{feedbackItems[0].interruptTip}</p>
                                        </div>
                                    )}
                                    {!feedbackItems[0].correction && !feedbackItems[0].pronunciationTip && !feedbackItems[0].interruptTip && (
                                        <p className="px-2 py-3 text-sm text-slate-400">The AI coach is listening.</p>
                                    )}
                                </div>
                            ) : (
                                <p className="px-2 py-3 text-sm text-slate-400">The AI coach will respond when it detects something useful.</p>
                            )}
                        </div>
                    </div>

                    {errorMessage && (
                        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                            {errorMessage}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Rooms;
