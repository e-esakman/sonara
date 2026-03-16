type GeminiMessagePart = { text?: string; inlineData?: { data: string; mimeType: string } };
type GeminiServerContent = {
    interrupted?: boolean;
    turnComplete?: boolean;
    modelTurn?: { parts: GeminiMessagePart[] };
};
type GeminiServerMessage = { serverContent?: GeminiServerContent };

const BACKEND_WS_URL = import.meta.env.VITE_BACKEND_WS_URL || 'ws://localhost:8080/live-ws';

class GeminiLiveService {
    private ws: WebSocket | null = null;
    private isConnected: boolean = false;

    // Callbacks
    public onTextResponse: (text: string) => void = () => { };
    public onAudioResponse: (audioData: string) => void = () => { };
    public onTurnComplete: () => void = () => { };
    public onError: (error: Error) => void = () => { };
    public onStatus: (status: string) => void = () => { };

    public async startSession() {
        if (this.isConnected) return;

        this.onStatus("Connecting to Live AI Coach...");

        const ws = new WebSocket(BACKEND_WS_URL);
        this.ws = ws;

        ws.onopen = () => {
            console.log('[GeminiLive] Connected to backend proxy');
        };

        ws.onmessage = (event: MessageEvent<string>) => {
            try {
                const msg = JSON.parse(event.data) as { type: string; status?: string; message?: string; payload?: GeminiServerMessage };
                if (msg.type === 'status') {
                    this.isConnected = true;
                    this.onStatus(msg.status ?? 'Connected');
                } else if (msg.type === 'error') {
                    this.onError(new Error(msg.message ?? 'Unknown error'));
                } else if (msg.type === 'message' && msg.payload) {
                    this.handleServerMessage(msg.payload);
                }
            } catch (e) {
                console.error('[GeminiLive] Failed to parse message:', e);
            }
        };

        ws.onerror = () => {
            this.onError(new Error('WebSocket connection error'));
        };

        ws.onclose = () => {
            this.isConnected = false;
            this.ws = null;
            this.onStatus("Disconnected");
        };
    }

    /**
     * Handle messages forwarded from the Gemini Live API via the backend proxy.
     * Structure: message.serverContent?.modelTurn?.parts[]
     */
    private handleServerMessage(message: GeminiServerMessage) {
        try {
            const content = message?.serverContent;

            if (content?.interrupted) {
                console.log('[GeminiLive] Model was interrupted');
                return;
            }

            if (content?.modelTurn?.parts) {
                for (const part of content.modelTurn.parts) {
                    if (part.text) {
                        this.onTextResponse(part.text);
                    }
                    if (part.inlineData?.data) {
                        this.onAudioResponse(part.inlineData.data);
                    }
                }
            }

            if (content?.turnComplete) {
                console.log('[GeminiLive] Model turn complete');
                this.onTurnComplete();
            }
        } catch (e) {
            console.error("[GeminiLive] Failed to process message", e);
        }
    }

    /**
     * Send an audio chunk to the backend proxy, which forwards it to Gemini Live.
     */
    public sendAudioChunk(base64Pcm: string) {
        if (!this.isConnected || !this.ws) return;
        try {
            this.ws.send(JSON.stringify({
                type: 'audio',
                data: base64Pcm,
                mimeType: 'audio/pcm;rate=16000'
            }));
        } catch (err) {
            console.error("[GeminiLive] Failed to send audio chunk:", err);
        }
    }

    public sendAudioStreamEnd() {
        if (!this.isConnected || !this.ws) return;
        try {
            this.ws.send(JSON.stringify({ type: 'audioEnd' }));
        } catch (err) {
            console.error("[GeminiLive] Failed to send audio stream end:", err);
        }
    }

    /**
     * Send interrupt signal to cancel AI generation.
     */
    public interrupt() {
        if (!this.isConnected || !this.ws) return;
        try {
            this.ws.send(JSON.stringify({ type: 'clientContent', turnComplete: true }));
        } catch (err) {
            console.error("[GeminiLive] Failed to send interrupt:", err);
        }
    }

    public stopSession() {
        if (this.ws) {
            try { this.ws.close(); } catch { /* intentionally ignored */ }
            this.ws = null;
        }
        this.isConnected = false;
        this.onStatus("Disconnected");
    }
}

export const geminiLiveService = new GeminiLiveService();
