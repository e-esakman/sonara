import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import { useStore } from '../store/useStore';
import {
    type InviteRoomCreatedPayload,
    type LiveTranscriptPayload,
    type RoomReadyPayload,
    type AIFeedback,
    type UserConnectedPayload,
    type UserPresencePayload,
    base64ToBlob,
    blobToBase64,
    copyToClipboard,
    createConversationRoomSocket,
} from '../services/liveConversationRoom';
import {
    downsampleBuffer,
    int16ToBase64,
    normalizeWord,
} from '../services/roomVoiceSocket';

type CallState = 'idle' | 'waiting' | 'connected';
type RoomStatus = 'Listening' | 'Transcribing' | 'Analyzing' | 'AI Coach Responding';

type SubtitleEntry = {
    id: string;
    speakerRole: 'userA' | 'userB';
    speakerLabel: string;
    text: string;
    isFinal: boolean;
    createdAt: string;
};

const MAX_SUBTITLES = 20;

const SILENCE_MS = 2000;
const MIN_SPEECH_MS = 250;
const SPEECH_THRESHOLD = 0.02;
const relayMimeType = (() => {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        return 'audio/webm;codecs=opus';
    }
    return 'audio/webm';
})();

const Rooms = () => {
    const { user } = useStore();

    const [callState, setCallState] = useState<CallState>('idle');
    const [callStatus, setCallStatus] = useState('Create a room or open an invite link');
    const [roomId, setRoomId] = useState<string | null>(null);
    const [userRole, setUserRole] = useState<'userA' | 'userB'>('userA');
    const [inviteUrl, setInviteUrl] = useState('');
    const [selfLabel, setSelfLabel] = useState(user?.name || 'You');
    const [partnerLabel, setPartnerLabel] = useState('Waiting for another speaker');
    const [isRoomSocketConnected, setIsRoomSocketConnected] = useState(false);
    const [isMicReady, setIsMicReady] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [status, setStatus] = useState<RoomStatus>('Listening');
    const [transcript, setTranscript] = useState('');
    const [subtitles, setSubtitles] = useState<SubtitleEntry[]>([]);
    const [analysis, setAnalysis] = useState('');
    const [mispronouncedWords, setMispronouncedWords] = useState<string[]>([]);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [selfLevel, setSelfLevel] = useState(0.08);
    const [partnerLevel, setPartnerLevel] = useState(0.08);
    const [copyToast, setCopyToast] = useState(false);

    const roomSocketRef = useRef<ReturnType<typeof createConversationRoomSocket> | null>(null);
    const copyToastTimerRef = useRef<number | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const sinkGainRef = useRef<GainNode | null>(null);
    const relayRecorderRef = useRef<MediaRecorder | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const pendingChunksRef = useRef<Int16Array[]>([]);
    const speechStartedAtRef = useRef<number | null>(null);
    const lastSpeechAtRef = useRef<number | null>(null);
    const hasSpeechRef = useRef(false);
    const isUnmountedRef = useRef(false);
    const activeAiAudioRef = useRef<HTMLAudioElement | null>(null);
    const activePartnerAudioRef = useRef<HTMLAudioElement | null>(null);
    const inviteJoinAttemptedRef = useRef(false);
    const roomIdRef = useRef<string | null>(null);
    const isMutedRef = useRef(false);
    const selfLabelRef = useRef(selfLabel);
    const userRoleRef = useRef<'userA' | 'userB'>('userA');
    const silenceTimerRef = useRef<number | null>(null);
    const subtitlesEndRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        roomIdRef.current = roomId;
    }, [roomId]);

    useEffect(() => {
        isMutedRef.current = isMuted;
    }, [isMuted]);

    useEffect(() => {
        selfLabelRef.current = selfLabel;
    }, [selfLabel]);

    const flushSpeechSegment = () => {
        const chunks = pendingChunksRef.current;
        pendingChunksRef.current = [];
        const speechStartedAt = speechStartedAtRef.current;
        speechStartedAtRef.current = null;
        lastSpeechAtRef.current = null;
        hasSpeechRef.current = false;

        if (!speechStartedAt || chunks.length === 0) {
            setSelfLevel(0.08);
            setStatus('Listening');
            return;
        }

        const durationMs = Date.now() - speechStartedAt;
        if (durationMs < MIN_SPEECH_MS) {
            setSelfLevel(0.08);
            setStatus('Listening');
            return;
        }

        const roomSocket = roomSocketRef.current;
        if (!roomSocket || !roomIdRef.current) {
            setErrorMessage('Join or create a room before speaking.');
            return;
        }

        console.log('[Rooms] speech turn ended, sending audio-stream-end');
        setStatus('Transcribing');
        roomSocket.emit('audio-stream-end');
    };

    const handleStartCall = () => {
        setErrorMessage(null);
        roomSocketRef.current?.emit('start-call', { name: user?.name || 'Host' });
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

    const leaveRoom = () => {
        roomSocketRef.current?.emit('leave-room');
        setRoomId(null);
        setInviteUrl('');
        setCallState('idle');
        setCallStatus('Create a room or open an invite link');
        setPartnerLabel('Waiting for another speaker');
        setPartnerLevel(0.08);
    };

    const startMicrophone = async () => {
        if (streamRef.current) {
            return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                channelCount: 1,
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
            },
        });

        console.log('Microphone started');

        const AudioContextCtor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioContextCtor) {
            throw new Error('AudioContext is not supported in this browser.');
        }

        const audioContext = new AudioContextCtor();
        await audioContext.resume();

        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        const processor = audioContext.createScriptProcessor(4096, 1, 1);
        const sinkGain = audioContext.createGain();
        sinkGain.gain.value = 0;

        analyser.fftSize = 2048;
        source.connect(analyser);
        source.connect(processor);
        processor.connect(sinkGain);
        sinkGain.connect(audioContext.destination);

        processor.onaudioprocess = (event) => {
            const input = event.inputBuffer.getChannelData(0);
            const downsampled = downsampleBuffer(input, audioContext.sampleRate, 16000);

            if (hasSpeechRef.current && !isMutedRef.current && roomIdRef.current) {
                pendingChunksRef.current.push(downsampled);
                roomSocketRef.current?.emit('audio-stream', {
                    pcmData: int16ToBase64(downsampled),
                    pcmMimeType: 'audio/pcm;rate=16000',
                });
            }
        };

        const relayRecorder = new MediaRecorder(stream, { mimeType: relayMimeType });
        relayRecorder.ondataavailable = async (event) => {
            if (!event.data.size || isMutedRef.current || !roomIdRef.current) {
                return;
            }

            const mediaData = await blobToBase64(event.data);
            roomSocketRef.current?.emit('audio-stream', {
                mediaData,
                mediaMimeType: event.data.type || relayMimeType,
            });
        };
        relayRecorder.start(300);
        relayRecorderRef.current = relayRecorder;

        const timeDomainData = new Uint8Array(analyser.fftSize);
        const detectSpeech = () => {
            analyser.getByteTimeDomainData(timeDomainData);
            let sumSquares = 0;

            for (let index = 0; index < timeDomainData.length; index += 1) {
                const centered = (timeDomainData[index] - 128) / 128;
                sumSquares += centered * centered;
            }

            const rms = Math.sqrt(sumSquares / timeDomainData.length);
            const level = Math.min(1, rms * 6);
            setSelfLevel(level);

            const now = Date.now();
            if (!isMutedRef.current && rms > SPEECH_THRESHOLD) {
                if (!hasSpeechRef.current) {
                    hasSpeechRef.current = true;
                    speechStartedAtRef.current = now;
                    setStatus('Listening');
                }
                lastSpeechAtRef.current = now;
            } else if (hasSpeechRef.current && lastSpeechAtRef.current && now - lastSpeechAtRef.current >= SILENCE_MS) {
                flushSpeechSegment();
            }

            animationFrameRef.current = window.requestAnimationFrame(detectSpeech);
        };

        streamRef.current = stream;
        audioContextRef.current = audioContext;
        sourceRef.current = source;
        processorRef.current = processor;
        analyserRef.current = analyser;
        sinkGainRef.current = sinkGain;
        setIsMicReady(true);
        detectSpeech();
    };

    useEffect(() => {
        isUnmountedRef.current = false;
        void startMicrophone().catch((error) => {
            console.error('[Rooms] microphone setup failed', error);
            setErrorMessage(error instanceof Error ? error.message : 'Microphone setup failed');
        });

        const roomSocket = createConversationRoomSocket();
        roomSocketRef.current = roomSocket;

        roomSocket.on('connect', () => {
            setIsRoomSocketConnected(true);
            const roomParam = new URLSearchParams(window.location.search).get('room');
            if (roomParam && !inviteJoinAttemptedRef.current) {
                inviteJoinAttemptedRef.current = true;
                roomSocket.emit('join-room', { roomId: roomParam, name: user?.name || 'Guest' });
            }
        });

        roomSocket.on('disconnect', () => {
            setIsRoomSocketConnected(false);
        });

        roomSocket.on('connect_error', () => {
            setIsRoomSocketConnected(false);
            setErrorMessage('Unable to reach the room server on port 3000.');
        });

        roomSocket.on('invite-room-created', (payload: InviteRoomCreatedPayload) => {
            setRoomId(payload.roomId);
            setUserRole(payload.role);
            setInviteUrl(payload.shareUrl);
            setSelfLabel(payload.selfLabel);
            setPartnerLabel('Waiting for another speaker');
            setCallState('waiting');
            setCallStatus('Waiting for another speaker...');
        });

        roomSocket.on('room-ready', (payload: RoomReadyPayload) => {
            setRoomId(payload.roomId);
            setUserRole(payload.role);
            setSelfLabel(payload.selfLabel);
            setPartnerLabel(payload.partnerLabel === 'Waiting for join' ? 'Waiting for another speaker' : payload.partnerLabel);
            setCallState(payload.partnerLabel === 'Waiting for join' ? 'waiting' : 'connected');
            setCallStatus(payload.partnerLabel === 'Waiting for join' ? 'Waiting for another speaker...' : 'Speaker connected');

            const currentUrl = new URL(window.location.href);
            currentUrl.searchParams.set('room', payload.roomId);
            window.history.replaceState({}, '', currentUrl.toString());
        });

        roomSocket.on('user-joined', (payload: UserPresencePayload) => {
            const partner = payload.participants.find((participant) => participant.label !== selfLabelRef.current);
            if (partner) {
                setPartnerLabel(partner.label);
                setCallState('connected');
                setCallStatus('Speaker connected');
            }
        });

        roomSocket.on('user-connected', (_payload: UserConnectedPayload) => {
            setCallState('connected');
            setCallStatus('Speaker connected');
        });

        roomSocket.on('partner-audio', ({ audio, mimeType }: { audio: string; mimeType: string }) => {
            const blob = base64ToBlob(audio, mimeType);
            const url = URL.createObjectURL(blob);
            const partnerAudio = new Audio(url);
            activePartnerAudioRef.current?.pause();
            activePartnerAudioRef.current = partnerAudio;
            setPartnerLevel(0.82);
            partnerAudio.onended = () => {
                setPartnerLevel(0.08);
                URL.revokeObjectURL(url);
            };
            partnerAudio.onerror = () => {
                setPartnerLevel(0.08);
                URL.revokeObjectURL(url);
            };
            void partnerAudio.play().catch(() => {
                setPartnerLevel(0.08);
                URL.revokeObjectURL(url);
            });
        });

        roomSocket.on('room-full', ({ message }: { message: string }) => {
            setErrorMessage(message);
        });

        roomSocket.on('room-error', ({ message }: { message: string }) => {
            setErrorMessage(message);
        });

        roomSocket.on('live-transcript', (payload: LiveTranscriptPayload) => {
            if (payload.speakerRole === userRoleRef.current) {
                setStatus(payload.isFinal ? 'Transcribing' : 'Listening');
                setTranscript(payload.transcript);
            }

            setSubtitles((prev) => {
                const existingIdx = prev.findIndex(
                    (s) => s.speakerRole === payload.speakerRole && !s.isFinal,
                );
                const entry: SubtitleEntry = {
                    id: existingIdx >= 0 ? prev[existingIdx].id : `${payload.speakerRole}-${Date.now()}`,
                    speakerRole: payload.speakerRole,
                    speakerLabel: payload.speakerLabel,
                    text: payload.transcript,
                    isFinal: payload.isFinal,
                    createdAt: payload.createdAt,
                };

                let next: SubtitleEntry[];
                if (existingIdx >= 0) {
                    next = [...prev];
                    next[existingIdx] = entry;
                } else {
                    next = [...prev, entry];
                }

                return next.slice(-MAX_SUBTITLES);
            });
        });

        roomSocket.on('ai-feedback', (payload: AIFeedback) => {
            setStatus('AI Coach Responding');
            const nextAnalysis = [payload.pronunciationTip, payload.interruptTip, payload.correction !== payload.transcript ? payload.correction : '']
                .filter(Boolean)
                .join(' ');
            setAnalysis(nextAnalysis || payload.speechText || 'Good job. Keep going.');

            const flagged = payload.interruptTip
                .replace(/^Pronounce:\s*/i, '')
                .replace(/[.]/g, '')
                .trim();
            setMispronouncedWords(flagged ? [flagged] : []);

            if (payload.speechText?.trim()) {
                activeAiAudioRef.current?.pause();
                const utterance = new SpeechSynthesisUtterance(payload.speechText);
                utterance.onend = () => setStatus('Listening');
                utterance.onerror = () => setStatus('Listening');
                window.speechSynthesis.cancel();
                window.speechSynthesis.speak(utterance);
            } else {
                setStatus('Listening');
            }
        });

        roomSocket.on('room-ended', ({ message }: { message: string }) => {
            setCallState('waiting');
            setCallStatus('Waiting for another speaker...');
            setPartnerLabel('Waiting for another speaker');
            setPartnerLevel(0.08);
            setErrorMessage(message || null);
        });

        return () => {
            isUnmountedRef.current = true;
            if (copyToastTimerRef.current) {
                window.clearTimeout(copyToastTimerRef.current);
            }
            if (animationFrameRef.current) {
                window.cancelAnimationFrame(animationFrameRef.current);
            }
            if (silenceTimerRef.current) {
                window.clearTimeout(silenceTimerRef.current);
            }
            activeAiAudioRef.current?.pause();
            activePartnerAudioRef.current?.pause();
            window.speechSynthesis.cancel();
            relayRecorderRef.current?.stop();
            processorRef.current?.disconnect();
            sourceRef.current?.disconnect();
            analyserRef.current?.disconnect();
            sinkGainRef.current?.disconnect();
            streamRef.current?.getTracks().forEach((track) => track.stop());
            void audioContextRef.current?.close();
            roomSocket.disconnect();
        };
    }, [user?.name]);

    useEffect(() => {
        userRoleRef.current = userRole;
    }, [userRole]);

    useEffect(() => {
        subtitlesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [subtitles]);

    const micScale = useMemo(() => {
        if (status === 'AI Coach Responding') return 1.1;
        return 1 + Math.max(selfLevel, partnerLevel) * 0.22;
    }, [partnerLevel, selfLevel, status]);

    const highlightedTranscript = useMemo(() => {
        if (!transcript) {
            return null;
        }

        const flaggedWords = new Set(mispronouncedWords.map(normalizeWord));
        return transcript.split(/(\s+)/).map((part, index) => {
            if (/^\s+$/.test(part)) {
                return <span key={`${part}-${index}`}>{part}</span>;
            }

            const normalized = normalizeWord(part);
            const isFlagged = normalized.length > 0 && flaggedWords.has(normalized);
            return (
                <span
                    key={`${part}-${index}`}
                    className={isFlagged ? 'rounded-md bg-amber-100 px-1 py-0.5 text-amber-900' : undefined}
                >
                    {part}
                </span>
            );
        });
    }, [mispronouncedWords, transcript]);

    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,#f4f9ff,transparent_28%),linear-gradient(180deg,#f6f2e9_0%,#edf4fb_100%)] px-4 pb-10 pt-24 text-slate-900 md:px-8">
            <div className="mx-auto max-w-6xl rounded-[34px] border border-white/80 bg-white/88 shadow-[0_28px_120px_rgba(15,23,42,0.10)] backdrop-blur">
                <div className="px-6 pb-10 pt-8 md:px-10">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div>
                            <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Sonara Live</p>
                            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Voice room</h1>
                            <p className="mt-2 text-sm text-slate-500">{callStatus}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {!roomId && (
                                <button
                                    onClick={handleStartCall}
                                    className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                                >
                                    Start Call
                                </button>
                            )}
                            {roomId && (
                                <button
                                    onClick={leaveRoom}
                                    className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 transition hover:border-rose-300 hover:bg-rose-100"
                                >
                                    Leave
                                </button>
                            )}
                            <button
                                onClick={() => void handleCopyInvite()}
                                disabled={!inviteUrl}
                                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:text-slate-300"
                            >
                                Copy Link
                            </button>
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
                        </div>
                    </div>

                    <div className="mt-6 rounded-[26px] border border-slate-200/80 bg-white/92 px-4 py-4 shadow-sm md:px-5">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center">
                            <div className="min-w-0 flex-1">
                                <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Room Link</p>
                                <p className="mt-2 truncate text-sm text-slate-600">
                                    {inviteUrl || 'Create a room to get your invite link'}
                                </p>
                                <p className="mt-1 text-xs text-slate-400">Share this link so another person can join the room.</p>
                            </div>
                            <div className="flex flex-wrap gap-2 text-sm">
                                <span className={`rounded-full border px-3 py-1.5 ${isRoomSocketConnected ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>
                                    {isRoomSocketConnected ? 'Room connected' : 'Room reconnecting'}
                                </span>
                                <span className={`rounded-full border px-3 py-1.5 ${isMicReady ? 'border-slate-200 bg-slate-50 text-slate-700' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>
                                    {isMicReady ? 'Microphone ready' : 'Waiting for microphone'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="relative mt-6 overflow-hidden rounded-[32px] border border-slate-200/80 bg-[radial-gradient(circle_at_top,rgba(125,211,252,0.22),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.96),rgba(241,245,249,0.9))] px-6 py-12">
                        {copyToast && (
                            <div className="absolute right-6 top-6 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-lg">
                                Invite link copied
                            </div>
                        )}

                        <div className="absolute inset-0 opacity-70">
                            <div className="absolute left-1/2 top-[18%] h-64 w-64 -translate-x-1/2 rounded-full bg-cyan-100/80 blur-3xl animate-pulse" />
                            <div className="absolute bottom-[12%] left-[14%] h-44 w-44 rounded-full bg-amber-100/60 blur-3xl" />
                            <div className="absolute right-[15%] top-[20%] h-40 w-40 rounded-full bg-sky-100/70 blur-3xl" />
                        </div>

                        <div className="relative z-10 flex flex-col items-center text-center">
                            <div className="mb-6 flex items-center gap-6 text-sm text-slate-500">
                                <div className={`rounded-full border px-3 py-1.5 ${callState === 'connected' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-500'}`}>
                                    {selfLabel}
                                </div>
                                <div className="h-px w-14 bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
                                <div className={`rounded-full border px-3 py-1.5 ${callState === 'connected' ? 'border-cyan-200 bg-cyan-50 text-cyan-700' : 'border-slate-200 bg-white text-slate-500'}`}>
                                    {partnerLabel}
                                </div>
                            </div>

                            <div className="relative flex h-[260px] w-[260px] items-center justify-center">
                                <span
                                    className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(34,211,238,0.38),rgba(56,189,248,0.12)_52%,transparent_74%)] transition-transform duration-200"
                                    style={{ transform: `scale(${micScale})` }}
                                />
                                <span className="absolute inset-[12%] rounded-full border border-cyan-200/70 bg-white/70 shadow-[0_18px_60px_rgba(14,116,144,0.10)]" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="flex h-28 w-28 items-center justify-center rounded-full bg-slate-950 text-white shadow-[0_20px_50px_rgba(15,23,42,0.25)]">
                                        <Icon icon={isMuted ? 'lucide:mic-off' : 'lucide:mic'} className="h-12 w-12" />
                                    </div>
                                </div>
                            </div>

                            <p className="mt-5 text-xl font-medium text-slate-900">{status}</p>
                            <p className="mt-2 max-w-xl text-sm text-slate-500">
                                Speak naturally. Sonara relays your live audio to the other person and sends completed speech turns to the backend coach after 2 seconds of silence.
                            </p>
                        </div>
                    </div>

                    <div className="mt-6 grid gap-4 md:grid-cols-2">
                        <div className="rounded-[26px] border border-slate-200/80 bg-white/92 p-5 shadow-sm">
                            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Live Subtitles</p>
                            <div className="mt-4 min-h-[140px] max-h-[280px] overflow-y-auto rounded-2xl bg-slate-50 px-4 py-4 text-left text-sm leading-7 text-slate-900">
                                {subtitles.length > 0 ? (
                                    subtitles.map((entry) => {
                                        const isSelf = entry.speakerRole === userRole;
                                        return (
                                            <div key={entry.id} className={`mb-2 ${entry.isFinal ? '' : 'opacity-60'}`}>
                                                <span className={`font-semibold ${isSelf ? 'text-emerald-700' : 'text-cyan-700'}`}>
                                                    {entry.speakerLabel}:
                                                </span>{' '}
                                                <span>{entry.text}</span>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <span className="text-slate-400">
                                        {status === 'Transcribing' ? 'Transcription in progress...' : 'Waiting for speech...'}
                                    </span>
                                )}
                                <div ref={subtitlesEndRef} />
                            </div>
                            {highlightedTranscript && (
                                <div className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-slate-800">
                                    <span className="font-medium text-amber-700">Your last turn: </span>
                                    {highlightedTranscript}
                                </div>
                            )}
                            {mispronouncedWords.length > 0 && (
                                <p className="mt-2 text-sm text-amber-700">Highlighted words may need clearer pronunciation.</p>
                            )}
                        </div>

                        <div className="rounded-[26px] border border-slate-200/80 bg-white/92 p-5 shadow-sm">
                            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">AI Coach</p>
                            <div className="mt-4 min-h-[140px] rounded-2xl bg-slate-50 px-4 py-4 text-base leading-8 text-slate-900">
                                {analysis || (
                                    <span className="text-slate-400">
                                        {status === 'Analyzing' ? 'Analyzing your sentence.' : 'Coaching feedback will appear here.'}
                                    </span>
                                )}
                            </div>
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
