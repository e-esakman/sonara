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
const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || '::';

const allowedOrigins = new Set(
    (process.env.CORS_ORIGINS || process.env.CORS_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173')
        .split(',')
        .map(o => o.trim())
        .filter(Boolean)
);
app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (e.g. server-to-server, curl) or matching origins
        if (!origin || allowedOrigins.has(origin)) {
            callback(null, origin || true);
        } else {
            callback(new Error(`CORS: origin '${origin}' is not allowed`));
        }
    },
    credentials: true,
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

server.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
        console.error(`Port ${port} is already in use. Stop the other process and retry.`);
        process.exit(0);
    } else {
        console.error('Server failed to start', error);
        process.exit(1);
    }
});

server.listen(port, host, () => {
    console.log(`Sonara backend listening at http://${host}:${port}`);
});
