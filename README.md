# Sonara – AI Pronunciation Coach
Built for Gemini Live Agent Challenge (Live Agents Category)

Sonara is a real-time, AI-powered pronunciation coaching app.  Speak a passage and
receive instant, word-level feedback on accuracy, fluency, and accent – powered by
Google Gemini.

<img width="587" height="487" alt="Screenshot 2026-03-18 at 2 12 56 AM" src="https://github.com/user-attachments/assets/02666eb1-3e49-473c-8390-f99e15f2c95d" />

---

## Features

| Feature | Description |
|---------|-------------|
| 📖 **Guided Practice** | Choose a text and read aloud; mispronounced words are highlighted instantly |
| 🎙️ **Free Speak Mode** | Have a live, voice conversation with the AI coach (Gemini Live API) |
| 📊 **Analytics** | Track accuracy, fluency, WPM, and streak over time |
| 🌍 **Accent Support** | American, British, and Indian English accent coaching |
| ♿ **Accessibility modes** | Focus mode and autism-friendly display options |
| **Live Conversation Rooms** | Two users can speak together while each receives private AI coaching |
| **Read-Along** | Practice Users read passages aloud and receive word-level pronunciation feedback |
| **Grammar Coach** | Submit sentences and receive corrections, explanations, and examples |

---

## Architecture

<img width="1536" height="1024" alt="aaaa3" src="https://github.com/user-attachments/assets/09166cca-8d98-47f1-83ba-3de29612a8da" />

---

## Prerequisites

- Node.js ≥ 18
- A [Google Gemini API key](https://aistudio.google.com/app/apikey)
- *(Optional)* A Firebase project for persistent progress tracking

---

### Problem
Improving spoken English is difficult because most existing tools are **not built for real-time interaction**.

- Feedback is delayed users only know mistakes *after* speaking  
- No support for **natural conversations** (interruptions, back-and-forth)  
- Limited focus on **pronunciation and fluency together**  
- Practice feels artificial, not like talking to a real person  

As a result, users struggle to build **confidence in speaking**, even if they understand the language.

### How Sonara Solves This
### 🎧 Real-Time Feedback
Instead of waiting for results, Sonara:
- analyzes speech **as you speak**
- highlights mispronounced words instantly  

---

### 🗣️ Live AI Conversations
Using Gemini Live API:
- users can **talk naturally**
- interrupt anytime  
- receive **continuous coaching responses**

---

### 👥 Conversation Rooms
- Two users can speak together  
- AI listens in the background  
- Provides **private, personalized feedback** to each speaker  

#### Sonara is a real-time multimodal AI agent:

Audio → Text → AI → UI Feedback <br>
Real-time vs Batch <br>
/live-ws → Real-time streaming (Gemini Live) <br>
/analyze → Batch pronunciation analysis <br>

<img width="789" height="1076" alt="image" src="https://github.com/user-attachments/assets/0d1dc521-5aa1-4781-ae70-f920454a1dd1" />
<br>

( Sonara enables real-time conversations between users while the AI continuously analyzes pronunciation in the background and provides live feedback. )  <br>

Sonara backend is deployed on **Google Cloud Run**.

🎥 **Deployment Proof:**  <br>
https://youtu.be/XPV0fWwfG5o  <br>

⚙️ **Automated Deployment Script:**  <br>
https://github.com/e-esakman/sonara/blob/main/deploy.sh <br>

## Quick Start and Testing

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
