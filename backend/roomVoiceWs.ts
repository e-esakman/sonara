import { Server } from 'http';
import { GoogleGenAI, Modality } from '@google/genai';
import { WebSocketServer, WebSocket } from 'ws';

type ClientAudioChunkMessage = {
    type: 'audio_chunk';
    audio: string;
};

type RoomVoiceStatus =
    | 'Listening'
    | 'Transcribing'
    | 'Analyzing'
    | 'AI Coach Responding';

type TranscriptPayload = {
    text: string;
    mispronouncedWords: string[];
};

const TRANSCRIPTION_MODEL = process.env.GEMINI_TRANSCRIPTION_MODEL || 'gemini-2.5-flash';
const ANALYSIS_MODEL = process.env.GEMINI_ANALYSIS_MODEL || 'gemini-2.5-flash';
const TTS_MODEL = process.env.GEMINI_TTS_MODEL || 'gemini-2.5-flash-preview-tts';
const TTS_VOICE = process.env.GEMINI_TTS_VOICE || 'Kore';

const TRANSCRIPTION_PROMPT = `Transcribe this spoken English audio.

Return only JSON with this exact shape:
{
  "text": "full transcript",
  "mispronouncedWords": ["word1", "word2"]
}

Rules:
- If no clear speech is present, return {"text":"","mispronouncedWords":[]}
- Preserve punctuation when obvious.
- mispronouncedWords should only include words that likely sounded mispronounced from the audio.
- Do not include any extra keys or markdown.`;

function sendJson(ws: WebSocket, payload: Record<string, unknown>) {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(payload));
    }
}

function sendStatus(ws: WebSocket, status: RoomVoiceStatus) {
    sendJson(ws, { type: 'status', status });
}

function decodeBase64(base64: string) {
    return Buffer.from(base64, 'base64');
}

function pcm16ToWavBuffer(pcmBuffer: Buffer, sampleRate: number) {
    const channels = 1;
    const bitsPerSample = 16;
    const byteRate = sampleRate * channels * bitsPerSample / 8;
    const blockAlign = channels * bitsPerSample / 8;
    const wavHeader = Buffer.alloc(44);

    wavHeader.write('RIFF', 0);
    wavHeader.writeUInt32LE(36 + pcmBuffer.length, 4);
    wavHeader.write('WAVE', 8);
    wavHeader.write('fmt ', 12);
    wavHeader.writeUInt32LE(16, 16);
    wavHeader.writeUInt16LE(1, 20);
    wavHeader.writeUInt16LE(channels, 22);
    wavHeader.writeUInt32LE(sampleRate, 24);
    wavHeader.writeUInt32LE(byteRate, 28);
    wavHeader.writeUInt16LE(blockAlign, 32);
    wavHeader.writeUInt16LE(bitsPerSample, 34);
    wavHeader.write('data', 36);
    wavHeader.writeUInt32LE(pcmBuffer.length, 40);

    return Buffer.concat([wavHeader, pcmBuffer]);
}

function extractJsonBlock(text: string) {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) {
        return null;
    }
    return text.slice(start, end + 1);
}

function parseTranscriptPayload(raw: string): TranscriptPayload {
    const jsonText = extractJsonBlock(raw) ?? raw;

    try {
        const parsed = JSON.parse(jsonText) as Partial<TranscriptPayload>;
        return {
            text: parsed.text?.trim() ?? '',
            mispronouncedWords: Array.isArray(parsed.mispronouncedWords)
                ? parsed.mispronouncedWords.map((word) => String(word).trim()).filter(Boolean)
                : [],
        };
    } catch {
        return {
            text: raw.trim(),
            mispronouncedWords: [],
        };
    }
}

function extractAudioPayload(response: unknown) {
    const candidate = (response as {
        candidates?: Array<{
            content?: {
                parts?: Array<{
                    inlineData?: {
                        data?: string;
                        mimeType?: string;
                    };
                }>;
            };
        }>;
    })?.candidates?.[0];

    const audioPart = candidate?.content?.parts?.find((part) => part.inlineData?.data);
    return {
        audio: audioPart?.inlineData?.data ?? '',
        mimeType: audioPart?.inlineData?.mimeType ?? '',
    };
}

function extractSampleRate(mimeType: string) {
    const match = mimeType.match(/rate=(\d+)/i);
    return match ? Number(match[1]) : 24000;
}

export function setupRoomVoiceWs(server: Server) {
    const wss = new WebSocketServer({ server, path: '/room-voice-ws' });

    wss.on('connection', (ws) => {
        const apiKey = process.env.GEMINI_LIVEVOICE_KEY || process.env.GEMINI_API_KEY;
        if (!apiKey) {
            sendJson(ws, { type: 'error', message: 'Missing Gemini API key' });
            ws.close(1011, 'Missing Gemini API key');
            return;
        }

        const ai = new GoogleGenAI({ apiKey });
        let processingChain = Promise.resolve();

        const processAudioTurn = async (base64Audio: string) => {
            const pcmBuffer = decodeBase64(base64Audio);
            if (!pcmBuffer.length) {
                sendStatus(ws, 'Listening');
                return;
            }

            try {
                sendStatus(ws, 'Transcribing');

                const wavAudio = pcm16ToWavBuffer(pcmBuffer, 16000).toString('base64');
                const transcriptionResponse = await ai.models.generateContent({
                    model: TRANSCRIPTION_MODEL,
                    contents: [
                        { text: TRANSCRIPTION_PROMPT },
                        {
                            inlineData: {
                                data: wavAudio,
                                mimeType: 'audio/wav',
                            },
                        },
                    ],
                    config: {
                        responseMimeType: 'application/json',
                    },
                });

                const transcriptPayload = parseTranscriptPayload(transcriptionResponse.text ?? '');
                if (!transcriptPayload.text) {
                    sendStatus(ws, 'Listening');
                    return;
                }

                sendJson(ws, {
                    type: 'transcript',
                    text: transcriptPayload.text,
                    mispronouncedWords: transcriptPayload.mispronouncedWords,
                });

                sendStatus(ws, 'Analyzing');
                const analysisResponse = await ai.models.generateContent({
                    model: ANALYSIS_MODEL,
                    contents: `You are an English pronunciation coach. Analyze the sentence and give short pronunciation feedback.

Sentence: "${transcriptPayload.text}"
Likely mispronounced words: ${transcriptPayload.mispronouncedWords.join(', ') || 'none'}

Keep the response under 2 sentences and directly actionable.`,
                });

                const message = analysisResponse.text?.trim() ?? '';
                if (!message) {
                    sendStatus(ws, 'Listening');
                    return;
                }

                sendJson(ws, {
                    type: 'analysis',
                    message,
                });

                sendStatus(ws, 'AI Coach Responding');
                const ttsResponse = await ai.models.generateContent({
                    model: TTS_MODEL,
                    contents: message,
                    config: {
                        responseModalities: [Modality.AUDIO],
                        speechConfig: {
                            voiceConfig: {
                                prebuiltVoiceConfig: {
                                    voiceName: TTS_VOICE,
                                },
                            },
                        },
                    },
                });

                const { audio, mimeType } = extractAudioPayload(ttsResponse);
                if (audio) {
                    const normalizedMimeType = /audio\/wav/i.test(mimeType)
                        ? 'audio/wav'
                        : 'audio/wav';
                    const normalizedAudio = /audio\/wav/i.test(mimeType)
                        ? audio
                        : pcm16ToWavBuffer(decodeBase64(audio), extractSampleRate(mimeType)).toString('base64');

                    sendJson(ws, {
                        type: 'ai_voice',
                        audio: normalizedAudio,
                        mimeType: normalizedMimeType,
                    });
                }

                sendStatus(ws, 'Listening');
            } catch (error) {
                console.error('[RoomVoiceWs] Failed to process audio turn', error);
                sendJson(ws, {
                    type: 'error',
                    message: error instanceof Error ? error.message : 'Voice pipeline failed',
                });
                sendStatus(ws, 'Listening');
            }
        };

        sendStatus(ws, 'Listening');

        ws.on('message', (rawMessage) => {
            try {
                const message = JSON.parse(rawMessage.toString()) as ClientAudioChunkMessage;
                if (message.type !== 'audio_chunk' || typeof message.audio !== 'string') {
                    return;
                }

                processingChain = processingChain
                    .then(() => processAudioTurn(message.audio))
                    .catch((error) => {
                        console.error('[RoomVoiceWs] Processing chain failed', error);
                    });
            } catch (error) {
                console.error('[RoomVoiceWs] Failed to parse client message', error);
                sendJson(ws, { type: 'error', message: 'Invalid WebSocket message' });
            }
        });

        ws.on('error', (error) => {
            console.error('[RoomVoiceWs] Client socket error', error);
        });
    });
}
