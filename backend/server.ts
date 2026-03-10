import http from 'http';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import analyzeRoute from './routes/analyze.ts';
import progressRoute from './routes/progress.ts';
import { setupLiveProxy } from './liveProxy.ts';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// health route
app.get("/", (_req, res) => {
    res.send("Sonara backend running 🚀");
});

// API routes
app.use('/analyze', analyzeRoute);
app.use('/', progressRoute);

// Create HTTP server so the WebSocket proxy can share the same port
const server = http.createServer(app);

// Gemini Live WebSocket proxy — API key stays server-side
setupLiveProxy(server);

server.listen(port, () => {
    console.log(`Sonara backend listening at http://localhost:${port}`);
});