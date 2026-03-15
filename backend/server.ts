import dotenv from 'dotenv';
dotenv.config();
import http from 'http';
import express from 'express';
import cors from 'cors';

import analyzeRoute from './routes/analyze.ts';
import progressRoute from './routes/progress.ts';
import grammarRoute from './routes/grammar.ts';
import { setupLiveProxy } from './liveProxy.ts';
import { setupConversationRoomServer } from './rooms/liveConversationServer.ts';

const app = express();
const port = process.env.PORT || 8080;

const allowedOrigins = new Set(
    (process.env.CORS_ORIGINS || process.env.CORS_ORIGIN || 'http://localhost:5173')
        .split(',')
        .map(o => o.trim())
        .filter(Boolean)
);
app.use(cors({
    origin: true,
    credentials: true
}));
app.use(express.json());

// health route
app.get("/", (_req, res) => {
    res.send("Sonara backend running 🚀");
});

// API routes
app.use('/analyze', analyzeRoute);
app.use('/grammar', grammarRoute);
app.use('/', progressRoute);

// Create HTTP server so the WebSocket proxy can share the same port
const server = http.createServer(app);

// Gemini Live WebSocket proxy — API key stays server-side
setupLiveProxy(server);
setupConversationRoomServer(server, Array.from(allowedOrigins));

server.listen(port, () => {
    console.log(`Sonara backend running on port ${port}`);
});
