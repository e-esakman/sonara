type GeminiMessagePart = { text?: string; inlineData?: { data: string; mimeType: string } };
type GeminiServerContent = {
    interrupted?: boolean;
    outputTranscription?: { text?: string };
    turnComplete?: boolean;
    modelTurn?: { parts: GeminiMessagePart[] };
};
type GeminiServerMessage = { serverContent?: GeminiServerContent };

import { getRequiredBackendUrl } from './backendConfig';

function getWebsocketUrl() {
    if (import.meta.env.VITE_BACKEND_WS_URL) {
        return import.meta.env.VITE_BACKEND_WS_URL;
    }
    const httpUrl = getRequiredBackendUrl();
    if (httpUrl.startsWith('https://')) {
        return httpUrl.replace('https://', 'wss://') + '/live-ws';
    }
    return httpUrl.replace('http://', 'ws://') + '/live-ws';
}



class GeminiLiveService {
    private ws: WebSocket | null = null;
    private isConnected: boolean = false;
    private connecting: Promise<void> | null = null;

    // Callbacks
    public onTextResponse: (text: string) => void = () => { };
    public onAudioResponse: (audioData: string) => void = () => { };
    public onTurnComplete: () => void = () => { };
    public onError: (error: Error) => void = () => { };
    public onStatus: (status: string) => void = () => { };

    public async startSession() {
        if (this.isConnected) return;
        if (this.connecting) return this.connecting;
        this.connecting = this.connect().finally(() => { this.connecting = null; });
        return this.connecting;
    }

    private connect(): Promise<void> {
        return new Promise((resolve, reject) => {
        let ready = false;
        const timeout = window.setTimeout(() => {
            reject(new Error('The coach took too long to connect. Please try again.'));
            this.ws?.close();
        }, 20000);

        this.onStatus("Connecting to Live AI Coach...");

        const ws = new WebSocket(getWebsocketUrl());
        this.ws = ws;

        ws.onopen = () => {
            console.log('[GeminiLive] Connected to backend proxy');
        };

        ws.onmessage = (event: MessageEvent<string>) => {
            try {
                const msg = JSON.parse(event.data) as { type: string; status?: string; message?: string; payload?: GeminiServerMessage };
                if (msg.type === 'status') {
                    ready = true;
                    window.clearTimeout(timeout);
                    resolve();
                    this.isConnected = true;
                    this.onStatus(msg.status ?? 'Connected');
                } else if (msg.type === 'error') {
                    const error = new Error(msg.message ?? 'Unknown error');
                    window.clearTimeout(timeout);
                    reject(error);
                    this.onError(error);
                } else if (msg.type === 'message' && msg.payload) {
                    this.handleServerMessage(msg.payload);
                }
            } catch (e) {
                console.error('[GeminiLive] Failed to parse message:', e);
            }
        };

        ws.onerror = () => {
            const error = new Error('Could not connect to the coach. Check the backend URL.');
            window.clearTimeout(timeout);
            reject(error);
            this.onError(error);
        };

        ws.onclose = (event) => {
            window.clearTimeout(timeout);
            if (!ready) reject(new Error(event.reason || 'The coach could not connect. Check the server API key and model.'));
            this.isConnected = false;
            this.ws = null;
            this.onStatus("Disconnected");
        };
        });
    }

    /**
     * Handle messages forwarded from the Gemini Live API via the backend proxy.
     * Structure: message.serverContent?.modelTurn?.parts[]
     */
    private handleServerMessage(message: GeminiServerMessage) {
        try {
            const content = message?.serverContent;
            if (content?.outputTranscription?.text) this.onTextResponse(content.outputTranscription.text);

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
