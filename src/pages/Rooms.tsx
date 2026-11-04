import { useEffect, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import type { Socket } from 'socket.io-client';
import { useStore } from '../store/useStore';
import RoomWaveform from '../components/RoomWaveform';
import { speakText, stopSpeaking as stopTts } from '../utils/tts';
import {
    copyToClipboard,
    createConversationRoomSocket,
    type AIFeedback,
    type AITip,
    type InviteRoomCreatedPayload,
    type PronunciationFeedbackRow,
    type RoomReadyPayload,
    type TranscriptEntry,
    pcmFloat32ToBase64,
} from '../services/liveConversationRoom';
import { getBackendUrlConfigError } from '../services/backendConfig';

type CallState = 'idle' | 'waiting-link' | 'connected' | 'ended';

const MAX_TRANSCRIPT_ENTRIES = 100;
const TRANSCRIPT_BATCH_MS = 120;
const FEEDBACK_VOICE_INTERVAL_MS = 5000;
const WAVEFORM_UPDATE_MS = 120;

const Rooms = () => {
    const { user, accentStyle } = useStore();
    const [callState, setCallState] = useState<CallState>('idle');
    const [callStatus, setCallStatus] = useState('Ready to create a room');
    const [coachStatus, setCoachStatus] = useState('AI coach standing by');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isSocketConnected, setIsSocketConnected] = useState(false);
    const [roomId, setRoomId] = useState<string | null>(null);
    const [userRole, setUserRole] = useState<'userA' | 'userB'>('userA');
    const [selfLabel, setSelfLabel] = useState(user?.name || 'You');
    const [partnerLabel, setPartnerLabel] = useState('Waiting for your friend');
    const [inviteUrl, setInviteUrl] = useState('');
    const [isMuted, setIsMuted] = useState(false);
    const [isMicActive, setIsMicActive] = useState(false);
    const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
    const [feedbackItems, setFeedbackItems] = useState<AIFeedback[]>([]);
    const [coachQuestion, setCoachQuestion] = useState('');
    const [coachMessages, setCoachMessages] = useState<Array<{ id: string; role: 'user' | 'ai'; text: string; createdAt: string }>>([]);
    const [isAskingCoach, setIsAskingCoach] = useState(false);
    const [liveTip, setLiveTip] = useState<AITip | null>(null);
    const [waveformSamples, setWaveformSamples] = useState<number[]>([]);





    const socketRef = useRef<Socket | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const playbackContextRef = useRef<AudioContext | null>(null);
    const playbackTimeRef = useRef(0);
    const speechTurnRef = useRef({ speaking: false, silence: 0, duration: 0 });
    const micContextRef = useRef<AudioContext | null>(null);
    const pcmProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const micSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const isMutedRef = useRef(false);
    const isMicActiveRef = useRef(false);
    const isRoomActiveRef = useRef(false);
    const inviteJoinAttemptedRef = useRef(false);
    const liveTipTimeoutRef = useRef<number | null>(null);
    const transcriptPanelRef = useRef<HTMLDivElement | null>(null);
    const pendingTranscriptEntriesRef = useRef<TranscriptEntry[]>([]);
    const transcriptBatchTimeoutRef = useRef<number | null>(null);
    const pendingWaveformFrameRef = useRef<number | null>(null);
    const lastWaveformUpdateRef = useRef(0);
    const pendingVoiceFeedbackRef = useRef<AIFeedback | null>(null);
    const lastVoiceFeedbackAtRef = useRef<number>(0);
    const voiceFeedbackIntervalRef = useRef<number | null>(null);
    const reconnectTokenRef = useRef('');
    const roomSessionRef = useRef<{ roomId: string | null; role: 'userA' | 'userB'; name: string }>({
        roomId: null,
        role: 'userA',
        name: user?.name || 'Guest',
    });

    useEffect(() => {
        isMutedRef.current = isMuted;
    }, [isMuted]);

    useEffect(() => {
        isMicActiveRef.current = isMicActive;
    }, [isMicActive]);

    useEffect(() => {
        roomSessionRef.current = {
            roomId,
            role: userRole,
            name: user?.name || selfLabel || 'Guest',
        };
    }, [roomId, selfLabel, user?.name, userRole]);

    const resetPartnerAudioQueue = () => {
        playbackTimeRef.current = 0;
        const context = playbackContextRef.current;
        playbackContextRef.current = null;
        void context?.close().catch(() => undefined);
    };

    const flushTranscriptBatch = () => {
        if (transcriptBatchTimeoutRef.current) {
            window.clearTimeout(transcriptBatchTimeoutRef.current);
            transcriptBatchTimeoutRef.current = null;
        }

        if (pendingTranscriptEntriesRef.current.length === 0) {
            return;
        }

        const pendingEntries = pendingTranscriptEntriesRef.current;
        pendingTranscriptEntriesRef.current = [];

        setTranscripts((current) => [...current, ...pendingEntries].slice(-MAX_TRANSCRIPT_ENTRIES));
    };

    const queueTranscriptEntry = (entry: TranscriptEntry) => {
        pendingTranscriptEntriesRef.current.push(entry);
        if (transcriptBatchTimeoutRef.current) {
            return;
        }

        transcriptBatchTimeoutRef.current = window.setTimeout(() => {
            flushTranscriptBatch();
        }, TRANSCRIPT_BATCH_MS);
    };

    const pushWaveformSample = (sample: number) => {
        const now = performance.now();
        if (now - lastWaveformUpdateRef.current < WAVEFORM_UPDATE_MS) {
            return;
        }
        lastWaveformUpdateRef.current = now;

        if (pendingWaveformFrameRef.current) {
            window.cancelAnimationFrame(pendingWaveformFrameRef.current);
        }

        pendingWaveformFrameRef.current = window.requestAnimationFrame(() => {
            setWaveformSamples((current) => [...current.slice(-27), sample]);
            pendingWaveformFrameRef.current = null;
        });
    };

    const releaseMicrophone = async () => {
        mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;

        if (micContextRef.current) {
            try {
                await micContextRef.current.close();
            } catch {
                // intentionally ignored
            }
            micContextRef.current = null;
        }
    };

    const stopSpeaking = async (notifyServer = true) => {
        if (notifyServer) {
            socketRef.current?.emit('audio-stream-end');
        }

        if (pcmProcessorRef.current) {
            pcmProcessorRef.current.disconnect();
            pcmProcessorRef.current.onaudioprocess = null;
            pcmProcessorRef.current = null;
        }

        if (micSourceRef.current) {
            micSourceRef.current.disconnect();
            micSourceRef.current = null;
        }

        isMicActiveRef.current = false;
        speechTurnRef.current = { speaking: false, silence: 0, duration: 0 };
        await releaseMicrophone();
        setIsMicActive(false);
        setWaveformSamples([]);
    };


    useEffect(() => {
        let socket: Socket;
        try {
            socket = createConversationRoomSocket();
        } catch (error) {
            const message = error instanceof Error ? error.message : getBackendUrlConfigError();
            const timer = window.setTimeout(() => {
                setErrorMessage(message);
                setCallStatus('Configuration error');
                setCoachStatus('AI coach unavailable');
                setIsSocketConnected(false);
            }, 0);
            return () => window.clearTimeout(timer);
        }

        socketRef.current = socket;

        socket.on('connect', () => {
            setIsSocketConnected(true);
            setErrorMessage(null);
            const savedSession = roomSessionRef.current;
            if (savedSession.roomId) {
                setCallStatus('Rejoining room...');
                socket.emit('rejoin-room', { ...savedSession, reconnectToken: reconnectTokenRef.current });
                return;
            }

            setCallStatus('Ready to create a room');
            const roomParam = new URLSearchParams(window.location.search).get('room');
            if (roomParam && !inviteJoinAttemptedRef.current && !savedSession.roomId) {
                inviteJoinAttemptedRef.current = true;
                setCallState('waiting-link');
                setCallStatus('Joining shared room...');
                socket.emit('join-room', { roomId: roomParam, name: user?.name || 'Guest' });
            }
        });

        socket.on('connect_error', (err: Error) => {
            setIsSocketConnected(false);
            setCallState('idle');
            setCallStatus(`Room server offline: ${err.message}`);
            setCoachStatus('AI coach unavailable');
            setErrorMessage(`Socket connection failed: ${err.message}. Start the backend and try again.`);
        });

        socket.on('disconnect', () => {
            setIsSocketConnected(false);
            setCallStatus(isRoomActiveRef.current ? 'Connection lost. Reconnecting...' : 'Disconnected from room server');
        });

        socket.on('invite-room-created', (payload: InviteRoomCreatedPayload) => {
            reconnectTokenRef.current = payload.reconnectToken;
            setRoomId(payload.roomId);
            setUserRole(payload.role);
            setSelfLabel(payload.selfLabel);
            setInviteUrl(`${window.location.origin}/rooms?room=${encodeURIComponent(payload.roomId)}`);
            setCallState('waiting-link');
            setCallStatus('Invite link ready. Waiting for your friend...');
            setPartnerLabel('Waiting for your friend');
            isRoomActiveRef.current = true;
            setErrorMessage(null);
        });

        socket.on('call-status', ({ status }: { status: string }) => {
            setCallStatus(status);
        });

        socket.on('coach-status', ({ status }: { status: string }) => {
            setCoachStatus(status);
        });

        socket.on('room-ready', (payload: RoomReadyPayload) => {
            reconnectTokenRef.current = payload.reconnectToken;
            setRoomId(payload.roomId);
            setUserRole(payload.role);
            setSelfLabel(payload.selfLabel);
            setPartnerLabel(payload.partnerLabel);
            setCallState('connected');
            setCallStatus('Room connected. Tap Join audio to hear your friend and start speaking.');
            isRoomActiveRef.current = true;
            setErrorMessage(null);
        });

        socket.on('room-error', ({ message }: { message: string }) => {
            setErrorMessage(message);
            setCallState('idle');
            setCallStatus('Room unavailable');
        });

        socket.on('transcript-entry', queueTranscriptEntry);

        socket.on('ai-feedback', (feedback: AIFeedback) => {
            setFeedbackItems((current) => [feedback, ...current].slice(0, 12));
            pendingVoiceFeedbackRef.current = feedback;
        });

        socket.on('coach-answer', ({ question, answer, createdAt }: { question: string; answer: string; createdAt: string }) => {
            setCoachMessages((current) => {
                const next: Array<{ id: string; role: 'user' | 'ai'; text: string; createdAt: string }> = [];
                if (answer) {
                    next.push({ id: `${createdAt}-a`, role: 'ai', text: answer, createdAt });
                }
                if (question) {
                    next.push({ id: `${createdAt}-q`, role: 'user', text: question, createdAt });
                }
                return [...next, ...current].slice(0, 6);
            });
            if (answer && !isMicActiveRef.current) {
                speakText({ text: answer, accentStyle, rate: 0.95 });
            }
            setIsAskingCoach(false);
        });

        socket.on('room-debug', (payload: {
            type: 'audio-sent' | 'gemini-audio-received' | 'gemini-transcript' | 'gemini-status';
            createdAt: string;
            transcript?: string;
            status?: string;
        }) => {
            if (payload.type === 'gemini-status' && payload.status) setCoachStatus(payload.status);
        });

        socket.on('ai-tip', (tip: AITip) => {
            setLiveTip(tip);
            if (liveTipTimeoutRef.current) {
                window.clearTimeout(liveTipTimeoutRef.current);
            }
            liveTipTimeoutRef.current = window.setTimeout(() => {
                setLiveTip(null);
            }, 3200);
        });

        socket.on('partner-audio', ({ audio }: { audio: string }) => {
            const context = playbackContextRef.current;
            if (!context || context.state !== 'running') return;
            const binary = atob(audio);
            const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
            const pcm = new DataView(bytes.buffer);
            const buffer = context.createBuffer(1, bytes.length / 2, 16000);
            const samples = buffer.getChannelData(0);
            for (let i = 0; i < samples.length; i++) samples[i] = pcm.getInt16(i * 2, true) / 32768;
            const source = context.createBufferSource();
            source.buffer = buffer;
            source.connect(context.destination);
            // Bound latency after a slow connection or a backgrounded tab.
            const now = context.currentTime;
            if (playbackTimeRef.current > now + 0.8) return;
            const start = Math.max(now + 0.04, playbackTimeRef.current);
            source.start(start);
            playbackTimeRef.current = start + buffer.duration;
        });

        socket.on('room-ended', ({ message }: { message: string }) => {
            setCallState('ended');
            setCallStatus(message);
            reconnectTokenRef.current = '';
            roomSessionRef.current.roomId = null;
            setRoomId(null);
            setInviteUrl('');
            setPartnerLabel('Waiting for your friend');
            isRoomActiveRef.current = false;
            resetPartnerAudioQueue();
            stopTts();
            void stopSpeaking(false);
            void releaseMicrophone();
        });

        return () => {
            if (liveTipTimeoutRef.current) {
                window.clearTimeout(liveTipTimeoutRef.current);
            }
            flushTranscriptBatch();
            resetPartnerAudioQueue();
            stopTts();
            void stopSpeaking(false);
            void releaseMicrophone();
            inviteJoinAttemptedRef.current = false;
            socket.disconnect();
        };
    }, [user?.name]);

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (!document.hidden && micContextRef.current?.state === 'suspended') {
                void micContextRef.current.resume().catch(() => undefined);
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    useEffect(() => {
        const panel = transcriptPanelRef.current;
        if (!panel) {
            return;
        }

        panel.scrollTo({
            top: panel.scrollHeight,
            behavior: 'smooth',
        });
    }, [transcripts]);

    useEffect(() => {
        if (callState !== 'connected') {
            if (voiceFeedbackIntervalRef.current) {
                window.clearInterval(voiceFeedbackIntervalRef.current);
                voiceFeedbackIntervalRef.current = null;
            }
            return;
        }

        if (voiceFeedbackIntervalRef.current) {
            return;
        }

        voiceFeedbackIntervalRef.current = window.setInterval(() => {
            if (!isRoomActiveRef.current || isMicActiveRef.current) {
                return;
            }

            const pending = pendingVoiceFeedbackRef.current;
            if (!pending) {
                return;
            }

            const now = Date.now();
            if (now - lastVoiceFeedbackAtRef.current < FEEDBACK_VOICE_INTERVAL_MS) {
                return;
            }

            const text = (pending.pronunciationTip || pending.correction || pending.rows?.[0]?.tip || '').trim();
            if (!text) {
                return;
            }

            speakText({ text, accentStyle, rate: 0.95 });
            lastVoiceFeedbackAtRef.current = now;
            pendingVoiceFeedbackRef.current = null;
        }, FEEDBACK_VOICE_INTERVAL_MS);

        return () => {
            if (voiceFeedbackIntervalRef.current) {
                window.clearInterval(voiceFeedbackIntervalRef.current);
                voiceFeedbackIntervalRef.current = null;
            }
        };
    }, [accentStyle, callState]);

    const ensureMicrophone = async () => {
        if (mediaStreamRef.current) {
            return mediaStreamRef.current;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    sampleRate: 16000,
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true,
                },
            });
            mediaStreamRef.current = stream;
            setErrorMessage(null);
            return stream;
        } catch (error) {
            if (error instanceof DOMException && error.name === 'NotAllowedError') {
                setErrorMessage('Microphone permission was denied. Allow mic access in the browser and try again.');
                setCallStatus('Microphone access blocked');
            } else {
                setErrorMessage('Unable to access your microphone right now.');
                setCallStatus('Microphone unavailable');
            }
            throw error;
        }
    };

    const startSpeaking = async () => {
        if (!roomId || !socketRef.current) {
            setErrorMessage('Join a room before starting the microphone.');
            return;
        }

        if (isMicActive) {
            return;
        }

        if (!playbackContextRef.current) playbackContextRef.current = new AudioContext();
        await playbackContextRef.current.resume();
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
        if (micContext.state === 'suspended') {
            await micContext.resume();
        }
        const source = micContext.createMediaStreamSource(stream);
        const processor = micContext.createScriptProcessor(4096, 1, 1);
        source.connect(processor);
        processor.connect(micContext.destination);
        micSourceRef.current = source;
        pcmProcessorRef.current = processor;

        processor.onaudioprocess = (event) => {
            const outputData = event.outputBuffer.getChannelData(0);
            outputData.fill(0);

            if (isMutedRef.current || !isRoomActiveRef.current || !socket.connected) {
                return;
            }

            const inputData = event.inputBuffer.getChannelData(0);
            let sum = 0;
            for (let i = 0; i < inputData.length; i += 1) {
                sum += inputData[i] * inputData[i];
            }
            const rms = Math.sqrt(sum / inputData.length);
            const normalized = Math.min(1, rms * 6 + 0.08);
            pushWaveformSample(normalized);

            const pcmData = pcmFloat32ToBase64(inputData);
            socket.emit('audio-stream', {
                pcmData,
                pcmMimeType: 'audio/pcm;rate=16000',
            });
            const turn = speechTurnRef.current;
            const elapsed = inputData.length / micContext.sampleRate;
            turn.duration += elapsed;
            if (rms > 0.015) { turn.speaking = true; turn.silence = 0; }
            else turn.silence += elapsed;
            if ((turn.speaking && turn.silence >= 0.8) || turn.duration >= 12) {
                socket.emit('audio-stream-end');
                speechTurnRef.current = { speaking: false, silence: 0, duration: 0 };
            }
        };

        isMicActiveRef.current = true;
        setIsMicActive(true);
        setCallStatus('Microphone live');
    };

    const createInvite = () => {
        if (!socketRef.current) {
            setErrorMessage('Room connection is still initializing.');
            return;
        }

        if (!isSocketConnected) {
            socketRef.current.connect();
            setErrorMessage('Trying to reconnect to the room server...');
            return;
        }

        setTranscripts([]);
        setFeedbackItems([]);
        setLiveTip(null);
        pendingTranscriptEntriesRef.current = [];




        setErrorMessage(null);
        socketRef.current.emit('create-invite-room', { name: user?.name || 'Host' });
    };

    const copyInviteLink = async () => {
        if (!inviteUrl) {
            return;
        }

        try {
            await copyToClipboard(inviteUrl);
            setCallStatus('Invite link copied');
        } catch {
            setErrorMessage('Could not copy the invite link.');
        }
    };

    const shareInviteLink = async () => {
        if (!inviteUrl) {
            return;
        }

        try {
            if (navigator.share) {
                await navigator.share({
                    title: 'Join my Sonara room',
                    text: 'Join my Sonara pronunciation room.',
                    url: inviteUrl,
                });
                setCallStatus('Invite link shared');
                return;
            }

            await copyInviteLink();
        } catch {
            setErrorMessage('Could not share the invite link.');
        }
    };

    const toggleMicrophone = async () => {
        if (!roomId || callState !== 'connected') {
            setErrorMessage('Create or join a room before turning on the microphone.');
            return;
        }

        if (isMicActive) {
            await stopSpeaking();
            setCallStatus('Microphone paused');
            return;
        }

        try {
            await startSpeaking();
        } catch {
            // Error state is already set in ensureMicrophone.
        }
    };

    const leaveRoom = async () => {
        await stopSpeaking(false);
        await releaseMicrophone();
        resetPartnerAudioQueue();
        stopTts();
        socketRef.current?.emit('leave-room');
        roomSessionRef.current.roomId = null;
        setRoomId(null);
        setInviteUrl('');
        setPartnerLabel('Waiting for your friend');
        isRoomActiveRef.current = false;
        setCallState('ended');
        setCallStatus('You left the room');
    };

    const submitCoachQuestion = () => {
        if (!roomId || !socketRef.current) {
            setErrorMessage('Join a room before asking Gemini.');
            return;
        }

        const question = coachQuestion.trim();
        if (!question) {
            return;
        }

        setIsAskingCoach(true);
        socketRef.current.emit('coach-question', { text: question });
        setCoachQuestion('');
    };

    const primaryFeedback = feedbackItems[0];
    const inviteParam = new URLSearchParams(window.location.search).get('room');
    const showInviteButton = !inviteParam && !inviteUrl && !roomId;
    const formatTranscriptStamp = (value: string) =>
        new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const feedbackRows: PronunciationFeedbackRow[] = primaryFeedback?.rows ?? [];

    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(194,230,222,0.28),_transparent_28%),linear-gradient(180deg,_#fbfbfa_0%,_#f3efe8_100%)] pt-36 pb-20">
            <div className="mx-auto max-w-6xl px-6 md:px-10">
                <div className="rounded-[34px] border border-[#e6e0d8] bg-[linear-gradient(180deg,rgba(255,255,255,0.84)_0%,rgba(246,242,236,0.98)_100%)] shadow-[0_18px_45px_rgba(0,0,0,0.06)]">
                    <div className="border-b border-[#e6e0d8] px-6 py-6 sm:px-8">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-[0.2em] text-neutral-400">Rooms</p>
                                <h1 className="mt-2 text-[34px] font-dm-sans font-semibold tracking-tight text-[#111]">A little practice. Together.</h1>
                                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-neutral-500">
                                    Create a private room, share the invite, and speak live while Gemini listens for pronunciation and grammar coaching.
                                </p>
                            </div>

                            <div className="rounded-[22px] border border-emerald-100 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-700 shadow-sm">
                                <div className="flex items-center gap-2 font-medium">
                                    <span className={`h-2.5 w-2.5 rounded-full ${coachStatus === 'Coach connected' ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                                    {coachStatus}
                                </div>
                                <p className="mt-1 text-xs text-emerald-600/90">Feedback stays private to the current speaker.</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-6 px-6 py-6 sm:px-8 lg:grid-cols-[1.45fr_0.95fr]">
                        <section className="space-y-6">
                            <div className="relative overflow-hidden rounded-[30px] border border-[#e6e0d8] bg-[linear-gradient(135deg,rgba(17,24,39,0.96)_0%,rgba(38,59,74,0.96)_55%,rgba(88,108,104,0.92)_100%)] p-6 text-white shadow-[0_20px_50px_rgba(15,23,42,0.2)]">
                                <div className="absolute inset-x-8 top-8 h-32 rounded-full bg-white/10 blur-3xl" />
                                <div className="relative">
                                    <div className="flex items-center justify-between gap-4">
                                        <div>
                                            <p className="text-xs uppercase tracking-[0.22em] text-white/60">Voice call</p>
                                            <div className="mt-2 flex items-center gap-3">
                                                <span className={`h-3 w-3 rounded-full ${callState === 'connected' ? 'bg-emerald-400' : callState === 'waiting-link' ? 'bg-amber-300' : 'bg-white/50'}`} />
                                                <p className="text-lg font-medium">{callStatus}</p>
                                            </div>
                                        </div>
                                        <div className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/70">
                                            {roomId ? roomId.slice(0, 8) : 'Lobby'}
                                        </div>
                                    </div>

                                    <div className="mt-6 flex flex-wrap gap-3">
                                        {showInviteButton && (
                                            <button
                                                onClick={createInvite}
                                                disabled={!isSocketConnected}
                                                className={`rounded-full px-5 py-3 text-sm font-medium transition-all ${
                                                    !isSocketConnected
                                                        ? 'cursor-not-allowed bg-white/10 text-white/50'
                                                        : 'border border-white/15 bg-white/10 text-white hover:bg-white/15'
                                                }`}
                                            >
                                                Create room
                                            </button>
                                        )}
                                        {inviteUrl && (
                                            <>
                                                <button
                                                    onClick={() => void copyInviteLink()}
                                                    className="rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm font-medium text-white transition-all hover:bg-white/15"
                                                >
                                                    Copy invite link
                                                </button>
                                                <button
                                                    onClick={() => void shareInviteLink()}
                                                    className="rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm font-medium text-white transition-all hover:bg-white/15"
                                                >
                                                    Share with friend
                                                </button>
                                            </>
                                        )}
                                    </div>

                                    {inviteUrl && (
                                        <div className="mt-4 rounded-[22px] border border-white/15 bg-white/10 px-4 py-3 text-sm text-white/85">
                                            <p className="text-xs uppercase tracking-[0.18em] text-white/60">Share link</p>
                                            <p className="mt-2 break-all font-medium">{inviteUrl}</p>
                                        </div>
                                    )}

                                    <div className="mt-5">
                                        <RoomWaveform samples={waveformSamples} active={isMicActive && !isMuted} />
                                    </div>

                                    <p className="mt-5 text-sm text-white/70">Use headphones. Both friends should tap the microphone to join audio. Coaching appears privately during pauses.</p>

                                    <div className="mt-8 grid gap-6 md:grid-cols-2">
                                        {[
                                            {
                                                label: userRole === 'userA' ? 'User A' : 'User B',
                                                name: selfLabel,
                                                icon: 'solar:user-circle-bold',
                                                accent: 'from-[#bfe8dc] to-[#7ec4b8]',
                                            },
                                            {
                                                label: userRole === 'userA' ? 'User B' : 'User A',
                                                name: partnerLabel,
                                                icon: 'solar:users-group-rounded-bold',
                                                accent: 'from-[#f7d7b5] to-[#e6a86d]',
                                            },
                                        ].map((participant) => (
                                            <div key={participant.label} className="rounded-[26px] border border-white/10 bg-white/10 p-5 backdrop-blur-md">
                                                <div className={`flex h-18 w-18 items-center justify-center rounded-[22px] bg-gradient-to-br ${participant.accent} text-[#111] shadow-lg`}>
                                                    <Icon icon={participant.icon} width="34" />
                                                </div>
                                                <p className="mt-4 text-xs uppercase tracking-[0.18em] text-white/55">{participant.label}</p>
                                                <h2 className="mt-1 text-2xl font-dm-sans font-semibold tracking-tight">{participant.name}</h2>
                                                <p className="mt-2 text-sm text-white/70">
                                                    {participant.name === selfLabel
                                                        ? isMicActive
                                                            ? isMuted ? 'Microphone muted' : 'Speaking live'
                                                            : 'Tap the mic after the room is connected'
                                                        : callState === 'connected'
                                                            ? 'Connected to the room'
                                                            : 'Waiting to join'}
                                                </p>
                                            </div>
                                        ))}
                                    </div>

                                    {liveTip && (
                                        <div className="mt-6 rounded-[22px] border border-amber-200/30 bg-amber-50/90 px-4 py-3 text-sm text-amber-900 shadow-sm">
                                            <div className="flex items-start gap-3">
                                                <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                                                    <Icon icon="solar:bolt-circle-bold" width="18" />
                                                </div>
                                                <div>
                                                    <p className="font-semibold">Live coaching tip</p>
                                                    <p className="mt-1 text-amber-900/80">{liveTip.tip}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {errorMessage && (
                                        <div className="mt-6 rounded-[22px] border border-rose-200/40 bg-rose-50/90 px-4 py-3 text-sm text-rose-900 shadow-sm">
                                            <div className="flex items-start gap-3">
                                                <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-rose-100 text-rose-700">
                                                    <Icon icon="solar:danger-circle-bold" width="18" />
                                                </div>
                                                <div>
                                                    <p className="font-semibold">Room issue</p>
                                                    <p className="mt-1 text-rose-900/80">{errorMessage}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="mt-8 flex flex-wrap items-center gap-3">
                                        <button
                                            aria-label={isMicActive ? 'Pause microphone' : 'Join audio'}
                                            disabled={callState !== 'connected' || !isSocketConnected}
                                            onClick={() => void toggleMicrophone()}
                                            className={`flex h-16 w-16 items-center justify-center rounded-full shadow-lg transition-all ${
                                                isMicActive ? 'bg-rose-500 text-white hover:bg-rose-600' : 'bg-white text-[#111] hover:bg-neutral-100'
                                            }`}
                                        >
                                            <Icon icon={isMicActive ? 'solar:stop-circle-bold' : 'solar:microphone-3-bold'} width="28" />
                                        </button>

                                        <div className="rounded-full border border-white/15 bg-white/10 px-4 py-3 text-sm text-white/80">
                                            {callState === 'idle' && 'Pick a room option first'}
                                            {callState === 'waiting-link' && 'Share your invite link and wait for them to join'}
                                            {callState === 'connected' && (isMicActive ? 'Mic live' : 'Tap Join audio on both devices')}
                                            {callState === 'ended' && 'Start again when you are ready'}
                                        </div>

                                        <button
                                            onClick={() => setIsMuted((current) => { isMutedRef.current = !current; if (!current) socketRef.current?.emit('audio-stream-end'); return !current; })}
                                            disabled={!roomId}
                                            className={`flex items-center gap-2 rounded-full border px-5 py-3 text-sm font-medium transition-all ${
                                                isMuted
                                                    ? 'border-amber-200 bg-amber-50 text-amber-700'
                                                    : 'border-white/15 bg-white/10 text-white hover:bg-white/15'
                                            } ${!roomId ? 'cursor-not-allowed opacity-60' : ''}`}
                                        >
                                            <Icon icon={isMuted ? 'solar:microphone-slash-bold' : 'solar:volume-loud-bold'} width="18" />
                                            {isMuted ? 'Muted' : 'Mute'}
                                        </button>

                                        <button
                                            onClick={() => void leaveRoom()}
                                            disabled={!roomId && callState !== 'waiting-link'}
                                            className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm font-medium text-white transition-all hover:bg-white/15"
                                        >
                                            <Icon icon="solar:phone-bold-duotone" width="18" className="rotate-[135deg]" />
                                            Leave
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-[28px] border border-[#e6e0d8] bg-white/75 p-6 shadow-[0_12px_32px_rgba(0,0,0,0.05)]">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-400">Transcript</p>
                                        <h2 className="mt-2 text-2xl font-dm-sans font-semibold tracking-tight text-[#111]">Conversation</h2>
                                    </div>
                                    <div className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-500">
                                        {transcripts.length} entries
                                    </div>
                                </div>

                                <div ref={transcriptPanelRef} className="mt-5 max-h-[460px] space-y-4 overflow-y-auto rounded-[24px] border border-neutral-200 bg-white p-4">
                                    {transcripts.length > 0 ? transcripts.map((entry) => (
                                        <div key={entry.id} className="border-b border-neutral-100 pb-4 last:border-b-0 last:pb-0">
                                            <p className="text-sm font-semibold text-[#111]">
                                                {entry.speakerLabel} <span className="font-normal text-neutral-400">— {formatTranscriptStamp(entry.createdAt)}</span>
                                            </p>
                                            <p className="mt-2 text-sm leading-relaxed text-neutral-600">{entry.transcript}</p>
                                        </div>
                                    )) : (
                                        <div className="rounded-[22px] border border-dashed border-neutral-200 bg-neutral-50/60 px-4 py-8 text-center">
                                            <p className="text-sm text-neutral-500">Your live transcript will appear here after Gemini processes each turn.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </section>

                        <aside className="space-y-6">
                            <div className="rounded-[28px] border border-[#e6e0d8] bg-[linear-gradient(180deg,rgba(255,255,255,0.92)_0%,rgba(245,248,247,0.98)_100%)] p-6 shadow-[0_12px_32px_rgba(0,0,0,0.05)]">
                                <p className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-400">AI Coach</p>
                                <h2 className="mt-2 text-2xl font-dm-sans font-semibold tracking-tight text-[#111]">Your pronunciation coach</h2>
                                <p className="mt-2 text-sm leading-relaxed text-neutral-500">
                                    Your coach listens to your voice and offers private feedback when you pause. Use headphones for the clearest call.
                                </p>

                                <div className="mt-6 space-y-4">
                                    {primaryFeedback ? (
                                        <>
                                            <div className="rounded-[24px] border border-neutral-200 bg-white p-4">
                                                <p className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-400">Transcript</p>
                                                <p className="mt-2 text-sm leading-relaxed text-neutral-700">{primaryFeedback.transcript || 'No transcript available yet.'}</p>
                                            </div>
                                            <div className="rounded-[24px] border border-emerald-100 bg-emerald-50/80 p-4">
                                                <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-600">Correction</p>
                                                <p className="mt-2 text-sm leading-relaxed text-emerald-900">{primaryFeedback.correction || 'Grammar looks good. Keep the sentence flowing naturally.'}</p>
                                            </div>
                                            <div className="rounded-[24px] border border-sky-100 bg-sky-50/80 p-4">
                                                <p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-600">Pronunciation tip</p>
                                                <p className="mt-2 text-sm leading-relaxed text-sky-900">{primaryFeedback.pronunciationTip || 'Keep the rhythm smooth and finish each word clearly.'}</p>
                                            </div>
                                            <div className="overflow-hidden rounded-[24px] border border-neutral-200 bg-white">
                                                <div className="overflow-x-auto">
                                                    <table className="min-w-full text-left text-sm">
                                                        <thead className="bg-neutral-50 text-neutral-500">
                                                            <tr>
                                                                <th className="px-4 py-3 font-medium">Word</th>
                                                                <th className="px-4 py-3 font-medium">Your Pronunciation</th>
                                                                <th className="px-4 py-3 font-medium">Correct Pronunciation</th>
                                                                <th className="px-4 py-3 font-medium">Phonetic</th>
                                                                <th className="px-4 py-3 font-medium">Tip</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {feedbackRows.length > 0 ? feedbackRows.map((row, index) => (
                                                                <tr key={`${row.word}-${index}`} className="border-t border-neutral-100 align-top">
                                                                    <td className="px-4 py-3 font-medium text-[#111]">{row.word}</td>
                                                                    <td className="px-4 py-3 text-neutral-600">{row.userPronunciation || 'Close to target'}</td>
                                                                    <td className="px-4 py-3 text-neutral-600">{row.correctPronunciation || 'Natural pronunciation'}</td>
                                                                    <td className="px-4 py-3 font-mono text-xs text-neutral-500">{row.phonetic || '—'}</td>
                                                                    <td className="px-4 py-3 text-neutral-600">{row.tip || 'Keep the word smooth and clear.'}</td>
                                                                </tr>
                                                            )) : (
                                                                <tr className="border-t border-neutral-100">
                                                                    <td colSpan={5} className="px-4 py-4 text-neutral-500">
                                                                        No major pronunciation issues detected in the final transcript.
                                                                    </td>
                                                                </tr>
                                                            )}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="rounded-[24px] border border-dashed border-neutral-200 bg-white/75 p-6 text-center">
                                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-neutral-100 text-neutral-500">
                                                <Icon icon="solar:stars-line-duotone" width="24" />
                                            </div>
                                            <p className="mt-4 text-sm leading-relaxed text-neutral-500">
                                                Tap Join audio on both devices. Talk naturally; your feedback appears here when you pause.
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-6 rounded-[24px] border border-neutral-200 bg-white p-4">
                                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-400">Ask Gemini</p>
                                    <div className="mt-3 flex flex-col gap-3">
                                        <input
                                            type="text"
                                            value={coachQuestion}
                                            onChange={(event) => setCoachQuestion(event.target.value)}
                                            onKeyDown={(event) => {
                                                if (event.key === 'Enter') {
                                                    submitCoachQuestion();
                                                }
                                            }}
                                            placeholder="Ask about words to improve..."
                                            className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-700 shadow-sm focus:border-emerald-200 focus:outline-none"
                                        />
                                        <button
                                            onClick={submitCoachQuestion}
                                            disabled={!roomId || isAskingCoach}
                                            className={`rounded-full px-5 py-3 text-sm font-medium transition-all ${
                                                !roomId || isAskingCoach
                                                    ? 'cursor-not-allowed bg-neutral-100 text-neutral-400'
                                                    : 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                            }`}
                                        >
                                            {isAskingCoach ? 'Asking Gemini...' : 'Ask Gemini'}
                                        </button>
                                    </div>
                                    {coachMessages.length > 0 && (
                                        <div className="mt-4 space-y-3">
                                            {coachMessages.map((msg) => (
                                                <div key={msg.id} className={`rounded-[18px] px-3 py-2 text-sm ${
                                                    msg.role === 'ai'
                                                        ? 'bg-emerald-50 text-emerald-900'
                                                        : 'bg-neutral-100 text-neutral-700'
                                                }`}>
                                                    {msg.text}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="rounded-[28px] border border-[#e6e0d8] bg-white/75 p-6 shadow-[0_12px_32px_rgba(0,0,0,0.05)]">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-400">Session Notes</p>
                                        <h3 className="mt-2 text-xl font-dm-sans font-semibold tracking-tight text-[#111]">Recent coaching</h3>
                                    </div>
                                    <Icon icon="solar:chat-round-call-bold-duotone" width="22" className="text-neutral-400" />
                                </div>

                                <div className="mt-5 space-y-3">
                                    {feedbackItems.slice(1).map((feedback) => (
                                        <div key={feedback.createdAt} className="rounded-[22px] border border-neutral-200 bg-neutral-50/70 p-4">
                                            <p className="text-sm font-semibold text-[#111]">{feedback.transcript || 'Live coaching update'}</p>
                                            <p className="mt-2 text-sm text-neutral-500">{feedback.pronunciationTip || feedback.correction || 'Keep speaking naturally to receive another tip.'}</p>
                                        </div>
                                    ))}
                                    {feedbackItems.length <= 1 && (
                                        <div className="rounded-[22px] border border-dashed border-neutral-200 bg-neutral-50/60 px-4 py-6 text-center">
                                            <p className="text-sm text-neutral-500">Coaching history from this room will collect here as you keep speaking.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </aside>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Rooms;
