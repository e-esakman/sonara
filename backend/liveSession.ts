import { Request, Response } from 'express';

// In AI Studio there are no short-lived tokens yet for Live API.
// We return the API key and the system instruction to the frontend, 
// so the frontend can establish the WebSocket explicitly via the official SDK or WSS.
export const generateLiveSession = (req: Request, res: Response) => {
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: "Gemini API key not configured on server" });
        }

        const systemInstruction = `You are Sonara, a friendly AI pronunciation coach.

When users speak English sentences:
• listen carefully to pronunciation
• detect mispronounced words
• respond with spoken coaching feedback
• give phonetic hints when helpful
• encourage the user to repeat the sentence

Keep responses short and conversational.`;

        res.json({
            apiKey: apiKey,
            model: "gemini-2.5-flash-native-audio-preview-12-2025",
            systemInstruction: systemInstruction,
            voiceName: "Aoede" // Example voice selection
        });
    } catch (error) {
        console.error("Error generating live session credentials:", error);
        res.status(500).json({ error: "Failed to generate live session" });
    }
};
