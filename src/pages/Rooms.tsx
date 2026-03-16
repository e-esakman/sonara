import { useEffect, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import type { Socket } from 'socket.io-client';
import { useStore } from '../store/useStore';
import RoomWaveform from '../components/RoomWaveform';
import {
    base64ToBlob,
    blobToBase64,
    copyToClipboard,
    createConversationRoomSocket,
    type AIFeedback,
    type AITip,
    type InviteRoomCreatedPayload,
    type RoomReadyPayload,
    type TranscriptEntry,
    pcmFloat32ToBase64,
} from '../services/liveConversationRoom';

type CallState = 'idle' | 'queueing' | 'waiting-link' | 'connected' | 'ended';

const relayMimeType = (() => {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        return 'audio/webm;codecs=opus';
    }
    return 'audio/webm';
})();

const Rooms = () => {
    const { user } = useStore();
    const [callState, setCallState] = useState<CallState>('idle');
    const [callStatus, setCallStatus] = useState('Ready to join a room');
    const [coachStatus, setCoachStatus] = useState('AI coach standing by');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isSocketConnected, setIsSocketConnected] = useState(false);
    const [roomId, setRoomId] = useState<string | null>(null);
    const [userRole, setUserRole] = useState<'userA' | 'userB'>('userA');
    const [selfLabel, setSelfLabel] = useState(user?.name || 'You');
    const [partnerLabel, setPartnerLabel] = useState('Waiting for match');
    const [inviteUrl, setInviteUrl] = useState('');
    const [isMuted, setIsMuted] = useState(false);
    const [isMicActive, setIsMicActive] = useState(false);
    const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
    const [feedbackItems, setFeedbackItems] = useState<AIFeedback[]>([]);
    const [liveTip, setLiveTip] = useState<AITip | null>(null);
    const [waveformSamples, setWaveformSamples] = useState<number[]>([]);
    const [lastAudioSentAt, setLastAudioSentAt] = useState<string | null>(null);
    const [lastGeminiAudioAt, setLastGeminiAudioAt] = useState<string | null>(null);
    const [lastTranscriptAt, setLastTranscriptAt] = useState<string | null>(null);
    const [lastTranscriptText, setLastTranscriptText] = useState('');

    const socketRef = useRef<Socket | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const relayRecorderRef = useRef<MediaRecorder | null>(null);
    const micContextRef = useRef<AudioContext | null>(null);
    const pcmProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const micSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const isMutedRef = useRef(false);
    const isRoomActiveRef = useRef(false);
    const inviteJoinAttemptedRef = useRef(false);
    const liveTipTimeoutRef = useRef<number | null>(null);
    const partnerAudioQueueRef = useRef<Array<{ audio: string; mimeType: string }>>([]);
    const isPlayingPartnerAudioRef = useRef(false);

    useEffect(() => {
        isMutedRef.current = isMuted;
    }, [isMuted]);

    useEffect(() => {
        const socket = createConversationRoomSocket();
        socketRef.current = socket;

        socket.on('connect', () => {
            setIsSocketConnected(true);
            setErrorMessage(null);
            setCallStatus('Ready to join a room');

            const roomParam = new URLSearchParams(window.location.search).get('room');
            if (roomParam && !inviteJoinAttemptedRef.current) {
                inviteJoinAttemptedRef.current = true;
                setCallState('waiting-link');
                setCallStatus('Joining shared room...');
                socket.emit('join-room', { roomId: roomParam, name: user?.name || 'Guest' });
            }
        });

        socket.on('connect_error', () => {
            setIsSocketConnected(false);
            setCallState('idle');
            setCallStatus('Room server offline');
            setCoachStatus('AI coach unavailable');
            setErrorMessage('Unable to reach the room server on port 8080. Start the backend and try again.');
        });

        socket.on('disconnect', () => {
            setIsSocketConnected(false);
            setCallState('idle');
            setCallStatus('Disconnected from room server');
        });

        socket.on('queue-status', ({ status }: { status: string }) => {
            setCallState('queueing');
            setCallStatus(status);
            setPartnerLabel('Waiting for match');
            setErrorMessage(null);
        });

        socket.on('invite-room-created', (payload: InviteRoomCreatedPayload) => {
            setRoomId(payload.roomId);
            setUserRole(payload.role);
            setSelfLabel(payload.selfLabel);
            setInviteUrl(payload.shareUrl);
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
            setRoomId(payload.roomId);
            setUserRole(payload.role);
            setSelfLabel(payload.selfLabel);
            setPartnerLabel(payload.partnerLabel);
            setCallState('connected');
            setCallStatus('Room connected. Tap the mic to start speaking.');
            isRoomActiveRef.current = true;
            setErrorMessage(null);
        });

        socket.on('room-error', ({ message }: { message: string }) => {
            setErrorMessage(message);
            setCallStatus('Room unavailable');
        });

        socket.on('transcript-entry', (entry: TranscriptEntry) => {
            setTranscripts((current) => [entry, ...current].slice(0, 24));
        });

        socket.on('ai-feedback', (feedback: AIFeedback) => {
            setFeedbackItems((current) => [feedback, ...current].slice(0, 12));
        });

        socket.on('room-debug', (payload: {
            type: 'audio-sent' | 'gemini-audio-received' | 'gemini-transcript' | 'gemini-status';
            createdAt: string;
            transcript?: string;
            status?: string;
        }) => {
            if (payload.type === 'audio-sent') {
                setLastAudioSentAt(payload.createdAt);
            } else if (payload.type === 'gemini-audio-received') {
                setLastGeminiAudioAt(payload.createdAt);
            } else if (payload.type === 'gemini-transcript') {
                setLastTranscriptAt(payload.createdAt);
                setLastTranscriptText(payload.transcript || '');
            } else if (payload.type === 'gemini-status' && payload.status) {
                setCoachStatus(payload.status);
            }
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

        socket.on('partner-audio', ({ audio, mimeType }: { audio: string; mimeType: string }) => {
            partnerAudioQueueRef.current.push({ audio, mimeType });
            void playNextPartnerChunk();
        });

        socket.on('room-ended', ({ message }: { message: string }) => {
            setCallState('ended');
            setCallStatus(message);
            setRoomId(null);
            setInviteUrl('');
            setPartnerLabel('Waiting for match');
            isRoomActiveRef.current = false;
            stopSpeaking();
        });

        return () => {
            if (liveTipTimeoutRef.current) {
                window.clearTimeout(liveTipTimeoutRef.current);
            }
            stopSpeaking();
            mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
            socket.disconnect();
        };
    }, [user?.name]);

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

        const finishPlayback = () => {
            URL.revokeObjectURL(url);
            isPlayingPartnerAudioRef.current = false;
            void playNextPartnerChunk();
        };

        audio.onended = finishPlayback;
        audio.onerror = finishPlayback;

        try {
            await audio.play();
        } catch {
            finishPlayback();
        }
    };

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

    const stopSpeaking = () => {
        socketRef.current?.emit('audio-stream-end');

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
        setWaveformSamples([]);
    };

    const startSpeaking = async () => {
        if (!roomId || !socketRef.current) {
            setErrorMessage('Join a room before starting the microphone.');
            return;
        }

        if (isMicActive) {
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

            if (isMutedRef.current || !isRoomActiveRef.current) {
                return;
            }

            const inputData = event.inputBuffer.getChannelData(0);
            let sum = 0;
            for (let i = 0; i < inputData.length; i += 1) {
                sum += inputData[i] * inputData[i];
            }
            const rms = Math.sqrt(sum / inputData.length);
            const normalized = Math.min(1, rms * 6 + 0.08);
            setWaveformSamples((current) => [...current.slice(-27), normalized]);

            const pcmData = pcmFloat32ToBase64(inputData);
            socket.emit('audio-stream', {
                pcmData,
                pcmMimeType: 'audio/pcm;rate=16000',
            });
        };

        const relayRecorder = new MediaRecorder(stream, { mimeType: relayMimeType });
        relayRecorder.ondataavailable = async (event) => {
            if (!event.data.size || isMutedRef.current || !isRoomActiveRef.current) {
                return;
            }

            try {
                const mediaData = await blobToBase64(event.data);
                socket.emit('audio-stream', {
                    mediaData,
                    mediaMimeType: event.data.type || relayMimeType,
                });
            } catch {
                setErrorMessage('Could not process a microphone chunk for room audio.');
            }
        };

        relayRecorder.onstop = () => {
            setIsMicActive(false);
        };

        relayRecorder.start(300);
        relayRecorderRef.current = relayRecorder;
        setIsMicActive(true);
        setCallStatus('Microphone live');
    };

    const joinQueue = () => {
        if (!socketRef.current) {
            setErrorMessage('Room connection is still initializing.');
            return;
        }

        if (!isSocketConnected) {
            socketRef.current.connect();
            setErrorMessage('Trying to reconnect to the room server...');
            return;
        }

        setInviteUrl('');
        setTranscripts([]);
        setFeedbackItems([]);
        setLiveTip(null);
        setLastAudioSentAt(null);
        setLastGeminiAudioAt(null);
        setLastTranscriptAt(null);
        setLastTranscriptText('');
        setCallState('queueing');
        setCallStatus('Joining anonymous queue...');
        setErrorMessage(null);
        socketRef.current.emit('join-queue', { name: user?.name || 'Guest' });
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
        setLastAudioSentAt(null);
        setLastGeminiAudioAt(null);
        setLastTranscriptAt(null);
        setLastTranscriptText('');
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

    const toggleMicrophone = async () => {
        if (!roomId || callState !== 'connected') {
            setErrorMessage('Match with someone or open a shared room before turning on the microphone.');
            return;
        }

        if (isMicActive) {
            stopSpeaking();
            setCallStatus('Microphone paused');
            return;
        }

        try {
            await startSpeaking();
        } catch {
            // Error state is already set in ensureMicrophone.
        }
    };

    const leaveRoom = () => {
        stopSpeaking();
        socketRef.current?.emit('leave-room');
        setRoomId(null);
        setInviteUrl('');
        setPartnerLabel('Waiting for match');
        isRoomActiveRef.current = false;
        setCallState('ended');
        setCallStatus('You left the room');
    };

    const primaryFeedback = feedbackItems[0];
    const inviteParam = new URLSearchParams(window.location.search).get('room');
    const showInviteButton = !inviteParam && !inviteUrl && !roomId;
    const formatStamp = (value: string | null) =>
        value ? new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Waiting';

    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(194,230,222,0.28),_transparent_28%),linear-gradient(180deg,_#fbfbfa_0%,_#f3efe8_100%)] pt-36 pb-20">
            <div className="mx-auto max-w-6xl px-6 md:px-10">
                <div className="rounded-[34px] border border-[#e6e0d8] bg-[linear-gradient(180deg,rgba(255,255,255,0.84)_0%,rgba(246,242,236,0.98)_100%)] shadow-[0_18px_45px_rgba(0,0,0,0.06)]">
                    <div className="border-b border-[#e6e0d8] px-6 py-6 sm:px-8">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-[0.2em] text-neutral-400">Rooms</p>
                                <h1 className="mt-2 text-[34px] font-dm-sans font-semibold tracking-tight text-[#111]">Live Conversation Room</h1>
                                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-neutral-500">
                                    Match with another learner or share a direct room link, then speak live while Gemini listens for grammar and pronunciation coaching.
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
                                                <span className={`h-3 w-3 rounded-full ${callState === 'connected' ? 'bg-emerald-400' : callState === 'queueing' || callState === 'waiting-link' ? 'bg-amber-300' : 'bg-white/50'}`} />
                                                <p className="text-lg font-medium">{callStatus}</p>
                                            </div>
                                        </div>
                                        <div className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/70">
                                            {roomId ? roomId.slice(0, 8) : 'Lobby'}
                                        </div>
                                    </div>

                                    <div className="mt-6 flex flex-wrap gap-3">
                                        <button
                                            onClick={joinQueue}
                                            disabled={!!roomId || !isSocketConnected}
                                            className={`rounded-full px-5 py-3 text-sm font-medium transition-all ${
                                                !!roomId || !isSocketConnected
                                                    ? 'cursor-not-allowed bg-white/10 text-white/50'
                                                    : 'bg-white text-[#111] hover:bg-neutral-100'
                                            }`}
                                        >
                                            Find partner
                                        </button>
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
                                                Create invite link
                                            </button>
                                        )}
                                        {inviteUrl && (
                                            <button
                                                onClick={() => void copyInviteLink()}
                                                className="rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm font-medium text-white transition-all hover:bg-white/15"
                                            >
                                                Copy invite link
                                            </button>
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

                                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                                        {[
                                            {
                                                label: 'Audio sent',
                                                value: formatStamp(lastAudioSentAt),
                                                active: !!lastAudioSentAt,
                                                icon: 'solar:microphone-3-bold',
                                            },
                                            {
                                                label: 'Gemini received audio',
                                                value: formatStamp(lastGeminiAudioAt),
                                                active: !!lastGeminiAudioAt,
                                                icon: 'solar:soundwave-bold',
                                            },
                                            {
                                                label: 'Gemini returned transcript',
                                                value: lastTranscriptAt ? `${formatStamp(lastTranscriptAt)}` : 'Waiting',
                                                active: !!lastTranscriptAt,
                                                icon: 'solar:chat-round-dots-bold',
                                            },
                                        ].map((item) => (
                                            <div key={item.label} className={`rounded-[22px] border px-4 py-4 ${
                                                item.active ? 'border-emerald-200/40 bg-emerald-50/12' : 'border-white/10 bg-white/8'
                                            }`}>
                                                <div className="flex items-center gap-2 text-white/80">
                                                    <Icon icon={item.icon} width="16" />
                                                    <p className="text-xs uppercase tracking-[0.16em]">{item.label}</p>
                                                </div>
                                                <p className="mt-3 text-sm font-medium text-white">{item.value}</p>
                                            </div>
                                        ))}
                                    </div>

                                    {lastTranscriptText && (
                                        <div className="mt-4 rounded-[22px] border border-sky-200/20 bg-sky-50/10 px-4 py-3 text-sm text-white/90">
                                            <p className="text-xs uppercase tracking-[0.16em] text-white/60">Latest Gemini transcript</p>
                                            <p className="mt-2">{lastTranscriptText}</p>
                                        </div>
                                    )}

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
                                            onClick={() => void toggleMicrophone()}
                                            className={`flex h-16 w-16 items-center justify-center rounded-full shadow-lg transition-all ${
                                                isMicActive ? 'bg-rose-500 text-white hover:bg-rose-600' : 'bg-white text-[#111] hover:bg-neutral-100'
                                            }`}
                                        >
                                            <Icon icon={isMicActive ? 'solar:stop-circle-bold' : 'solar:microphone-3-bold'} width="28" />
                                        </button>

                                        <div className="rounded-full border border-white/15 bg-white/10 px-4 py-3 text-sm text-white/80">
                                            {callState === 'idle' && 'Pick a room option first'}
                                            {callState === 'queueing' && 'Searching for another learner'}
                                            {callState === 'waiting-link' && 'Share your invite link and wait for them to join'}
                                            {callState === 'connected' && (isMicActive ? 'Mic live' : 'Room ready for speech')}
                                            {callState === 'ended' && 'Start again when you are ready'}
                                        </div>

                                        <button
                                            onClick={() => setIsMuted((current) => !current)}
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
                                            onClick={leaveRoom}
                                            disabled={!roomId && callState !== 'queueing' && callState !== 'waiting-link'}
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
                                        <h2 className="mt-2 text-2xl font-dm-sans font-semibold tracking-tight text-[#111]">Conversation Feed</h2>
                                    </div>
                                    <div className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-500">
                                        {transcripts.length} entries
                                    </div>
                                </div>

                                <div className="mt-5 space-y-3">
                                    {transcripts.length > 0 ? transcripts.map((entry) => (
                                        <div key={entry.id} className="rounded-[22px] border border-neutral-200 bg-neutral-50/70 px-4 py-3">
                                            <div className="flex items-center justify-between gap-4">
                                                <p className="text-sm font-semibold text-[#111]">{entry.speakerLabel}</p>
                                                <p className="text-xs text-neutral-400">
                                                    {new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
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
                                <h2 className="mt-2 text-2xl font-dm-sans font-semibold tracking-tight text-[#111]">Speaker Feedback</h2>
                                <p className="mt-2 text-sm leading-relaxed text-neutral-500">
                                    Gemini analyzes your speech privately and returns your transcript, correction, and pronunciation tip here.
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
                                        </>
                                    ) : (
                                        <div className="rounded-[24px] border border-dashed border-neutral-200 bg-white/75 p-6 text-center">
                                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-neutral-100 text-neutral-500">
                                                <Icon icon="solar:stars-line-duotone" width="24" />
                                            </div>
                                            <p className="mt-4 text-sm leading-relaxed text-neutral-500">
                                                Once the room is connected, tap the mic and start speaking. Gemini will stream coaching here.
                                            </p>
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
