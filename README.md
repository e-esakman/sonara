# Sonara – AI Pronunciation Coach

Sonara is a real-time, AI-powered pronunciation coaching app.  Speak a passage and
receive instant, word-level feedback on accuracy, fluency, and accent – powered by
Google Gemini.


---

## Features

| Feature | Description |
|---------|-------------|
| 📖 **Guided Practice** | Choose a text and read aloud; mispronounced words are highlighted instantly |
| 🎙️ **Free Speak Mode** | Have a live, voice conversation with the AI coach (Gemini Live API) |
| 📊 **Analytics** | Track accuracy, fluency, WPM, and streak over time |
| 🌍 **Accent Support** | American, British, and Indian English accent coaching |
| ♿ **Accessibility modes** | Focus mode and autism-friendly display options |

---

## Architecture

```
┌──────────────────────────────────┐    ┌────────────────────────────────────┐
│         Frontend (React)         │    │         Backend (Express)          │
│                                  │    │                                    │
│  pronunciationService  ──POST──► │    │  /analyze ──► Analysis Pipeline   │
│  progressService       ──REST──► │    │  /session / /progress ──► Firebase│
│  geminiLiveService     ──WS───► │    │  /live-ws ──► Gemini Live Proxy    │
└──────────────────────────────────┘    └────────────────────────────────────┘
                                                          │
                                              GEMINI_API_KEY (server-side only)
                                                          │
                                                  Google Gemini API
```

> **Security note:** The Gemini API key never leaves the server.  The frontend
> connects to the backend WebSocket proxy (`/live-ws`) which forwards audio to
> Gemini on the server side.

---

## Prerequisites

- Node.js ≥ 18
- A [Google Gemini API key](https://aistudio.google.com/app/apikey)
- *(Optional)* A Firebase project for persistent progress tracking

---

## Quick Start

### 1 – Clone and install

```bash
git clone https://github.com/e-esakman/sonara.git
cd sonara

# Install frontend dependencies
npm install

# Install backend dependencies
cd backend && npm install && cd ..
```

### 2 – Configure the backend

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` and fill in at minimum:

```
GEMINI_API_KEY=your_gemini_api_key_here
```

See `backend/.env.example` for full documentation including how to configure
Firebase for persistent progress tracking.

### 3 – Configure the frontend

```bash
cp .env.example .env
```

The defaults (`http://localhost:3000` / `ws://localhost:3000/live-ws`) work for
local development without any changes.

### 4 – Start the servers

```bash
# Terminal 1 – backend
cd backend && npm run dev

# Terminal 2 – frontend
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | **Yes** | Google Gemini API key. Obtain from [AI Studio](https://aistudio.google.com/app/apikey). |
| `PORT` | No | HTTP port (default `3000`). |
| `CORS_ORIGINS` | No | Comma-separated allowed origins (default `http://localhost:5173`). |
| `FIREBASE_SERVICE_ACCOUNT` | No | Full Firebase service-account JSON as a single-line string. Without this the server runs in **demo mode** – progress is accepted but not persisted. See `backend/.env.example` for instructions. |

### Frontend (`.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_BACKEND_URL` | `http://localhost:3000` | Base URL of the backend HTTP API. |
| `VITE_BACKEND_WS_URL` | `ws://localhost:3000/live-ws` | WebSocket URL for the Gemini Live proxy. |

---

## Project Structure

```
sonara/
├── src/                    # React frontend
│   ├── components/         # Reusable UI components
│   ├── hooks/              # Custom React hooks (speech recognition, audio)
│   ├── pages/              # Route-level pages (Practice, Analytics, Login…)
│   ├── sections/           # Page sections (FreeSpeakMode, etc.)
│   ├── services/           # API client services
│   └── store/              # Global state (Zustand)
└── backend/                # Express backend
    ├── agents/             # AI pipeline agents
    │   ├── analysisPipeline.ts   # Orchestrates the full analysis
    │   ├── pronunciationAgent.ts # Word-level accuracy scoring
    │   ├── fluencyAgent.ts       # WPM & fluency scoring
    │   ├── feedbackAgent.ts      # Gemini-powered coaching tips
    │   ├── speechProcessor.ts    # Transcript cleaning / tokenisation
    │   └── geminiRetry.ts        # Shared Gemini retry helper
    ├── routes/
    │   ├── analyze.ts      # POST /analyze
    │   └── progress.ts     # POST /session, GET /progress
    ├── liveProxy.ts        # Gemini Live WebSocket proxy (/live-ws)
    ├── firebaseAdmin.ts    # Firebase Admin SDK initialisation
    └── server.ts           # Express app entry point
```

---

## Development

```bash
# Lint frontend
npm run lint

# Build frontend for production
npm run build

# Build backend
cd backend && npm run build
```

---

## License

MIT
