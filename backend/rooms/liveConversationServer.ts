import { randomUUID } from 'crypto';
import type { Server as HttpServer } from 'http';
import { SpeechClient } from '@google-cloud/speech';
import { GoogleGenAI, Modality } from '@google/genai';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { runAnalysisPipeline } from '../agents/analysisPipeline.ts';
import { checkGrammar } from '../agents/grammarAgent.ts';
import { processSpeech } from '../agents/speechProcessor.ts';

type SpeakerRole = 'userA' | 'userB';

type TranscriptEntry = {
    id: string;
    roomId: string;
    speakerRole: SpeakerRole;
    speakerLabel: string;
    transcript: string;
    createdAt: string;
};

type AIFeedback = {
    transcript: string;
    correction: string;
    pronunciationTip: string;
    interruptTip: string;
};

type FeedbackSeverity = 'green' | 'yellow' | 'red';

type Participant = {
    socketId: string;
    label: string;
    role: SpeakerRole;
};

type ClientAudioPayload = {
    pcmData?: string;
    pcmMimeType?: string;
    mediaData?: string;
    mediaMimeType?: string;
};

type ClientTranscriptPayload = {
    transcript?: string;
};

type RoomState = {
    roomId: string;
    userA: Participant;
    userB: Participant | null;
    geminiSessionA: SpeakerSession | null;
    geminiSessionB: SpeakerSession | null;
    sttStreamA: ReturnType<SpeechClient['streamingRecognize']> | null;
    sttStreamB: ReturnType<SpeechClient['streamingRecognize']> | null;
    transcriptBufferA: string[];
    transcriptBufferB: string[];
    analysisTimerA: NodeJS.Timeout | null;
    analysisTimerB: NodeJS.Timeout | null;
    turnTimerA: NodeJS.Timeout | null;
    turnTimerB: NodeJS.Timeout | null;
    lastTranscriptA: string;
    lastTranscriptB: string;
    lastFeedbackA: string;
    lastFeedbackB: string;
};

type LiveSession = {
    sendRealtimeInput: (input: { audio: { data: string; mimeType: string } } | { audioStreamEnd: true }) => void;
    close: () => void;
};

const COACH_INSTRUCTION = `You are an AI pronunciation coach inside a live voice conversation application.

Return ONLY valid JSON using this exact format:
{
  "transcript": "clean sentence transcript",
  "correction": "grammar fix or cleaned sentence",
  "pronunciationTip": "short pronunciation coaching",
  "interruptTip": "very short immediate correction"
}

Rules:
- The application sends short speech segments.
- Keep every field short and direct.
- No markdown.
- No extra keys.
- transcript must be readable and cleaned of filler words.
- correction should be the exact sentence the user should repeat, or empty if not needed.
- pronunciationTip should be short, direct, and instructional.
- interruptTip should be immediate and imperative, for example "Pronounce: working."
- If speech is already clear, leave correction, pronunciationTip, and interruptTip empty.`;

const LIVE_MODEL = process.env.GEMINI_LIVE_MODEL || 'gemini-2.5-flash-native-audio-latest';
const STT_LANGUAGE = process.env.STT_LANGUAGE || 'en-US';

class SpeakerSession {
    private session: LiveSession | null = null;
    private buffer = '';
    private readonly ai: GoogleGenAI;
    private readonly onFeedback: (feedback: AIFeedback) => void;
    private readonly onLiveTranscript: (transcript: string, isFinal: boolean) => void;
    private readonly onStatus: (status: string) => void;

    constructor(
        ai: GoogleGenAI,
        onFeedback: (feedback: AIFeedback) => void,
        onLiveTranscript: (transcript: string, isFinal: boolean) => void,
        onStatus: (status: string) => void,
    ) {
        this.ai = ai;
        this.onFeedback = onFeedback;
        this.onLiveTranscript = onLiveTranscript;
        this.onStatus = onStatus;
    }

    async connect() {
        if (this.session) {
            return;
        }

        try {
            this.session = await this.ai.live.connect({
                model: LIVE_MODEL,
                callbacks: {
                    onopen: () => this.onStatus('Coach connected'),
                    onmessage: (message: object) => {
                        this.handleMessage(message as {
                            serverContent?: {
                                inputTranscription?: { text?: string };
                                turnComplete?: boolean;
                                modelTurn?: { parts?: Array<{ text?: string }> };
                            };
                        });
                    },
                    onerror: () => this.onStatus('Coach unavailable'),
                    onclose: () => {
                        this.session = null;
                        this.onStatus('Coach reconnecting...');
                    },
                },
                config: {
                    responseModalities: [Modality.TEXT],
                    inputAudioTranscription: {},
                    systemInstruction: { parts: [{ text: COACH_INSTRUCTION }] },
                },
            }) as unknown as LiveSession;
        } catch (error) {
            console.error('[ConversationRoom] Failed to connect Gemini session', error);
            this.onStatus('Coach unavailable');
        }
    }

    get isConnected() {
        return this.session !== null;
    }

    sendAudio(audio: string, mimeType: string) {
        if (!this.session) {
            return false;
        }

        try {
            this.session.sendRealtimeInput({
                audio: {
                    data: audio,
                    mimeType,
                },
            });
            return true;
        } catch (error) {
            console.error('[ConversationRoom] Failed to forward audio to Gemini', error);
            return false;
        }
    }

    endAudioTurn() {
        if (!this.session) {
            return;
        }

        try {
            this.session.sendRealtimeInput({ audioStreamEnd: true });
        } catch (error) {
            console.error('[ConversationRoom] Failed to end Gemini audio stream', error);
        }
    }

    close() {
        this.buffer = '';
        if (!this.session) {
            return;
        }

        try {
            this.session.close();
        } catch {
            // intentionally ignored
        }
        this.session = null;
    }

    private handleMessage(message: {
        serverContent?: {
            inputTranscription?: { text?: string };
            turnComplete?: boolean;
            modelTurn?: { parts?: Array<{ text?: string }> };
        };
    }) {
        const inputTranscript = message.serverContent?.inputTranscription?.text?.trim();
        if (inputTranscript) {
            this.onLiveTranscript(inputTranscript, Boolean(message.serverContent?.turnComplete));
        }

        const parts = message.serverContent?.modelTurn?.parts ?? [];
        for (const part of parts) {
            if (!part.text) {
                continue;
            }

            this.buffer += part.text;
            const feedback = this.tryParseFeedback(this.buffer) ?? this.tryParseFeedback(part.text);
            if (feedback) {
                this.onFeedback(feedback);
                this.buffer = '';
            }
        }

        if (message.serverContent?.turnComplete) {
            this.buffer = '';
        }
    }

    private tryParseFeedback(text: string): AIFeedback | null {
        const start = text.indexOf('{');
        const end = text.lastIndexOf('}');
        if (start === -1 || end === -1 || end <= start) {
            return null;
        }

        try {
            return normalizeFeedback(JSON.parse(text.slice(start, end + 1)) as Partial<AIFeedback>);
        } catch {
            return null;
        }
    }
}

function normalizeFeedback(feedback: Partial<AIFeedback>): AIFeedback {
    return {
        transcript: feedback.transcript?.trim() ?? '',
        correction: feedback.correction?.trim() ?? '',
        pronunciationTip: feedback.pronunciationTip?.trim() ?? '',
        interruptTip: feedback.interruptTip?.trim() ?? '',
    };
}

export function setupConversationRoomServer(server: HttpServer, allowedOrigins: string[]) {
    const io = new SocketIOServer(server, {
        cors: {
            origin: allowedOrigins,
            credentials: true,
        },
    });

    const speechClient = process.env.GOOGLE_APPLICATION_CREDENTIALS ? new SpeechClient() : null;
    const apiKey = process.env.GEMINI_LIVEVOICE_KEY || process.env.GEMINI_API_KEY;
    const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;
    const frontendBaseUrl = process.env.FRONTEND_URL || allowedOrigins[0] || 'http://localhost:5173';
    const useGeminiTranscription = process.env.USE_GEMINI_TRANSCRIPTION !== '0';
    const rooms = new Map<string, RoomState>();
    const roomBySocket = new Map<string, string>();

    const makeParticipant = (socket: Socket, role: SpeakerRole, name?: string): Participant => ({
        socketId: socket.id,
        label: name?.trim() || socket.data.displayName || (role === 'userA' ? 'User A' : 'User B'),
        role,
    });

    const emitRoomError = (socket: Socket, message: string) => {
        socket.emit('room-error', { message });
    };

    const getRole = (room: RoomState, socketId: string): SpeakerRole | null => {
        if (room.userA.socketId === socketId) return 'userA';
        if (room.userB?.socketId === socketId) return 'userB';
        return null;
    };

    const getParticipant = (room: RoomState, role: SpeakerRole) => (role === 'userA' ? room.userA : room.userB);

    const getPartner = (room: RoomState, socketId: string) => {
        if (room.userA.socketId === socketId) {
            return room.userB;
        }
        return room.userA;
    };

    const getFeedbackSeverity = (feedback: AIFeedback): FeedbackSeverity => {
        if (feedback.interruptTip || feedback.pronunciationTip) {
            return 'red';
        }
        if (feedback.correction && feedback.correction !== feedback.transcript) {
            return 'yellow';
        }
        return 'green';
    };

    const buildSpeechText = (feedback: AIFeedback) => {
        const lines: string[] = [];

        if (feedback.interruptTip) {
            lines.push(feedback.interruptTip);
        }
        if (feedback.correction && feedback.correction !== feedback.transcript) {
            lines.push(`Say: ${feedback.correction}`);
        }
        if (feedback.pronunciationTip) {
            lines.push(feedback.pronunciationTip.startsWith('Pronounce:')
                ? feedback.pronunciationTip
                : `Pronounce: ${feedback.pronunciationTip}`);
        }

        return lines.join(' ');
    };

    const emitFeedback = (room: RoomState, role: SpeakerRole, feedback: AIFeedback) => {
        const participant = getParticipant(room, role);
        if (!participant) {
            return;
        }

        const socket = io.sockets.sockets.get(participant.socketId);
        if (!socket) {
            return;
        }

        const feedbackKey = role === 'userA' ? 'lastFeedbackA' : 'lastFeedbackB';
        const fingerprint = JSON.stringify(feedback);
        if (room[feedbackKey] === fingerprint) {
            return;
        }
        room[feedbackKey] = fingerprint;

        socket.emit('ai-feedback', {
            ...feedback,
            severity: getFeedbackSeverity(feedback),
            speechText: buildSpeechText(feedback),
            createdAt: new Date().toISOString(),
        });
    };

    const emitTranscript = (room: RoomState, role: SpeakerRole, transcript: string) => {
        if (!transcript) {
            return;
        }

        const lastTranscriptKey = role === 'userA' ? 'lastTranscriptA' : 'lastTranscriptB';
        if (room[lastTranscriptKey] === transcript) {
            return;
        }

        room[lastTranscriptKey] = transcript;
        const speaker = getParticipant(room, role);
        const entry: TranscriptEntry = {
            id: randomUUID(),
            roomId: room.roomId,
            speakerRole: role,
            speakerLabel: speaker?.label || (role === 'userA' ? 'User A' : 'User B'),
            transcript,
            createdAt: new Date().toISOString(),
        };

        io.to(room.roomId).emit('transcript-entry', entry);
    };

    const cleanupRoom = (roomId: string) => {
        const room = rooms.get(roomId);
        if (!room) {
            return;
        }

        room.geminiSessionA?.close();
        room.geminiSessionB?.close();
        room.sttStreamA?.destroy();
        room.sttStreamB?.destroy();
        if (room.analysisTimerA) clearTimeout(room.analysisTimerA);
        if (room.analysisTimerB) clearTimeout(room.analysisTimerB);
        if (room.turnTimerA) clearTimeout(room.turnTimerA);
        if (room.turnTimerB) clearTimeout(room.turnTimerB);

        rooms.delete(roomId);
        roomBySocket.delete(room.userA.socketId);
        if (room.userB) {
            roomBySocket.delete(room.userB.socketId);
        }
    };

    const clearSpeakerState = (room: RoomState, role: SpeakerRole) => {
        if (role === 'userA') {
            room.geminiSessionA?.close();
            room.geminiSessionA = null;
            room.sttStreamA?.destroy();
            room.sttStreamA = null;
            if (room.analysisTimerA) clearTimeout(room.analysisTimerA);
            if (room.turnTimerA) clearTimeout(room.turnTimerA);
            room.analysisTimerA = null;
            room.turnTimerA = null;
            room.transcriptBufferA = [];
            room.lastTranscriptA = '';
            room.lastFeedbackA = '';
            return;
        }

        room.geminiSessionB?.close();
        room.geminiSessionB = null;
        room.sttStreamB?.destroy();
        room.sttStreamB = null;
        if (room.analysisTimerB) clearTimeout(room.analysisTimerB);
        if (room.turnTimerB) clearTimeout(room.turnTimerB);
        room.analysisTimerB = null;
        room.turnTimerB = null;
        room.transcriptBufferB = [];
        room.lastTranscriptB = '';
        room.lastFeedbackB = '';
    };

    const promoteUserBToUserA = (room: RoomState) => {
        if (!room.userB) {
            return;
        }

        room.userA = room.userB;
        room.userA.role = 'userA';
        room.userB = null;
        room.geminiSessionA = room.geminiSessionB;
        room.geminiSessionB = null;
        room.sttStreamA = room.sttStreamB;
        room.sttStreamB = null;
        room.transcriptBufferA = room.transcriptBufferB;
        room.transcriptBufferB = [];
        room.analysisTimerA = room.analysisTimerB;
        room.analysisTimerB = null;
        room.turnTimerA = room.turnTimerB;
        room.turnTimerB = null;
        room.lastTranscriptA = room.lastTranscriptB;
        room.lastTranscriptB = '';
        room.lastFeedbackA = room.lastFeedbackB;
        room.lastFeedbackB = '';
    };

    const closeRoom = (roomId: string, departingSocketId?: string) => {
        const room = rooms.get(roomId);
        if (!room) {
            return;
        }

        const role = departingSocketId ? getRole(room, departingSocketId) : null;
        if (!departingSocketId || !role) {
            cleanupRoom(roomId);
            return;
        }

        roomBySocket.delete(departingSocketId);

        if (role === 'userB') {
            clearSpeakerState(room, 'userB');
            room.userB = null;
        } else if (room.userB) {
            clearSpeakerState(room, 'userA');
            promoteUserBToUserA(room);
        } else {
            cleanupRoom(roomId);
            return;
        }

        const remainingSocket = io.sockets.sockets.get(room.userA.socketId);
        if (!remainingSocket) {
            cleanupRoom(roomId);
            return;
        }

        remainingSocket.join(room.roomId);
        remainingSocket.emit('room-ended', { message: 'Your partner left the conversation' });
        remainingSocket.emit('user-left', {
            roomId,
            speakerLabel: 'Partner',
        });
        remainingSocket.emit('room-ready', {
            roomId: room.roomId,
            role: 'userA',
            selfLabel: room.userA.label,
            partnerLabel: 'Waiting for join',
        });
        io.to(room.roomId).emit('call-status', { status: 'Waiting for another speaker...' });
    };

    const emitLiveTranscript = (room: RoomState, role: SpeakerRole, transcript: string, isFinal: boolean) => {
        const speaker = getParticipant(room, role);
        io.to(room.roomId).emit('live-transcript', {
            roomId: room.roomId,
            transcript,
            isFinal,
            speakerRole: role,
            speakerLabel: speaker?.label || (role === 'userA' ? 'User A' : 'User B'),
            createdAt: new Date().toISOString(),
        });
    };

    const handleTranscript = (room: RoomState, role: SpeakerRole, transcript: string, isFinal: boolean) => {
        const clean = transcript.trim();
        if (!clean) {
            return;
        }

        emitLiveTranscript(room, role, clean, isFinal);

        if (!isFinal) {
            return;
        }

        emitTranscript(room, role, clean);
        const buffer = getTranscriptBuffer(room, role);
        setTranscriptBuffer(room, role, [...buffer, clean]);
        scheduleAnalysis(room, role);
    };

    const getTranscriptBuffer = (room: RoomState, role: SpeakerRole) =>
        role === 'userA' ? room.transcriptBufferA : room.transcriptBufferB;

    const setTranscriptBuffer = (room: RoomState, role: SpeakerRole, segments: string[]) => {
        if (role === 'userA') {
            room.transcriptBufferA = segments;
            return;
        }
        room.transcriptBufferB = segments;
    };

    const getAnalysisTimer = (room: RoomState, role: SpeakerRole) =>
        role === 'userA' ? room.analysisTimerA : room.analysisTimerB;

    const setAnalysisTimer = (room: RoomState, role: SpeakerRole, timer: NodeJS.Timeout | null) => {
        if (role === 'userA') {
            room.analysisTimerA = timer;
            return;
        }
        room.analysisTimerB = timer;
    };

    const getTurnTimer = (room: RoomState, role: SpeakerRole) =>
        role === 'userA' ? room.turnTimerA : room.turnTimerB;

    const setTurnTimer = (room: RoomState, role: SpeakerRole, timer: NodeJS.Timeout | null) => {
        if (role === 'userA') {
            room.turnTimerA = timer;
            return;
        }
        room.turnTimerB = timer;
    };

    const getSttStream = (room: RoomState, role: SpeakerRole) =>
        role === 'userA' ? room.sttStreamA : room.sttStreamB;

    const setSttStream = (room: RoomState, role: SpeakerRole, stream: ReturnType<SpeechClient['streamingRecognize']> | null) => {
        if (role === 'userA') {
            room.sttStreamA = stream;
            return;
        }
        room.sttStreamB = stream;
    };

    const createSpeakerSession = async (room: RoomState, role: SpeakerRole) => {
        const participant = getParticipant(room, role);
        if (!participant || !ai) {
            return null;
        }

        const socket = io.sockets.sockets.get(participant.socketId);
        if (!socket) {
            return null;
        }

        const session = new SpeakerSession(
            ai,
            (feedback) => {
                socket.emit('room-debug', {
                    type: 'gemini-transcript',
                    transcript: feedback.transcript,
                    createdAt: new Date().toISOString(),
                });
                emitFeedback(room, role, feedback);
            },
            (transcript, isFinal) => {
                handleTranscript(room, role, transcript, isFinal);
            },
            (status) => {
                socket.emit('room-debug', {
                    type: 'gemini-status',
                    status,
                    createdAt: new Date().toISOString(),
                });
                socket.emit('coach-status', { status });
            },
        );

        await session.connect();
        return session;
    };

    const ensureSpeakerSession = async (room: RoomState, role: SpeakerRole) => {
        const key = role === 'userA' ? 'geminiSessionA' : 'geminiSessionB';
        let session = room[key];
        if (!session || !session.isConnected) {
            session?.close();
            session = await createSpeakerSession(room, role);
            room[key] = session;
        }
        return session;
    };

    const analyzeTranscriptText = async (room: RoomState, role: SpeakerRole, transcript: string) => {
        if (!transcript) {
            return;
        }

        const participant = getParticipant(room, role);
        if (!participant) {
            return;
        }

        const socket = io.sockets.sockets.get(participant.socketId);
        if (!socket) {
            return;
        }

        try {
            socket.emit('room-debug', {
                type: 'gemini-status',
                status: 'Analyzing speech turn',
                createdAt: new Date().toISOString(),
            });

            const [analysis, grammar] = await Promise.all([
                runAnalysisPipeline(transcript, transcript),
                checkGrammar(transcript),
            ]);

            const firstProblemWord = analysis.speakCorrectWords?.[0] || analysis.incorrectWords?.[0] || analysis.unclearWords?.[0] || '';
            const correction = typeof grammar.correction === 'string'
                && grammar.correction.trim().length > 0
                && !grammar.correction.toLowerCase().includes('error occurred while checking grammar')
                && !grammar.correction.toLowerCase().includes('cannot check grammar')
                    ? grammar.correction.trim()
                    : transcript;

            const feedback: AIFeedback = {
                transcript,
                correction,
                pronunciationTip: analysis.tips?.[0] || analysis.suggestions?.[0] || '',
                interruptTip: firstProblemWord ? `Pronounce: ${firstProblemWord}.` : '',
            };

            emitFeedback(room, role, feedback);

            socket.emit('room-debug', {
                type: 'gemini-status',
                status: 'Transcript ready',
                createdAt: new Date().toISOString(),
            });
        } catch (error) {
            console.error('[ConversationRoom] Failed to analyze transcript', error);
            socket.emit('room-debug', {
                type: 'gemini-status',
                status: 'Gemini analysis failed',
                createdAt: new Date().toISOString(),
            });
        }
    };

    const scheduleAnalysis = (room: RoomState, role: SpeakerRole) => {
        if (getAnalysisTimer(room, role)) {
            return;
        }

        const timer = setTimeout(async () => {
            setAnalysisTimer(room, role, null);
            const buffer = getTranscriptBuffer(room, role);
            if (buffer.length === 0) {
                return;
            }

            setTranscriptBuffer(room, role, []);
            const combined = buffer.join(' ').trim();
            if (!combined) {
                return;
            }

            const processed = processSpeech(combined);
            const cleanText = processed.tokens.join(' ').trim();
            await analyzeTranscriptText(room, role, cleanText || combined);
        }, 1000);

        setAnalysisTimer(room, role, timer);
    };

    const ensureSttStream = (room: RoomState, role: SpeakerRole) => {
        if (!speechClient) {
            return null;
        }

        const existing = getSttStream(room, role);
        if (existing) {
            return existing;
        }

        const stream = speechClient.streamingRecognize({
            config: {
                encoding: 'LINEAR16',
                sampleRateHertz: 16000,
                languageCode: STT_LANGUAGE,
                enableAutomaticPunctuation: true,
                model: 'latest_long',
            },
            interimResults: true,
            singleUtterance: false,
        });

        stream.on('data', (data) => {
            const result = data.results?.[0];
            const transcript = result?.alternatives?.[0]?.transcript?.trim();
            if (!transcript) {
                return;
            }

            const isFinal = Boolean(result?.isFinal);
            handleTranscript(room, role, transcript, isFinal);
        });

        stream.on('error', (error) => {
            console.error('[ConversationRoom] STT stream error', error);
            setSttStream(room, role, null);
        });

        setSttStream(room, role, stream);
        return stream;
    };

    const finalizeRoom = async (room: RoomState) => {
        const firstSocket = io.sockets.sockets.get(room.userA.socketId);
        if (!firstSocket) {
            return;
        }

        firstSocket.emit('room-ready', {
            roomId: room.roomId,
            role: 'userA',
            selfLabel: room.userA.label,
            partnerLabel: room.userB?.label ?? 'Waiting for join',
        });

        if (room.userB) {
            const secondSocket = io.sockets.sockets.get(room.userB.socketId);
            secondSocket?.emit('room-ready', {
                roomId: room.roomId,
                role: 'userB',
                selfLabel: room.userB.label,
                partnerLabel: room.userA.label,
            });
        }

        io.to(room.roomId).emit('call-status', { status: room.userB ? 'Connected' : 'Invite link ready. Waiting for your friend...' });
        io.to(room.roomId).emit('coach-status', { status: ai ? 'Coach standing by' : 'Gemini API key missing' });

        if (ai) {
            await ensureSpeakerSession(room, 'userA');
            if (room.userB) {
                await ensureSpeakerSession(room, 'userB');
            }
        }

        io.to(room.roomId).emit('user-joined', {
            roomId: room.roomId,
            participants: [
                { role: 'userA', label: room.userA.label },
                ...(room.userB ? [{ role: 'userB' as const, label: room.userB.label }] : []),
            ],
        });

        if (room.userB) {
            firstSocket.emit('user-connected', {
                title: 'Speaker connected',
                message: 'You can start talking',
            });

            const secondSocket = io.sockets.sockets.get(room.userB.socketId);
            secondSocket?.emit('user-connected', {
                title: 'Connected to room host',
                message: 'Start speaking',
            });
        }
    };

    const createRoom = (creator: Participant) => {
        const roomId = `room-${randomUUID()}`;
        const room: RoomState = {
            roomId,
            userA: creator,
            userB: null,
            geminiSessionA: null,
            geminiSessionB: null,
            sttStreamA: null,
            sttStreamB: null,
            transcriptBufferA: [],
            transcriptBufferB: [],
            analysisTimerA: null,
            analysisTimerB: null,
            turnTimerA: null,
            turnTimerB: null,
            lastTranscriptA: '',
            lastTranscriptB: '',
            lastFeedbackA: '',
            lastFeedbackB: '',
        };

        rooms.set(roomId, room);
        roomBySocket.set(creator.socketId, roomId);
        return room;
    };

    io.on('connection', (socket: Socket) => {
        socket.emit('call-status', { status: 'Ready to start a call' });

        socket.on('start-call', async ({ name }: { name?: string } = {}) => {
            if (roomBySocket.has(socket.id)) {
                return;
            }

            socket.data.displayName = name?.trim() || 'Host';
            const room = createRoom(makeParticipant(socket, 'userA', socket.data.displayName));
            socket.join(room.roomId);
            socket.emit('invite-room-created', {
                roomId: room.roomId,
                shareUrl: `${frontendBaseUrl}/rooms?room=${encodeURIComponent(room.roomId)}`,
                role: 'userA',
                selfLabel: room.userA.label,
            });
            await finalizeRoom(room);
        });

        socket.on('create-invite-room', async ({ name }: { name?: string } = {}) => {
            socket.emit('room-debug', {
                type: 'gemini-status',
                status: 'Legacy event redirected to start-call',
                createdAt: new Date().toISOString(),
            });
            if (roomBySocket.has(socket.id)) {
                return;
            }

            socket.data.displayName = name?.trim() || 'Host';
            const room = createRoom(makeParticipant(socket, 'userA', socket.data.displayName));
            socket.join(room.roomId);
            socket.emit('invite-room-created', {
                roomId: room.roomId,
                shareUrl: `${frontendBaseUrl}/rooms?room=${encodeURIComponent(room.roomId)}`,
                role: 'userA',
                selfLabel: room.userA.label,
            });
            await finalizeRoom(room);
        });

        socket.on('join-room', async ({ roomId, name }: { roomId?: string; name?: string } = {}) => {
            if (!roomId) {
                emitRoomError(socket, 'Missing room link.');
                return;
            }

            if (roomBySocket.has(socket.id)) {
                return;
            }

            const room = rooms.get(roomId);
            if (!room) {
                emitRoomError(socket, 'This room link is invalid or expired.');
                return;
            }

            if (room.userB) {
                socket.emit('room-full', { roomId, message: 'This call already has two people.' });
                return;
            }

            socket.data.displayName = name?.trim() || 'Guest';
            room.userB = makeParticipant(socket, 'userB', socket.data.displayName);
            roomBySocket.set(socket.id, room.roomId);
            socket.join(room.roomId);
            await finalizeRoom(room);
        });

        socket.on('audio-stream', async (payload: ClientAudioPayload) => {
            const roomId = roomBySocket.get(socket.id);
            if (!roomId) {
                return;
            }

            const room = rooms.get(roomId);
            if (!room) {
                return;
            }

            const role = getRole(room, socket.id);
            if (!role) {
                return;
            }

            const partner = getPartner(room, socket.id);
            if (payload.mediaData && partner) {
                io.to(partner.socketId).emit('partner-audio', {
                    audio: payload.mediaData,
                    mimeType: payload.mediaMimeType ?? 'audio/webm;codecs=opus',
                });
            }

            if (!payload.pcmData) {
                return;
            }

            socket.emit('room-debug', {
                type: 'audio-sent',
                createdAt: new Date().toISOString(),
            });

            if (useGeminiTranscription || !speechClient) {
                const session = await ensureSpeakerSession(room, role);
                const forwarded = session?.sendAudio(payload.pcmData, payload.pcmMimeType ?? 'audio/pcm;rate=16000');
                if (forwarded) {
                    socket.emit('room-debug', {
                        type: 'gemini-audio-received',
                        createdAt: new Date().toISOString(),
                    });
                }

                if (forwarded) {
                    const existingTimer = getTurnTimer(room, role);
                    if (existingTimer) {
                        clearTimeout(existingTimer);
                    }
                    // 2.5s matches the frontend SILENCE_MS (2s) plus network latency buffer
                    const timer = setTimeout(async () => {
                        setTurnTimer(room, role, null);
                        const activeSession = await ensureSpeakerSession(room, role);
                        activeSession?.endAudioTurn();
                    }, 2500);
                    setTurnTimer(room, role, timer);
                }

                if (forwarded || !speechClient) {
                    return;
                }
            }

            const stream = ensureSttStream(room, role);
            if (!stream) {
                socket.emit('room-debug', {
                    type: 'gemini-status',
                    status: 'Transcription unavailable',
                    createdAt: new Date().toISOString(),
                });
                return;
            }

            try {
                stream.write(Buffer.from(payload.pcmData, 'base64'));
            } catch (error) {
                console.error('[ConversationRoom] Failed to send audio to STT', error);
            }
        });

        socket.on('audio-stream-end', async () => {
            const roomId = roomBySocket.get(socket.id);
            if (!roomId) {
                return;
            }

            const room = rooms.get(roomId);
            if (!room) {
                return;
            }

            const role = getRole(room, socket.id);
            if (!role) {
                return;
            }

            const turnTimer = getTurnTimer(room, role);
            if (turnTimer) {
                clearTimeout(turnTimer);
                setTurnTimer(room, role, null);
            }

            if (useGeminiTranscription || !speechClient) {
                const session = await ensureSpeakerSession(room, role);
                if (session || !speechClient) {
                    session?.endAudioTurn();
                    return;
                }
            }

            const stream = getSttStream(room, role);
            if (stream) {
                stream.end();
                setSttStream(room, role, null);
            }

            if (getTranscriptBuffer(room, role).length > 0) {
                scheduleAnalysis(room, role);
            }
        });

        socket.on('client-live-transcript', ({ transcript }: ClientTranscriptPayload = {}) => {
            const roomId = roomBySocket.get(socket.id);
            if (!roomId || !transcript) {
                return;
            }

            const room = rooms.get(roomId);
            if (!room) {
                return;
            }

            const role = getRole(room, socket.id);
            if (!role) {
                return;
            }

            handleTranscript(room, role, transcript, false);
        });

        socket.on('client-final-transcript', ({ transcript }: ClientTranscriptPayload = {}) => {
            const roomId = roomBySocket.get(socket.id);
            if (!roomId || !transcript) {
                return;
            }

            const room = rooms.get(roomId);
            if (!room) {
                return;
            }

            const role = getRole(room, socket.id);
            if (!role) {
                return;
            }

            handleTranscript(room, role, transcript, true);
        });

        socket.on('leave-room', () => {
            const roomId = roomBySocket.get(socket.id);
            if (!roomId) {
                socket.emit('room-ended', { message: 'You left the call' });
                return;
            }

            closeRoom(roomId, socket.id);
            socket.emit('room-ended', { message: 'You left the call' });
        });

        socket.on('disconnect', () => {
            const roomId = roomBySocket.get(socket.id);
            if (roomId) {
                closeRoom(roomId, socket.id);
            }
        });
    });
}
