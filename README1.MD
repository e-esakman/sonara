Sonara – AI Pronunciation Coach

Sonara is a real-time AI-powered pronunciation and conversation coaching platform.
Users can practice speaking, receive instant pronunciation feedback, and improve fluency through AI-driven analysis powered by Google Gemini.

Built for the Gemini Live Agent Hackathon, Sonara combines real-time audio streaming, AI speech analysis, and collaborative conversation rooms.

Features
Feature	Description
🎙️ Live Conversation Rooms	Two users can speak together while each receives private AI coaching
📖 Read-Along Practice	Users read passages aloud and receive word-level pronunciation feedback
✍️ Grammar Coach	Submit sentences and receive corrections, explanations, and examples
🤖 AI Pronunciation Coach	Real-time speech analysis powered by Gemini Live
🌐 Realtime Audio Streaming	Low-latency PCM streaming via Socket.IO
📊 Practice Analytics	Track pronunciation accuracy, fluency, and speaking pace
Demo

Frontend
https://sonara-theta.vercel.app

Backend (Google Cloud Run)
https://sonara-backend-924553247603.asia-south1.run.app

Google Cloud Deployment Proof
(add your YouTube deployment video link here)

System Architecture

Sonara uses a full-stack architecture combining real-time audio streaming with AI speech analysis.

┌──────────────────────────┐
│      Frontend (React)    │
│                          │
│  Rooms.tsx               │
│  Grammar.tsx             │
│  ReadAlongMode.tsx       │
│                          │
│  Web Audio API           │
│  Socket.IO Client        │
└───────────────┬──────────┘
                │
         PCM audio chunks
                │
                ▼
┌──────────────────────────┐
│      Backend (Node.js)   │
│                          │
│  liveConversationServer  │
│  Socket.IO rooms         │
│  RoomState manager       │
│                          │
│  /analyze pipeline       │
│  /grammar endpoint       │
└───────────────┬──────────┘
                │
                ▼
        Google Gemini APIs
Architecture Overview
Frontend

Technology stack

React

Vite

TailwindCSS

Zustand

Web Audio API

Socket.IO Client

Responsibilities

capture microphone audio

stream PCM audio to backend

display transcripts and feedback

play partner audio in conversation rooms

Backend

Technology stack

Node.js

Express

Socket.IO

Google Gemini API

Responsibilities

manage conversation rooms

relay audio between users

stream PCM audio to Gemini Live

run speech analysis pipelines

return AI feedback

AI Layer

Sonara uses two Gemini pathways.

Gemini Live Audio

Used for:

real-time speech transcription

pronunciation coaching

interruption feedback

Each speaker in a room gets a dedicated Gemini Live session.

Gemini Flash (REST API)

Used for:

grammar correction

read-along pronunciation analysis

structured feedback generation

Realtime Audio Pipeline
Browser Microphone
        ↓
Web Audio API
        ↓
PCM Audio Chunks (~256ms)
        ↓
Socket.IO Streaming
        ↓
Backend Room Manager
        ↓
Gemini Live Audio Session
        ↓
AI Feedback (JSON)
        ↓
Frontend UI
Conversation Room Architecture
User A Browser        Backend                User B Browser
──────────────        ───────────────        ───────────────
Microphone            Room Manager           Microphone
      ↓                     ↓                     ↓
PCM chunks → Socket.IO → Gemini Live Session
      ↓                     ↓
AI Feedback         Transcript + Tips
      ↓                     ↓
UI Feedback Panel     Partner Audio Playback

Each speaker receives independent AI coaching even during shared conversations.

Demo Mode (No Database Required)

Sonara can run fully without a database.

If Firebase credentials are not configured, the backend automatically switches to demo mode, where:

progress writes succeed

analytics responses are generated

data is stored in a temporary in-memory mock database

This allows the project to run locally or in hackathon demos without external infrastructure.

Prerequisites

Node.js ≥ 18

Google Gemini API key
https://aistudio.google.com/app/apikey

(Optional) Firebase project for persistent progress tracking

Quick Start
Clone the repository
git clone https://github.com/e-esakman/sonara.git
cd sonara
Install dependencies

Frontend

npm install

Backend

cd backend
npm install
cd ..
Configure backend
cp backend/.env.example backend/.env

Minimum configuration:

GEMINI_API_KEY=your_gemini_api_key_here
Configure frontend
cp .env.example .env

Default values work for local development.

Run Locally

Terminal 1 (backend)

cd backend
npm run dev

Terminal 2 (frontend)

npm run dev

Open:

http://localhost:5173
Reproducible Testing Instructions

Judges can reproduce Sonara locally using the steps above.

Test the Grammar Feature

Open the application.

Navigate to the Grammar Coach page.

Enter a sentence such as:

She go to school yesterday.

The AI will return:

corrected sentence

explanation

example sentences.

Test Read-Along Pronunciation

Navigate to Read-Along Mode.

Select a passage.

Click Start Reading and read the text aloud.

Expected output:

word-level pronunciation accuracy

fluency score

speaking speed (WPM)

AI coaching feedback.

Test Live Conversation Rooms

Open the app in two browser tabs.

Navigate to Conversation Rooms.

Join the queue or create an invite link.

Start speaking.

Expected behavior:

audio is streamed in real time

each speaker receives AI coaching feedback

transcripts appear in the conversation panel.

Environment Variables
Backend (backend/.env)
Variable	Required	Description
GEMINI_API_KEY	Yes	Google Gemini API key
PORT	No	Backend port (default 3000)
CORS_ORIGINS	No	Allowed frontend origins
FIREBASE_SERVICE_ACCOUNT	No	Firebase service account JSON. If not provided, the server runs in demo mode using a mock database
Frontend (.env)
Variable	Default	Description
VITE_BACKEND_URL	http://localhost:3000
	Backend API base URL
VITE_BACKEND_WS_URL	ws://localhost:3000/live-ws	WebSocket endpoint
Project Structure
sonara/
├── src/
│   ├── pages/
│   │   ├── Rooms.tsx
│   │   ├── Grammar.tsx
│   │   └── ReadAlongMode.tsx
│   ├── services/
│   │   ├── liveConversationRoom.ts
│   │   └── geminiLiveService.ts
│   └── store/
│
├── backend/
│   ├── routes/
│   │   ├── analyze.ts
│   │   └── grammar.ts
│   ├── agents/
│   │   ├── pronunciationAgent.ts
│   │   ├── fluencyAgent.ts
│   │   └── feedbackAgent.ts
│   ├── rooms/
│   │   └── liveConversationServer.ts
│   ├── liveProxy.ts
│   └── server.ts
│
├── deploy.sh
├── ARCHITECTURE.md
└── README.md
Deployment

Backend is deployed on Google Cloud Run.

Deploy using:

./deploy.sh

Deployment steps:

Build Docker container

Upload container via Cloud Build

Deploy to Cloud Run

Route traffic to latest revision

Example deployed backend:

https://sonara-backend-924553247603.asia-south1.run.app

Frontend is deployed on Vercel.

Security Considerations
Concern	Mitigation
API key exposure	Gemini key stored server-side only
AI access	Frontend communicates through backend proxy
Input abuse	Request size limits and validation
CORS	Configurable origin allowlist
Hackathon

Built for the Gemini Live Agent Hackathon.

Sonara demonstrates real-time AI speech coaching using:

Gemini Live Audio API

Gemini Flash analysis pipeline

Google Cloud Run deployment

WebSocket-based real-time speech streaming