import { GoogleGenAI, Modality } from '@google/genai';

class GeminiLiveService {
    private ai: GoogleGenAI | null = null;
    private session: any = null;
    private isConnected: boolean = false;

    // Callbacks
    public onTextResponse: (text: string) => void = () => { };
    public onAudioResponse: (audioData: string) => void = () => { }; // base64 string
    public onError: (error: Error) => void = () => { };
    public onStatus: (status: string) => void = () => { };

    public async startSession() {
        if (this.isConnected) return;

        try {
            this.onStatus("Requesting live session...");

            // 1. Get credentials + config from our backend
            const res = await fetch('http://localhost:3000/live-session', { method: 'POST' });
            if (!res.ok) throw new Error("Failed to fetch live session credentials");

            const config = await res.json();

            // 2. Initialize SDK
            this.ai = new GoogleGenAI({ apiKey: config.apiKey });

            this.onStatus("Connecting to Gemini Live...");

            // 3. Establish the Live API WebSocket connection via SDK
            // Official docs: https://ai.google.dev/gemini-api/docs/live-api/get-started-sdk
            this.session = await this.ai.live.connect({
                model: config.model,
                callbacks: {
                    onopen: () => {
                        console.log('[GeminiLive] WebSocket opened');
                    },
                    onmessage: (message: any) => {
                        this.handleServerMessage(message);
                    },
                    onerror: (e: any) => {
                        console.error('[GeminiLive] WebSocket error:', e);
                        this.onError(new Error(e?.message || 'WebSocket error'));
                    },
                    onclose: (e: any) => {
                        console.log('[GeminiLive] WebSocket closed:', e?.reason);
                        this.isConnected = false;
                        this.onStatus("Disconnected");
                    }
                },
                config: {
                    responseModalities: [Modality.AUDIO],
                    systemInstruction: { parts: [{ text: config.systemInstruction }] }
                }
            });

            this.isConnected = true;
            this.onStatus("Connected to Live AI Coach");

        } catch (error: any) {
            console.error("Gemini Live Service Error:", error);
            this.onError(error);
            this.stopSession();
        }
    }

    /**
     * Handle messages from the Gemini Live API.
     * The SDK already parses the WebSocket message into a LiveServerMessage object.
     * Structure: message.serverContent?.modelTurn?.parts[]
     * Each part can have: part.text, part.inlineData.data (base64 audio)
     */
    private handleServerMessage(message: any) {
        try {
            // The message IS already a LiveServerMessage object from the SDK
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
                        // Audio data is already a base64 string from the SDK
                        this.onAudioResponse(part.inlineData.data);
                    }
                }
            }

            if (content?.turnComplete) {
                console.log('[GeminiLive] Model turn complete');
            }
        } catch (e) {
            console.error("[GeminiLive] Failed to process message", e);
        }
    }

    /**
     * Send an audio chunk to Gemini Live.
     * Official SDK format: session.sendRealtimeInput({ audio: { data: base64, mimeType: '...' } })
     */
    public sendAudioChunk(base64Pcm: string) {
        if (!this.isConnected || !this.session) return;

        try {
            this.session.sendRealtimeInput({
                audio: {
                    data: base64Pcm,
                    mimeType: "audio/pcm;rate=16000"
                }
            });
        } catch (err: any) {
            console.error("[GeminiLive] Failed to send audio chunk:", err);
        }
    }

    /**
     * Signal end of audio stream. When using sendRealtimeInput, 
     * VAD handles turn detection automatically. This just signals
     * we've stopped sending audio.
     */
    public sendAudioStreamEnd() {
        if (!this.isConnected || !this.session) return;
        try {
            this.session.sendRealtimeInput({
                audioStreamEnd: true
            });
        } catch (err: any) {
            console.error("[GeminiLive] Failed to send audio stream end:", err);
        }
    }

    public stopSession() {
        if (this.session) {
            try {
                this.session.close();
            } catch (e) { }
            this.session = null;
        }
        this.isConnected = false;
        this.onStatus("Disconnected");
    }
}

export const geminiLiveService = new GeminiLiveService();
