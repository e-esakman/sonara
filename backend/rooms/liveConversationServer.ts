import { randomUUID } from 'crypto';
import type { Server as HttpServer } from 'http';
import { GoogleGenAI } from '@google/genai';
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

type PronunciationFeedbackRow = {
    word: string;
    userPronunciation: string;
    correctPronunciation: string;
    phonetic: string;
    tip: string;
};

type AIFeedback = {
    transcript: string;
    correction: string;
    pronunciationTip: string;
    interruptTip: string;
    rows: PronunciationFeedbackRow[];
};

type Participant = {
    socketId: string;
    label: string;
    role: SpeakerRole;
    reconnectToken: string;
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
    geminiKeyA: string | null;
    geminiKeyB: string | null;
    lastFeedbackA: AIFeedback | null;
    lastFeedbackB: AIFeedback | null;
    audioBufferA: string[];
    audioBufferB: string[];
    lastTranscriptA: string;
    lastTranscriptB: string;
    lastFeedbackSignatureA: string;
    lastFeedbackSignatureB: string;
    disconnectTimerA: ReturnType<typeof setTimeout> | null;
    disconnectTimerB: ReturnType<typeof setTimeout> | null;
    inviteExpiryTimer: ReturnType<typeof setTimeout> | null;
};

const INVITE_TTL_MS = 10 * 60 * 1000;
const RECONNECT_GRACE_MS = 15 * 1000;
const ANALYSIS_MODEL = process.env.GEMINI_ANALYSIS_MODEL || 'gemini-3.6-flash';

const TURN_ANALYSIS_PROMPT = `You are Sonara's post-speech pronunciation coach.

Analyze the provided spoken English audio and return compact JSON using this exact shape:
{
  "transcript": "",
  "correction": "",
  "pronunciationTip": "",
  "interruptTip": "",
  "rows": [
    {
      "word": "",
      "userPronunciation": "",
      "correctPronunciation": "",
      "phonetic": "",
      "tip": ""
    }
  ]
}

Rules:
- transcript: the speaker's final cleaned transcript
- correction: corrected sentence, or empty string if not needed
- pronunciationTip: one short overall pronunciation tip
- interruptTip: always return an empty string
- rows: include 1 to 5 pronunciation issues only when clearly audible, otherwise []
- Never infer sound errors from the transcript alone. Do not treat a regional accent as an error. If uncertain, say so.
- userPronunciation: approximate what the speaker said in simple syllables
- correctPronunciation: the corrected pronunciation in simple syllables
- phonetic: use IPA if possible
- tip: one concise actionable coaching tip
- Return valid JSON only`;

const COACH_QA_PROMPT = `You are Sonara's conversation coach inside a two-person room.\n\nAnswer the user's question using the latest pronunciation feedback context if provided.\nRules:\n- Keep it to 1-2 short sentences\n- If there is no recent feedback, ask the user to speak a full sentence first\n- No markdown or extra formatting`;

export function setupConversationRoomServer(server: HttpServer, allowedOrigins: string[]) {
    const io = new SocketIOServer(server, {
        cors: {
            origin: allowedOrigins,
            credentials: true,
        },
    });

    const keyList = (process.env.GEMINI_ROOM_KEYS || process.env.GEMINI_API_KEYS || '')
        .split(',')
        .map((key) => key.trim())
        .filter(Boolean);
    const fallbackKey = process.env.GEMINI_LIVEVOICE_KEY || process.env.GEMINI_API_KEY || '';
    const roomKeys = keyList.length > 0 ? keyList : (fallbackKey ? [fallbackKey] : []);
    const keyUsage = new Map<string, number>();
    const aiPool = new Map<string, GoogleGenAI>();

    for (const key of roomKeys) {
        keyUsage.set(key, 0);
    }

    const getAiInstance = (key: string) => {
        const existing = aiPool.get(key);
        if (existing) {
            return existing;
        }

        const next = new GoogleGenAI({ apiKey: key });
        aiPool.set(key, next);
        return next;
    };

    const reserveLeastLoadedKey = (increment = true) => {
        if (roomKeys.length === 0) {
            return null;
        }

        let selected = roomKeys[0];
        let minLoad = keyUsage.get(selected) ?? 0;
        for (const key of roomKeys) {
            const load = keyUsage.get(key) ?? 0;
            if (load < minLoad) {
                minLoad = load;
                selected = key;
            }
        }

        if (increment) {
            keyUsage.set(selected, (keyUsage.get(selected) ?? 0) + 1);
        }
        return selected;
    };

    const releaseKey = (key: string | null) => {
        if (!key) {
            return;
        }

        const current = keyUsage.get(key) ?? 0;
        keyUsage.set(key, Math.max(0, current - 1));
    };

    const frontendBaseUrl = process.env.FRONTEND_URL || allowedOrigins[0] || 'http://localhost:5173';
    const rooms = new Map<string, RoomState>();
    const roomBySocket = new Map<string, string>();

    const makeParticipant = (socket: Socket, role: SpeakerRole, name?: string): Participant => ({
        socketId: socket.id,
        label: name?.trim() || socket.data.displayName || (role === 'userA' ? 'User A' : 'User B'),
        role,
        reconnectToken: randomUUID(),
    });

    const emitRoomError = (socket: Socket, message: string) => {
        socket.emit('room-error', { message });
    };

    const getParticipant = (room: RoomState, role: SpeakerRole) => (role === 'userA' ? room.userA : room.userB);

    const getParticipantBySocket = (room: RoomState, socketId: string) => {
        if (room.userA.socketId === socketId) {
            return room.userA;
        }

        if (room.userB?.socketId === socketId) {
            return room.userB;
        }

        return null;
    };

    const getPartner = (room: RoomState, role: SpeakerRole) => (role === 'userA' ? room.userB : room.userA);

    const emitToParticipant = (room: RoomState, role: SpeakerRole, event: string, payload: Record<string, unknown>) => {
        const participant = getParticipant(room, role);
        if (!participant) {
            return;
        }

        io.to(participant.socketId).emit(event, payload);
    };

    const clearInviteExpiry = (room: RoomState) => {
        if (room.inviteExpiryTimer) {
            clearTimeout(room.inviteExpiryTimer);
            room.inviteExpiryTimer = null;
        }
    };

    const clearDisconnectTimer = (room: RoomState, role: SpeakerRole) => {
        const key = role === 'userA' ? 'disconnectTimerA' : 'disconnectTimerB';
        if (room[key]) {
            clearTimeout(room[key]);
            room[key] = null;
        }
    };

    const getAudioBuffer = (room: RoomState, role: SpeakerRole) => (role === 'userA' ? room.audioBufferA : room.audioBufferB);

    const setAudioBuffer = (room: RoomState, role: SpeakerRole, chunks: string[]) => {
        if (role === 'userA') {
            room.audioBufferA = chunks;
            return;
        }

        room.audioBufferB = chunks;
    };

    const mergeTranscript = (previous: string, next: string) => {
        const prev = previous.trim();
        const incoming = next.trim();

        if (!incoming) {
            return prev;
        }

        if (!prev) {
            return incoming;
        }

        if (incoming === prev || prev.endsWith(incoming)) {
            return prev;
        }

        if (incoming.startsWith(prev)) {
            return incoming;
        }

        const prevWords = prev.split(/\s+/);
        const nextWords = incoming.split(/\s+/);
        const maxOverlap = Math.min(prevWords.length, nextWords.length);

        for (let overlap = maxOverlap; overlap > 0; overlap -= 1) {
            const prevSuffix = prevWords.slice(-overlap).join(' ').toLowerCase();
            const nextPrefix = nextWords.slice(0, overlap).join(' ').toLowerCase();
            if (prevSuffix === nextPrefix) {
                return `${prev} ${nextWords.slice(overlap).join(' ')}`.trim();
            }
        }

        return incoming;
    };

    const emitTranscript = (room: RoomState, role: SpeakerRole, transcript: string) => {
        const key = role === 'userA' ? 'lastTranscriptA' : 'lastTranscriptB';
        const mergedTranscript = mergeTranscript(room[key], transcript);
        if (!mergedTranscript || room[key] === mergedTranscript) {
            return;
        }

        room[key] = mergedTranscript;
        const speaker = getParticipant(room, role);
        const entry: TranscriptEntry = {
            id: randomUUID(),
            roomId: room.roomId,
            speakerRole: role,
            speakerLabel: speaker?.label || (role === 'userA' ? 'User A' : 'User B'),
            transcript: mergedTranscript,
            createdAt: new Date().toISOString(),
        };

        io.to(room.roomId).emit('transcript-entry', entry);
    };

    const closeRoom = (roomId: string, departingRole?: SpeakerRole, partnerMessage?: string) => {
        const room = rooms.get(roomId);
        if (!room) {
            return;
        }

        clearInviteExpiry(room);
        clearDisconnectTimer(room, 'userA');
        clearDisconnectTimer(room, 'userB');
        releaseKey(room.geminiKeyA);
        releaseKey(room.geminiKeyB);
        io.in(roomId).socketsLeave(roomId);

        rooms.delete(roomId);
        roomBySocket.delete(room.userA.socketId);
        if (room.userB) {
            roomBySocket.delete(room.userB.socketId);
        }

        if (departingRole) {
            const partner = getPartner(room, departingRole);
            if (partner) {
                io.to(partner.socketId).emit('room-ended', { message: partnerMessage ?? 'Your partner left the room' });
            }
        }
    };

    const pcmChunksToWavBase64 = (chunks: string[]) => {
        const pcmData = Buffer.concat(chunks.map(chunk => Buffer.from(chunk, 'base64')));
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

    const sanitizeRows = (rows: unknown): PronunciationFeedbackRow[] => {
        if (!Array.isArray(rows)) {
            return [];
        }

        return rows
            .map((row) => {
                const item = (row && typeof row === 'object' ? row : {}) as Partial<PronunciationFeedbackRow>;
                return {
                    word: typeof item.word === 'string' ? item.word.trim() : '',
                    userPronunciation: typeof item.userPronunciation === 'string' ? item.userPronunciation.trim() : '',
                    correctPronunciation: typeof item.correctPronunciation === 'string' ? item.correctPronunciation.trim() : '',
                    phonetic: typeof item.phonetic === 'string' ? item.phonetic.trim() : '',
                    tip: typeof item.tip === 'string' ? item.tip.trim() : '',
                };
            })
            .filter((row) => row.word || row.tip || row.phonetic)
            .slice(0, 5);
    };

    const analysisQueues = new Map<string, Promise<void>>();

    const analyzeBufferedAudio = async (room: RoomState, role: SpeakerRole) => {
        const chunks = getAudioBuffer(room, role);
        setAudioBuffer(room, role, []);
        if (!ANALYSIS_MODEL || chunks.length === 0) {
            setAudioBuffer(room, role, []);
            if (!ANALYSIS_MODEL) {
                emitToParticipant(room, role, 'room-debug', {
                    type: 'gemini-status',
                    status: 'Gemini analysis model missing',
                    createdAt: new Date().toISOString(),
                });
            }
            return;
        }

        const keySlot = role === 'userA' ? 'geminiKeyA' : 'geminiKeyB';
        if (!room[keySlot]) {
            room[keySlot] = reserveLeastLoadedKey();
        }
        const aiInstance = room[keySlot] ? getAiInstance(room[keySlot] as string) : null;
        if (!aiInstance) {
            setAudioBuffer(room, role, []);
            emitToParticipant(room, role, 'room-debug', {
                type: 'gemini-status',
                status: 'Gemini API key missing',
                createdAt: new Date().toISOString(),
            });
            return;
        }

        const queueKey = `${room.roomId}:${role}`;
        if (analysisQueues.has(queueKey)) return;
        const previous = Promise.resolve();
        let finish!: () => void;
        const current = new Promise<void>(resolve => { finish = resolve; });
        analysisQueues.set(queueKey, current);
        await previous;
        try {
            emitToParticipant(room, role, 'room-debug', {
                type: 'gemini-status',
                status: 'Analyzing speech turn',
                createdAt: new Date().toISOString(),
            });

            const response = await aiInstance.models.generateContent({
                model: ANALYSIS_MODEL,
                contents: [
                    {
                        role: 'user',
                        parts: [
                            { text: TURN_ANALYSIS_PROMPT },
                            {
                                inlineData: {
                                    data: pcmChunksToWavBase64(chunks),
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
            const parsed = JSON.parse(start !== -1 && end !== -1 ? text.slice(start, end + 1) : text) as Partial<AIFeedback> & {
                rows?: unknown[];
            };
            const feedback: AIFeedback = {
                transcript: typeof parsed.transcript === 'string' ? parsed.transcript.trim() : '',
                correction: typeof parsed.correction === 'string' ? parsed.correction.trim() : '',
                pronunciationTip: typeof parsed.pronunciationTip === 'string' ? parsed.pronunciationTip.trim() : '',
                interruptTip: '',
                rows: sanitizeRows(parsed.rows),
            };

            if (!rooms.has(room.roomId)) return;
            const signatureKey = role === 'userA' ? 'lastFeedbackSignatureA' : 'lastFeedbackSignatureB';
            const signature = JSON.stringify({
                transcript: feedback.transcript,
                correction: feedback.correction,
                pronunciationTip: feedback.pronunciationTip,
                rows: feedback.rows,
            });

            if (room[signatureKey] === signature) {
                return;
            }

            room[signatureKey] = signature;

            if (feedback.transcript) {
                emitTranscript(room, role, feedback.transcript);
            }

            if (feedback.transcript || feedback.correction || feedback.pronunciationTip || feedback.rows.length > 0) {
                if (role === 'userA') {
                    room.lastFeedbackA = feedback;
                } else {
                    room.lastFeedbackB = feedback;
                }
                emitToParticipant(room, role, 'ai-feedback', {
                    transcript: feedback.transcript,
                    correction: feedback.correction,
                    pronunciationTip: feedback.pronunciationTip,
                    rows: feedback.rows,
                    createdAt: new Date().toISOString(),
                });
                emitToParticipant(room, role, 'room-debug', {
                    type: 'gemini-status',
                    status: 'Transcript ready',
                    createdAt: new Date().toISOString(),
                });
            } else {
                emitToParticipant(room, role, 'room-debug', {
                    type: 'gemini-status',
                    status: 'No transcript returned',
                    createdAt: new Date().toISOString(),
                });
            }
        } catch (error) {
            console.error('[ConversationRoom] Failed to analyze buffered audio', error);
            emitToParticipant(room, role, 'room-debug', {
                type: 'gemini-status',
                status: 'Coaching unavailable. Check the server API key and analysis model.',
                createdAt: new Date().toISOString(),
            });
        } finally {
            finish();
            if (analysisQueues.get(queueKey) === current) analysisQueues.delete(queueKey);
        }
    };

    const finalizeRoom = async (room: RoomState) => {
        if (!room.userB) {
            return;
        }

        clearInviteExpiry(room);

        const firstSocket = io.sockets.sockets.get(room.userA.socketId);
        const secondSocket = io.sockets.sockets.get(room.userB.socketId);
        if (!firstSocket || !secondSocket) {
            return;
        }

        firstSocket.join(room.roomId);
        secondSocket.join(room.roomId);

        firstSocket.emit('room-ready', {
            roomId: room.roomId,
            role: 'userA',
            selfLabel: room.userA.label,
            reconnectToken: room.userA.reconnectToken,
            partnerLabel: room.userB.label,
        });
        secondSocket.emit('room-ready', {
            roomId: room.roomId,
            role: 'userB',
            selfLabel: room.userB.label,
            reconnectToken: room.userB.reconnectToken,
            partnerLabel: room.userA.label,
        });

        io.to(room.roomId).emit('call-status', { status: 'Connected' });

        if (roomKeys.length === 0) {
            io.to(room.roomId).emit('coach-status', { status: 'Gemini API key missing' });
            return;
        }

        if (!ANALYSIS_MODEL) {
            io.to(room.roomId).emit('coach-status', { status: 'Gemini model missing' });
            return;
        }

        io.to(room.roomId).emit('coach-status', { status: 'Coach standing by' });
    };

    const scheduleInviteExpiry = (room: RoomState) => {
        clearInviteExpiry(room);
        room.inviteExpiryTimer = setTimeout(() => {
            if (room.userB) {
                return;
            }

            emitToParticipant(room, 'userA', 'room-ended', {
                message: 'Invite expired after 10 minutes with no guest joining.',
            });
            closeRoom(room.roomId);
        }, INVITE_TTL_MS);
    };

    const createRoom = (creator: Participant) => {
        const roomId = `room-${randomUUID()}`;
        const room: RoomState = {
            roomId,
            userA: creator,
            userB: null,
            geminiKeyA: null,
            geminiKeyB: null,
            lastFeedbackA: null,
            lastFeedbackB: null,
            audioBufferA: [],
            audioBufferB: [],
            lastTranscriptA: '',
            lastTranscriptB: '',
            lastFeedbackSignatureA: '',
            lastFeedbackSignatureB: '',
            disconnectTimerA: null,
            disconnectTimerB: null,
            inviteExpiryTimer: null,
        };

        rooms.set(roomId, room);
        roomBySocket.set(creator.socketId, roomId);
        scheduleInviteExpiry(room);
        return room;
    };

    const restoreMembership = async (socket: Socket, room: RoomState, role: SpeakerRole, name?: string) => {
        const participant = role === 'userA' ? room.userA : room.userB;
        if (!participant) {
            emitRoomError(socket, 'This room is no longer available.');
            return;
        }

        roomBySocket.delete(participant.socketId);
        participant.socketId = socket.id;
        participant.label = name?.trim() || participant.label;
        socket.data.displayName = participant.label;
        roomBySocket.set(socket.id, room.roomId);
        socket.join(room.roomId);
        clearDisconnectTimer(room, role);
        await finalizeRoom(room);
        socket.emit('call-status', { status: 'Rejoined room' });
    };

    io.on('connection', (socket: Socket) => {
        socket.emit('call-status', { status: 'Ready to create a room' });

        socket.on('create-invite-room', ({ name }: { name?: string } = {}) => {
            if (roomBySocket.has(socket.id)) {
                return;
            }

            socket.data.displayName = name?.trim() || socket.data.displayName || 'Host';
            const room = createRoom(makeParticipant(socket, 'userA', socket.data.displayName));
            socket.join(room.roomId);
            socket.emit('invite-room-created', {
                roomId: room.roomId,
                shareUrl: `${frontendBaseUrl}/rooms?room=${encodeURIComponent(room.roomId)}`,
                role: 'userA',
                selfLabel: room.userA.label,
            reconnectToken: room.userA.reconnectToken,
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

            if (room.userB) {
                emitRoomError(socket, 'This room already has two people.');
                return;
            }

            socket.data.displayName = name?.trim() || socket.data.displayName || 'Guest';
            room.userB = makeParticipant(socket, 'userB', socket.data.displayName);
            roomBySocket.set(socket.id, room.roomId);
            socket.join(room.roomId);
            await finalizeRoom(room);
        });

        socket.on('rejoin-room', async ({ roomId, role, name, reconnectToken }: { roomId?: string; role?: SpeakerRole; name?: string; reconnectToken?: string } = {}) => {
            if (!roomId || !role) {
                return;
            }

            const room = rooms.get(roomId);
            if (!room) {
                emitRoomError(socket, 'This room is no longer available.');
                return;
            }

            const participant = role === 'userA' ? room.userA : role === 'userB' ? room.userB : null;
            if (!participant || !reconnectToken || participant.reconnectToken !== reconnectToken || roomBySocket.has(socket.id)) {
                emitRoomError(socket, 'Unable to restore this participant. Join with a new invite.');
                return;
            }
            await restoreMembership(socket, room, role, name);
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

            const participant = getParticipantBySocket(room, socket.id);
            if (!participant) {
                return;
            }

            const role = participant.role;
            const partner = getPartner(room, role);
            if (payload.mediaData && partner) {
                io.to(partner.socketId).emit('partner-audio', {
                    audio: payload.mediaData,
                    mimeType: payload.mediaMimeType ?? 'audio/webm;codecs=opus',
                });
            }

            if (!payload.pcmData) {
                return;
            }

            // PCM frames are independently playable; MediaRecorder fragments are not.
            if (typeof payload.pcmData !== 'string' || payload.pcmData.length > 24000) return;
            if (partner) io.to(partner.socketId).emit('partner-audio', {
                audio: payload.pcmData, mimeType: 'audio/pcm;rate=16000',
            });
            const chunks = getAudioBuffer(room, role);
            if (chunks.length < 80) chunks.push(payload.pcmData); // ~20 seconds, bounded memory
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

            const participant = getParticipantBySocket(room, socket.id);
            if (!participant) {
                return;
            }

            await analyzeBufferedAudio(room, participant.role);
        });

        socket.on('coach-question', async ({ text }: { text?: string } = {}) => {
            const roomId = roomBySocket.get(socket.id);
            if (!roomId) {
                return;
            }

            const room = rooms.get(roomId);
            if (!room) {
                return;
            }

            const participant = getParticipantBySocket(room, socket.id);
            if (!participant) {
                return;
            }

            const question = text?.trim();
            if (!question || !ANALYSIS_MODEL) {
                emitToParticipant(room, participant.role, 'coach-answer', {
                    question: question || '',
                    answer: 'I need a full question to help. Try asking about a specific word or sentence.',
                    createdAt: new Date().toISOString(),
                });
                return;
            }

            const keySlot = participant.role === 'userA' ? 'geminiKeyA' : 'geminiKeyB';
            const qaKey = room[keySlot] ?? reserveLeastLoadedKey(false);
            const aiInstance = qaKey ? getAiInstance(qaKey as string) : null;
            if (!aiInstance) {
                emitToParticipant(room, participant.role, 'coach-answer', {
                    question,
                    answer: 'Gemini is not available right now.',
                    createdAt: new Date().toISOString(),
                });
                return;
            }

            const lastFeedback = participant.role === 'userA' ? room.lastFeedbackA : room.lastFeedbackB;
            const context = lastFeedback
                ? `Latest transcript: ${lastFeedback.transcript}\nCorrection: ${lastFeedback.correction}\nPronunciation tip: ${lastFeedback.pronunciationTip}\nRows: ${lastFeedback.rows.map((row) => `${row.word}:${row.tip}`).join('; ')}`
                : 'No recent feedback available.';

            try {
                const response = await aiInstance.models.generateContent({
                    model: ANALYSIS_MODEL,
                    contents: [
                        {
                            role: 'user',
                            parts: [
                                { text: COACH_QA_PROMPT },
                                { text: `Context: ${context}` },
                                { text: `Question: ${question}` },
                            ],
                        },
                    ],
                    config: {
                        temperature: 0.4,
                    },
                });

                const answer = (response.text || '').trim();
                emitToParticipant(room, participant.role, 'coach-answer', {
                    question,
                    answer: answer || 'I can help once you speak a full sentence for me to analyze.',
                    createdAt: new Date().toISOString(),
                });
            } catch (error) {
                console.error('[ConversationRoom] Coach question failed', error);
                emitToParticipant(room, participant.role, 'coach-answer', {
                    question,
                    answer: 'I could not answer that right now. Please try again.',
                    createdAt: new Date().toISOString(),
                });
            }
        });

        socket.on('leave-room', () => {
            const roomId = roomBySocket.get(socket.id);
            if (!roomId) {
                socket.emit('room-ended', { message: 'You left the room' });
                return;
            }

            const room = rooms.get(roomId);
            if (!room) {
                socket.emit('room-ended', { message: 'You left the room' });
                return;
            }

            const participant = getParticipantBySocket(room, socket.id);
            if (!participant) {
                socket.emit('room-ended', { message: 'You left the room' });
                return;
            }

            closeRoom(roomId, participant.role, 'Your partner left the room');
            socket.emit('room-ended', { message: 'You left the room' });
        });

        socket.on('disconnect', () => {
            const roomId = roomBySocket.get(socket.id);
            if (!roomId) {
                return;
            }

            const room = rooms.get(roomId);
            if (!room) {
                return;
            }

            const participant = getParticipantBySocket(room, socket.id);
            if (!participant) {
                return;
            }

            roomBySocket.delete(socket.id);
            clearDisconnectTimer(room, participant.role);
            const key = participant.role === 'userA' ? 'disconnectTimerA' : 'disconnectTimerB';
            room[key] = setTimeout(() => {
                closeRoom(room.roomId, participant.role, 'Your partner disconnected');
            }, RECONNECT_GRACE_MS);

            const partner = getPartner(room, participant.role);
            if (partner) {
                io.to(partner.socketId).emit('call-status', { status: 'Partner reconnecting...' });
            }
        });
    });
    return io;
}
