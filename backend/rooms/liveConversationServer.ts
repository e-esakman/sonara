import { randomUUID } from 'crypto';
import type { Server as HttpServer } from 'http';
import { GoogleGenAI, Modality } from '@google/genai';
import { Server as SocketIOServer, Socket } from 'socket.io';

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

type RoomState = {
    roomId: string;
    userA: Participant;
    userB: Participant | null;
    geminiSessionA: SpeakerSession | null;
    geminiSessionB: SpeakerSession | null;
    audioBufferA: string[];
    audioBufferB: string[];
    lastTranscriptA: string;
    lastTranscriptB: string;
    createdFrom: 'queue' | 'invite';
};

type LiveSession = {
    sendRealtimeInput: (input: { audio: { data: string; mimeType: string } }) => void;
    close: () => void;
};

const COACH_INSTRUCTION = `You are Sonara's live conversation coach for one speaker in a two-person room.

Listen to the speaker's audio and respond only with compact JSON using this exact shape:
{"transcript":"","correction":"","pronunciationTip":"","interruptTip":""}

Rules:
- transcript: the speaker's spoken English, cleaned up and readable
- correction: grammar correction, or empty string if the grammar is already good
- pronunciationTip: one short pronunciation coaching tip, or empty string
- interruptTip: a very short immediate coaching cue only when there is a mistake worth interrupting for, otherwise empty string
- Never include markdown
- Never include extra keys
- Keep every field concise`;

const LIVE_MODEL = 'gemini-2.5-flash-native-audio-preview-12-2025';

const TRANSCRIPTION_PROMPT = `You are Sonara's conversation coach.

Analyze the provided spoken English audio and return compact JSON with this exact shape:
{"transcript":"","correction":"","pronunciationTip":"","interruptTip":""}

Rules:
- transcript: what the speaker said, cleaned up and readable
- correction: the corrected grammar, or empty string if grammar is already good
- pronunciationTip: one short pronunciation tip, or empty string
- interruptTip: keep empty string for this offline turn analysis
- return valid JSON only`;

class SpeakerSession {
    private session: LiveSession | null = null;
    private buffer = '';
    private readonly ai: GoogleGenAI;
    private readonly onFeedback: (feedback: AIFeedback) => void;
    private readonly onStatus: (status: string) => void;

    constructor(
        ai: GoogleGenAI,
        onFeedback: (feedback: AIFeedback) => void,
        onStatus: (status: string) => void,
    ) {
        this.ai = ai;
        this.onFeedback = onFeedback;
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
                        this.onStatus('Coach standing by');
                    },
                },
                config: {
                    responseModalities: [Modality.AUDIO],
                    inputAudioTranscription: {},
                    systemInstruction: {
                        parts: [{ text: COACH_INSTRUCTION }],
                    },
                },
            }) as unknown as LiveSession;
        } catch (error) {
            console.error('[ConversationRoom] Failed to connect Gemini session', error);
            this.onStatus('Coach unavailable');
        }
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
            this.session.sendRealtimeInput({ audioStreamEnd: true } as unknown as { audio: { data: string; mimeType: string } });
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
            this.onFeedback({
                transcript: inputTranscript,
                correction: '',
                pronunciationTip: '',
                interruptTip: '',
            });
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
            const parsed = JSON.parse(text.slice(start, end + 1)) as Partial<AIFeedback>;
            return {
                transcript: parsed.transcript?.trim() ?? '',
                correction: parsed.correction?.trim() ?? '',
                pronunciationTip: parsed.pronunciationTip?.trim() ?? '',
                interruptTip: parsed.interruptTip?.trim() ?? '',
            };
        } catch {
            return null;
        }
    }
}

export function setupConversationRoomServer(server: HttpServer, allowedOrigins: string[]) {
    const io = new SocketIOServer(server, {
        cors: {
            origin: allowedOrigins,
            credentials: true,
        },
    });

    const apiKey = process.env.GEMINI_LIVEVOICE_KEY || process.env.GEMINI_API_KEY;
    const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;
    const frontendBaseUrl = process.env.FRONTEND_URL || allowedOrigins[0] || 'http://localhost:5173';
    const waitingQueue: Participant[] = [];
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
        if (room.userA.socketId === socketId) return room.userB;
        return room.userA;
    };

    const removeFromQueue = (socketId: string) => {
        const index = waitingQueue.findIndex((participant) => participant.socketId === socketId);
        if (index >= 0) {
            waitingQueue.splice(index, 1);
        }
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

    const closeRoom = (roomId: string, departingSocketId?: string) => {
        const room = rooms.get(roomId);
        if (!room) {
            return;
        }

        room.geminiSessionA?.close();
        room.geminiSessionB?.close();

        rooms.delete(roomId);
        roomBySocket.delete(room.userA.socketId);
        if (room.userB) {
            roomBySocket.delete(room.userB.socketId);
        }

        if (departingSocketId) {
            const partner = getPartner(room, departingSocketId);
            if (partner) {
                io.to(partner.socketId).emit('room-ended', { message: 'Your partner left the room' });
            }
        }
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
                    hasCorrection: Boolean(feedback.correction),
                    hasPronunciationTip: Boolean(feedback.pronunciationTip),
                    createdAt: new Date().toISOString(),
                });
                emitTranscript(room, role, feedback.transcript);
                socket.emit('ai-feedback', {
                    transcript: feedback.transcript,
                    correction: feedback.correction,
                    pronunciationTip: feedback.pronunciationTip,
                    createdAt: new Date().toISOString(),
                });

                if (feedback.interruptTip) {
                    socket.emit('ai-tip', {
                        tip: feedback.interruptTip,
                        createdAt: new Date().toISOString(),
                    });
                }
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

    const getAudioBuffer = (room: RoomState, role: SpeakerRole) => (role === 'userA' ? room.audioBufferA : room.audioBufferB);

    const setAudioBuffer = (room: RoomState, role: SpeakerRole, chunks: string[]) => {
        if (role === 'userA') {
            room.audioBufferA = chunks;
        } else {
            room.audioBufferB = chunks;
        }
    };

    const decodeBase64 = (base64: string) => Buffer.from(base64, 'base64');

    const pcmChunksToWavBase64 = (chunks: string[]) => {
        const pcmBuffers = chunks.map(decodeBase64);
        const pcmData = Buffer.concat(pcmBuffers);
        const header = Buffer.alloc(44);
        const sampleRate = 16000;
        const channels = 1;
        const bitsPerSample = 16;
        const byteRate = sampleRate * channels * (bitsPerSample / 8);
        const blockAlign = channels * (bitsPerSample / 8);

        header.write('RIFF', 0);
        header.writeUInt32LE(36 + pcmData.length, 4);
        header.write('WAVE', 8);
        header.write('fmt ', 12);
        header.writeUInt32LE(16, 16);
        header.writeUInt16LE(1, 20);
        header.writeUInt16LE(channels, 22);
        header.writeUInt32LE(sampleRate, 24);
        header.writeUInt32LE(byteRate, 28);
        header.writeUInt16LE(blockAlign, 32);
        header.writeUInt16LE(bitsPerSample, 34);
        header.write('data', 36);
        header.writeUInt32LE(pcmData.length, 40);

        return Buffer.concat([header, pcmData]).toString('base64');
    };

    const analyzeBufferedAudio = async (room: RoomState, role: SpeakerRole) => {
        const chunks = getAudioBuffer(room, role);
        if (!ai || chunks.length === 0) {
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

            const wavBase64 = pcmChunksToWavBase64(chunks);
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: [
                    {
                        role: 'user',
                        parts: [
                            { text: TRANSCRIPTION_PROMPT },
                            {
                                inlineData: {
                                    data: wavBase64,
                                    mimeType: 'audio/wav',
                                },
                            },
                        ],
                    },
                ],
                config: {
                    responseMimeType: 'application/json',
                    temperature: 0.2,
                },
            });

            const text = response.text || '{}';
            const start = text.indexOf('{');
            const end = text.lastIndexOf('}');
            const parsed = JSON.parse(start !== -1 && end !== -1 ? text.slice(start, end + 1) : text) as Partial<AIFeedback>;
            const feedback: AIFeedback = {
                transcript: parsed.transcript?.trim() ?? '',
                correction: parsed.correction?.trim() ?? '',
                pronunciationTip: parsed.pronunciationTip?.trim() ?? '',
                interruptTip: '',
            };

            if (feedback.transcript || feedback.correction || feedback.pronunciationTip) {
                socket.emit('room-debug', {
                    type: 'gemini-transcript',
                    transcript: feedback.transcript,
                    hasCorrection: Boolean(feedback.correction),
                    hasPronunciationTip: Boolean(feedback.pronunciationTip),
                    createdAt: new Date().toISOString(),
                });

                emitTranscript(room, role, feedback.transcript);
                socket.emit('ai-feedback', {
                    transcript: feedback.transcript,
                    correction: feedback.correction,
                    pronunciationTip: feedback.pronunciationTip,
                    createdAt: new Date().toISOString(),
                });
                socket.emit('room-debug', {
                    type: 'gemini-status',
                    status: 'Transcript ready',
                    createdAt: new Date().toISOString(),
                });
            } else {
                socket.emit('room-debug', {
                    type: 'gemini-status',
                    status: 'No transcript returned',
                    createdAt: new Date().toISOString(),
                });
            }
        } catch (error) {
            console.error('[ConversationRoom] Failed to analyze buffered audio', error);
            socket.emit('room-debug', {
                type: 'gemini-status',
                status: 'Gemini analysis failed',
                createdAt: new Date().toISOString(),
            });
        } finally {
            setAudioBuffer(room, role, []);
        }
    };

    const ensureSpeakerSession = async (room: RoomState, role: SpeakerRole) => {
        const key = role === 'userA' ? 'geminiSessionA' : 'geminiSessionB';
        let session = room[key];
        if (!session) {
            session = await createSpeakerSession(room, role);
            room[key] = session;
        }
        return session;
    };

    const finalizeRoom = async (room: RoomState) => {
        if (!room.userB) {
            return;
        }

        const firstSocket = io.sockets.sockets.get(room.userA.socketId);
        const secondSocket = io.sockets.sockets.get(room.userB.socketId);
        if (!firstSocket || !secondSocket) {
            return;
        }

        firstSocket.emit('room-ready', {
            roomId: room.roomId,
            role: 'userA',
            selfLabel: room.userA.label,
            partnerLabel: room.userB.label,
        });
        secondSocket.emit('room-ready', {
            roomId: room.roomId,
            role: 'userB',
            selfLabel: room.userB.label,
            partnerLabel: room.userA.label,
        });

        io.to(room.roomId).emit('call-status', { status: 'Connected' });

        if (!ai) {
            io.to(room.roomId).emit('coach-status', { status: 'Gemini API key missing' });
            return;
        }
        io.to(room.roomId).emit('coach-status', { status: 'Coach standing by' });
    };

    const createRoom = (creator: Participant, createdFrom: 'queue' | 'invite') => {
        const roomId = `room-${randomUUID()}`;
        const room: RoomState = {
            roomId,
            userA: creator,
            userB: null,
            geminiSessionA: null,
            geminiSessionB: null,
            audioBufferA: [],
            audioBufferB: [],
            lastTranscriptA: '',
            lastTranscriptB: '',
            createdFrom,
        };
        rooms.set(roomId, room);
        roomBySocket.set(creator.socketId, roomId);
        return room;
    };

    io.on('connection', (socket: Socket) => {
        socket.emit('call-status', { status: 'Ready to join queue' });

        socket.on('join-queue', async ({ name }: { name?: string } = {}) => {
            if (roomBySocket.has(socket.id)) {
                return;
            }

            socket.data.displayName = name?.trim() || socket.data.displayName || 'Guest';
            removeFromQueue(socket.id);

            const waitingPartner = waitingQueue.shift();
            if (!waitingPartner) {
                waitingQueue.push(makeParticipant(socket, 'userA', socket.data.displayName));
                socket.emit('queue-status', { status: 'Waiting for a partner...' });
                return;
            }

            const room = createRoom(waitingPartner, 'queue');
            room.userB = makeParticipant(socket, 'userB', socket.data.displayName);
            io.sockets.sockets.get(waitingPartner.socketId)?.join(room.roomId);
            socket.join(room.roomId);
            roomBySocket.set(room.userB.socketId, room.roomId);
            await finalizeRoom(room);
        });

        socket.on('create-invite-room', ({ name }: { name?: string } = {}) => {
            if (roomBySocket.has(socket.id)) {
                return;
            }

            socket.data.displayName = name?.trim() || socket.data.displayName || 'Host';
            removeFromQueue(socket.id);

            const room = createRoom(makeParticipant(socket, 'userA', socket.data.displayName), 'invite');
            socket.join(room.roomId);
            socket.emit('invite-room-created', {
                roomId: room.roomId,
                shareUrl: `${frontendBaseUrl}/rooms?room=${encodeURIComponent(room.roomId)}`,
                role: 'userA',
                selfLabel: room.userA.label,
            });
            socket.emit('call-status', { status: 'Invite link ready. Waiting for your friend...' });
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

            if (room.userB && room.userB.socketId !== socket.id) {
                emitRoomError(socket, 'This room already has two people.');
                return;
            }

            socket.data.displayName = name?.trim() || socket.data.displayName || 'Guest';
            removeFromQueue(socket.id);

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

            const mimeType = payload.pcmMimeType ?? 'audio/pcm;rate=16000';
            setAudioBuffer(room, role, [...getAudioBuffer(room, role), payload.pcmData]);
            const session = await ensureSpeakerSession(room, role);
            socket.emit('room-debug', {
                type: 'audio-sent',
                createdAt: new Date().toISOString(),
            });
            const sent = session?.sendAudio(payload.pcmData, mimeType);
            if (sent) {
                socket.emit('room-debug', {
                    type: 'gemini-audio-received',
                    createdAt: new Date().toISOString(),
                });
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

            const session = await ensureSpeakerSession(room, role);
            session?.endAudioTurn();
            await analyzeBufferedAudio(room, role);
        });

        socket.on('leave-room', () => {
            removeFromQueue(socket.id);
            const roomId = roomBySocket.get(socket.id);
            if (!roomId) {
                socket.emit('room-ended', { message: 'You left the queue' });
                return;
            }

            closeRoom(roomId, socket.id);
            socket.emit('room-ended', { message: 'You left the room' });
        });

        socket.on('disconnect', () => {
            removeFromQueue(socket.id);
            const roomId = roomBySocket.get(socket.id);
            if (roomId) {
                closeRoom(roomId, socket.id);
            }
        });
    });
}
