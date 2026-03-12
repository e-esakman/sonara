import { Server } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI, Modality } from '@google/genai';

const SYSTEM_INSTRUCTION = `You are Sonara, a friendly AI pronunciation coach.

When users speak English sentences:
• listen carefully to pronunciation
• detect mispronounced words
• respond with spoken coaching feedback
• give phonetic hints when helpful
• encourage the user to repeat the sentence

Keep responses short and conversational.`;

export function setupLiveProxy(server: Server) {
    const wss = new WebSocketServer({ server, path: '/live-ws' });

    wss.on('connection', async (clientWs: WebSocket) => {
        const apiKey = process.env.GEMINI_LIVEVOICE_KEY || process.env.GEMINI_API_KEY;
        if (!apiKey) {
            clientWs.close(1011, 'Server misconfigured: missing API key');
            return;
        }

        const ai = new GoogleGenAI({ apiKey });
        type GeminiSession = Awaited<ReturnType<typeof ai.live.connect>>;
        let geminiSession: GeminiSession | null = null;

        try {
            geminiSession = await ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-latest',
                callbacks: {
                    onopen: () => {
                        console.log('[LiveProxy] Gemini session opened');
                        if (clientWs.readyState === WebSocket.OPEN) {
                            clientWs.send(JSON.stringify({ type: 'status', status: 'Connected to Live AI Coach' }));
                        }
                    },
                    onmessage: (message: object) => {
                        if (clientWs.readyState === WebSocket.OPEN) {
                            clientWs.send(JSON.stringify({ type: 'message', payload: message }));
                        }
                    },
                    onerror: (e: Event) => {
                        console.error('[LiveProxy] Gemini error:', e);
                        if (clientWs.readyState === WebSocket.OPEN) {
                            clientWs.send(JSON.stringify({ type: 'error', message: 'Gemini connection error' }));
                        }
                    },
                    onclose: (e: CloseEvent) => {
                        console.log('[LiveProxy] Gemini session closed:', e?.reason);
                        if (clientWs.readyState === WebSocket.OPEN) {
                            clientWs.close(1000, 'Gemini session closed');
                        }
                    }
                },
                config: {
                    responseModalities: [Modality.AUDIO],
                    systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] }
                }
            });
        } catch (err) {
            console.error('[LiveProxy] Failed to connect to Gemini:', err);
            clientWs.close(1011, 'Failed to connect to Gemini Live');
            return;
        }

        clientWs.on('message', (data: WebSocket.RawData) => {
            if (!geminiSession) return;
            try {
                const msg = JSON.parse(data.toString()) as {
                    type: string;
                    data?: string;
                    mimeType?: string;
                    turnComplete?: boolean;
                };
                if (msg.type === 'audio') {
                    geminiSession.sendRealtimeInput({
                        audio: { data: msg.data ?? '', mimeType: msg.mimeType ?? 'audio/pcm;rate=16000' }
                    });
                } else if (msg.type === 'audioEnd') {
                    // (Optional) geminiSession.sendRealtimeInput([{ ... }]) handles stream ends. We can ignore explicit audioEnd or pass empty array
                } else if (msg.type === 'clientContent' && msg.turnComplete) {
                    // Removed turnComplete signal as it triggers "Request contains an invalid argument" in Gemini 2.5 Native Audio
                }
            } catch (e) {
                console.error('[LiveProxy] Failed to parse client message:', e);
            }
        });

        clientWs.on('close', () => {
            if (geminiSession) {
                try { geminiSession.close(); } catch { /* intentionally ignored */ }
            }
        });

        clientWs.on('error', (err) => {
            console.error('[LiveProxy] Client WebSocket error:', err);
            if (geminiSession) {
                try { geminiSession.close(); } catch { /* intentionally ignored */ }
            }
        });
    });
}
