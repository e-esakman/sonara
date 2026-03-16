# Sonara — Architecture Diagrams

This document provides visual architecture diagrams for the Sonara AI pronunciation coaching platform, showing how the frontend, backend, Gemini API, and Firebase are connected — both individually and as a combined system.

---

## Table of Contents

1. [Combined System Architecture](#1-combined-system-architecture)
2. [Frontend Architecture](#2-frontend-architecture)
3. [Backend Architecture](#3-backend-architecture)
4. [Gemini API Integration](#4-gemini-api-integration)
5. [Pronunciation Analysis Pipeline](#5-pronunciation-analysis-pipeline)
6. [Live Conversation Rooms Data Flow](#6-live-conversation-rooms-data-flow)
7. [Solo Live Coach Data Flow](#7-solo-live-coach-data-flow)
8. [Firebase Progress Tracking](#8-firebase-progress-tracking)
9. [Deployment Architecture](#9-deployment-architecture)

---

## 1. Combined System Architecture

This diagram shows **all components and every connection** in one view.

```
 ┌─────────────────────────────────────────────────────────────────────────────────┐
 │                              USER'S BROWSER                                    │
 │                                                                                 │
 │  ┌───────────────────────────────────────────────────────────────────────────┐  │
 │  │                  React Frontend  (Vite / TypeScript)                     │  │
 │  │                   hosted on Vercel  ·  localhost:5173                    │  │
 │  │                                                                           │  │
 │  │   Pages                    Services                  Browser APIs        │  │
 │  │  ──────────────────        ─────────────────────     ────────────────    │  │
 │  │  Home (public)             pronunciationService  ──► Web Speech API      │  │
 │  │  Login / Dashboard         progressService           Web Audio API       │  │
 │  │  Practice                  geminiLiveService  ───WS─►(microphone PCM)    │  │
 │  │  Library / ReadingViewer   liveConversationRoom─SIO►  SpeechSynthesis    │  │
 │  │  Grammar                                             MediaRecorder        │  │
 │  │  Rooms (Live Conv.)        State (Zustand store)                         │  │
 │  │  Progress / Analytics      localStorage persist                          │  │
 │  │  Sessions                                                                 │  │
 │  └──────────┬──────────────────────────┬──────────────────────────┬─────────┘  │
 │             │  HTTP POST/GET (REST)     │  Native WebSocket        │ Socket.IO  │
 └─────────────┼──────────────────────────┼──────────────────────────┼────────────┘
               │                          │                          │
               │  HTTPS / WSS  (TLS)      │  WSS /live-ws            │ WSS (SIO)
               │                          │                          │
 ┌─────────────▼──────────────────────────▼──────────────────────────▼────────────┐
 │                    Node.js / Express Backend                                   │
 │                   Google Cloud Run  ·  localhost:3000                          │
 │                                                                                 │
 │  REST Routes              Analysis Agents           WebSocket Servers          │
 │  ──────────────────       ─────────────────────     ───────────────────────    │
 │  POST /analyze ───────►   speechProcessor            /live-ws  (liveProxy.ts) │
 │  POST /grammar ───────►   pronunciationAgent         Socket.IO (liveConv...)  │
 │  POST /session ───────►   fluencyAgent                                        │
 │  GET  /progress ──────►   feedbackAgent ──────────────────────────────────┐   │
 │  GET  /  (health)         analysisPipeline (cache)                         │   │
 │                           grammarAgent ───────────────────────────────────┐│   │
 │                           geminiRetry (rate limit)                        ││   │
 │                                                                            ││   │
 │  Firebase Admin SDK                                                        ││   │
 │  ─────────────────                                                         ││   │
 │  firebaseAdmin.ts ──────► Firestore DB (or in-memory mock)                ││   │
 └──────────────────────────────────────────────────────────────────────────┬─┘┘──┘
                                                                             │
                          Gemini API Calls (HTTPS/WSS)                      │
               ┌──────────────────────────────────────────────┘
               │
 ┌─────────────▼────────────────────────────────────────────────────────────────┐
 │                          Google AI (Gemini API)                              │
 │                                                                               │
 │  ┌─────────────────────────────────────────────────────────────────────────┐  │
 │  │  Gemini 2.5 Flash  (REST)          gemini-2.5-flash                    │  │
 │  │  ──────────────────────────────                                         │  │
 │  │  • feedbackAgent   → phonetic breakdown, coaching tips, accent detect  │  │
 │  │  • grammarAgent    → grammar correction, IELTS estimate, lesson builder│  │
 │  └─────────────────────────────────────────────────────────────────────────┘  │
 │                                                                               │
 │  ┌─────────────────────────────────────────────────────────────────────────┐  │
 │  │  Gemini 2.5 Flash Native Audio  (Live WebSocket)                       │  │
 │  │  ──────────────────────────────────────────────                         │  │
 │  │  • liveProxy.ts          → Solo Live Coach   (gemini-2.5-flash-native  │  │
 │  │                              -audio-latest)                             │  │
 │  │  • liveConversationServer → Live Rooms Coach  (gemini-2.5-flash-native │  │
 │  │                              -audio-preview-12-2025)                   │  │
 │  └─────────────────────────────────────────────────────────────────────────┘  │
 └───────────────────────────────────────────────────────────────────────────────┘

 ┌───────────────────────────────────────────────────────────────────────────────┐
 │                    Firebase / Firestore  (optional)                          │
 │                                                                               │
 │  Collection: sessions   { userId, text, accuracyScore, fluencyScore, ts }   │
 │  Collection: progress   { userId, wordsPracticed, streak, averageScore }    │
 └───────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Frontend Architecture

Internal structure of the React application.

```
 React Frontend  (src/)
 ════════════════════════════════════════════════════════════════════════════

 src/main.tsx
      │
      └─► src/App.tsx  (React Router v7)
               │
               ├── /               Home.tsx         (public)
               ├── /login          Login.tsx         (public)
               │
               ├── /dashboard      Dashboard.tsx       ─┐
               ├── /practice       Practice.tsx         │
               ├── /rooms          Rooms.tsx             │  ← ProtectedRoute
               ├── /grammar        Grammar.tsx           │    (requires login)
               ├── /library        Library.tsx           │
               ├── /read/:id       ReadingViewer.tsx     │
               ├── /progress       ProgressDashboard.tsx │
               ├── /analytics      Analytics.tsx         │
               └── /sessions       Sessions.tsx        ─┘

 Pages call Services:
 ─────────────────────────────────────────────────────────────────────────
  ReadingViewer  ──► pronunciationService.ts  (POST /analyze)
  Grammar        ──► fetch POST /grammar       (direct)
  Rooms          ──► liveConversationRoom.ts   (Socket.IO)
  Practice       ──► geminiLiveService.ts      (WebSocket /live-ws)
  Dashboard/     ──► progressService.ts        (GET /progress)
  Sessions

 Services:
 ─────────────────────────────────────────────────────────────────────────
  pronunciationService.ts   HTTP POST with retry + exponential backoff
  progressService.ts        HTTP GET / POST for session & stats
  geminiLiveService.ts      Singleton WebSocket → backend /live-ws
  liveConversationRoom.ts   Socket.IO client → backend Socket.IO

 State (Zustand + localStorage):
 ─────────────────────────────────────────────────────────────────────────
  useStore.tsx
    ├── user              (Firebase Auth user object)
    ├── sessions[]        (practice session history, max 200)
    ├── progressStats     (derived stats from sessions)
    ├── accentStyle       ('American' | 'British' | 'Indian')
    ├── autismMode        (accessibility toggle)
    ├── focusMode         (accessibility toggle)
    └── gentleFeedback    (accessibility toggle)

 Browser APIs used:
 ─────────────────────────────────────────────────────────────────────────
  Web Speech API          → useSpeechRecognition.ts (transcript)
  Web Audio API           → Rooms.tsx (ScriptProcessorNode, 16kHz PCM)
  MediaRecorder API       → Rooms.tsx (WebM/Opus audio chunks)
  SpeechSynthesis API     → utils/tts.ts (read passages aloud)

 Key Components:
 ─────────────────────────────────────────────────────────────────────────
  Navigation.tsx          Header / nav bar
  ProtectedRoute.tsx      Auth guard (redirects to /login)
  PronunciationCard.tsx   Per-word score with color coding
  ExplanationCard.tsx     Gemini feedback with collapsible sections
  LessonPlayer.tsx        Step-by-step grammar lesson animation
  RoomWaveform.tsx        Real-time audio waveform (canvas)
```

---

## 3. Backend Architecture

Internal structure of the Express server.

```
 Node.js / Express Backend  (backend/)
 ════════════════════════════════════════════════════════════════════════════

 backend/server.ts   (entry point, port 3000)
      │
      ├── REST Routes
      │     ├── POST   /analyze   ──► routes/analyze.ts
      │     │                           rate-limiter (15 req / 60s)
      │     │                           └──► analysisPipeline.ts
      │     │
      │     ├── POST   /grammar   ──► routes/grammar.ts
      │     │                           └──► grammarAgent.ts
      │     │
      │     ├── POST   /session   ──► routes/progress.ts
      │     ├── GET    /progress  ──► routes/progress.ts
      │     │                           └──► firebaseAdmin.ts (Firestore)
      │     └── GET    /          ──► health check
      │
      ├── WebSocket Servers
      │     ├── /live-ws ─────────────► liveProxy.ts
      │     │                           (solo live coach WebSocket proxy)
      │     └── Socket.IO ────────────► rooms/liveConversationServer.ts
      │                                 (multi-user conversation rooms)
      │
      └── Shared Utilities
            ├── firebaseAdmin.ts       Firebase Admin SDK init
            └── agents/geminiRetry.ts  Retry wrapper (429 / quota errors)

 Analysis Pipeline (agents/):
 ─────────────────────────────────────────────────────────────────────────
  analysisPipeline.ts   Orchestrator + in-memory cache (max 1000 entries)
       │
       ├── 1. speechProcessor.ts      Tokenize, strip punctuation, filter fillers
       ├── 2. pronunciationAgent.ts   Levenshtein fuzzy match expected vs spoken
       ├── 3. fluencyAgent.ts         WPM calc, repetition detect, pace category
       └── 4. feedbackAgent.ts        Gemini REST call → phonetics, tips, accent

 Grammar Agent (agents/):
 ─────────────────────────────────────────────────────────────────────────
  grammarAgent.ts       Gemini REST call → correction + IELTS estimate + lessons

 WebSocket Internals:
 ─────────────────────────────────────────────────────────────────────────
  liveProxy.ts
    • 1 WebSocket connection per browser tab (solo practice)
    • Opens Gemini Live session per connected client
    • Forwards base64 PCM → Gemini → forwards response back

  liveConversationServer.ts
    • Socket.IO rooms (2 speakers per room)
    • 1 Gemini Live session per speaker (SpeakerSession)
    • Events: join-queue, create-invite-room, join-room, audio-stream
    • Emits: room-ready, partner-audio, ai-feedback, ai-tip,
             transcript-entry, room-error, room-ended

 Output Shape (FinalAnalysisResult):
 ─────────────────────────────────────────────────────────────────────────
  {
    accuracyScore, fluencyScore, pace, wpm,
    incorrectWords[], unclearWords[], unreadWords[],
    suggestions[], tips[],
    phoneticBreakdown: { word → phonetic },
    accentInfluence, coachMessage,
    speakCorrectWords[],
    wordAnalysis[]: { word, status, score }
  }
```

---

## 4. Gemini API Integration

All four ways the platform uses Gemini AI.

```
 ╔═════════════════════════════════════════════════════════════════════════════╗
 ║                        GEMINI API INTEGRATION MAP                         ║
 ╚═════════════════════════════════════════════════════════════════════════════╝

 ┌─────────────────────────────────────────────────────────────────────────────┐
 │  FEATURE 1 — Pronunciation Feedback  (Read-Along mode)                     │
 │                                                                             │
 │  Frontend: ReadingViewer.tsx                                                │
 │      │  HTTP POST /analyze  { text, transcript, accent }                   │
 │      ▼                                                                      │
 │  Backend: routes/analyze.ts → agents/feedbackAgent.ts                      │
 │      │  Gemini REST  generateContent()                                     │
 │      │  Model: gemini-2.5-flash                                            │
 │      │  Prompt: phonetic breakdown + coaching tips + accent detection      │
 │      ▼                                                                      │
 │  Response: { tips[], phoneticBreakdown{}, accentInfluence, coachMessage }  │
 │      │  HTTP 200 JSON  →  Frontend renders PronunciationCard components    │
 └─────────────────────────────────────────────────────────────────────────────┘

 ┌─────────────────────────────────────────────────────────────────────────────┐
 │  FEATURE 2 — Grammar Correction                                             │
 │                                                                             │
 │  Frontend: Grammar.tsx                                                      │
 │      │  HTTP POST /grammar  { text }                                       │
 │      ▼                                                                      │
 │  Backend: routes/grammar.ts → agents/grammarAgent.ts                       │
 │      │  Gemini REST  generateContent()                                     │
 │      │  Model: gemini-2.5-flash                                            │
 │      │  Prompt: grammar correction + IELTS band estimate + lesson steps    │
 │      ▼                                                                      │
 │  Response: { correctedText, ieltsEstimate, lessons[{ step, tip, example }] }
 │      │  HTTP 200 JSON  →  Frontend renders LessonPlayer component          │
 └─────────────────────────────────────────────────────────────────────────────┘

 ┌─────────────────────────────────────────────────────────────────────────────┐
 │  FEATURE 3 — Solo Live Coach  (Free Speak / Practice mode)                 │
 │                                                                             │
 │  Frontend: geminiLiveService.ts (singleton WebSocket)                      │
 │      │  Browser mic → Web Audio API → PCM 16kHz → base64                  │
 │      │  WebSocket  ws://backend/live-ws                                    │
 │      │  Message: { type:"audio", data:base64PCM, mimeType:"audio/pcm" }   │
 │      ▼                                                                      │
 │  Backend: liveProxy.ts (WebSocket proxy — API key NEVER sent to browser)  │
 │      │  @google/genai  ai.live.connect()                                  │
 │      │  Model: gemini-2.5-flash-native-audio-latest                       │
 │      │  System: "You are Sonara, a friendly AI pronunciation coach…"      │
 │      │  Response modality: AUDIO                                           │
 │      ▼                                                                      │
 │  Gemini Live API  ──► spoken audio response + text transcript              │
 │      │  Backend forwards:  { type:"message", payload:{…} }                │
 │      ▼                                                                      │
 │  Frontend: plays audio response + shows transcript overlay                 │
 └─────────────────────────────────────────────────────────────────────────────┘

 ┌─────────────────────────────────────────────────────────────────────────────┐
 │  FEATURE 4 — Live Conversation Rooms  (2-person speaking rooms)            │
 │                                                                             │
 │  Frontend: liveConversationRoom.ts + Rooms.tsx                             │
 │   UserA        UserB                                                        │
 │     │            │  Socket.IO  io('http://backend')                        │
 │     │            │  emit 'join-queue' | 'create-invite-room' | 'join-room' │
 │     ▼            ▼                                                          │
 │  Backend: rooms/liveConversationServer.ts (Socket.IO server)               │
 │     │  Room matching → emit 'room-ready' to both users                     │
 │     │                                                                       │
 │     │  Each speaker gets their own SpeakerSession:                         │
 │     │  ┌──────────────────────────────────────────────────────────────┐    │
 │     │  │  SpeakerSession (per user)                                  │    │
 │     │  │   @google/genai  ai.live.connect()                         │    │
 │     │  │   Model: gemini-2.5-flash-native-audio-preview-12-2025     │    │
 │     │  │   System: "You are Sonara's live conversation coach for    │    │
 │     │  │            one speaker…"                                   │    │
 │     │  │   Response modality: AUDIO + TEXT (JSON coaching)          │    │
 │     │  └──────────────────────────────────────────────────────────────┘    │
 │     │                                                                       │
 │     │  emit 'ai-feedback' { transcript, correction,                        │
 │     │                       pronunciationTip, interruptTip }              │
 │     │  emit 'ai-tip'      (quick interruption tip)                        │
 │     │  emit 'partner-audio' (relay PCM to the other user)                 │
 │     │  emit 'transcript-entry' (line for transcript display)              │
 │     ▼                                                                       │
 │  Frontend: renders RoomWaveform + transcript overlay + AI coaching cards  │
 └─────────────────────────────────────────────────────────────────────────────┘

 API Key Security:
 ─────────────────────────────────────────────────────────────────────────────
  GEMINI_API_KEY is stored ONLY in the backend .env file.
  It is never sent to the browser. The backend acts as a secure proxy for
  all Gemini API calls (both REST and Live WebSocket).
```

---

## 5. Pronunciation Analysis Pipeline

The step-by-step pipeline that processes a recorded reading attempt.

```
 User reads a passage aloud
          │
          ▼
 ┌─────────────────────────────────────────────────────────────────────────────┐
 │  Browser  (ReadingViewer.tsx)                                               │
 │                                                                             │
 │  useSpeechRecognition.ts                                                    │
 │    Web Speech API  ──►  transcript (what was actually spoken)               │
 │    Web Audio API   ──►  audioUrl   (optional recording)                     │
 └─────────────────────┬───────────────────────────────────────────────────────┘
                       │  HTTP POST /analyze
                       │  { text: expectedText, transcript: spokenText,
                       │    accent: "American" | "British" | "Indian" }
                       ▼
 ┌─────────────────────────────────────────────────────────────────────────────┐
 │  Backend  routes/analyze.ts                                                 │
 │  Rate limiter: 15 requests / 60 seconds per IP                             │
 │                          │                                                  │
 │                          ▼                                                  │
 │  ┌─────────────────────────────────────────────────────────────────────┐   │
 │  │  analysisPipeline.ts  (in-memory cache, max 1000 entries)          │   │
 │  │                                                                     │   │
 │  │  Step 1 — speechProcessor.ts                                       │   │
 │  │    • Tokenize transcript                                            │   │
 │  │    • Strip punctuation                                              │   │
 │  │    • Filter filler words (uh, um, like, ah…)                      │   │
 │  │    Output: cleanTranscript, tokens[], wordCount                    │   │
 │  │                     │                                              │   │
 │  │  Step 2 — pronunciationAgent.ts                                    │   │
 │  │    • Levenshtein distance fuzzy match                              │   │
 │  │      (expected tokens vs spoken tokens)                           │   │
 │  │    Output: incorrectWords[], unclearWords[], unreadWords[],        │   │
 │  │            wordAnalysis[{ word, status, score }], accuracyScore   │   │
 │  │                     │                                              │   │
 │  │  Step 3 — fluencyAgent.ts                                          │   │
 │  │    • Words-per-minute calculation                                  │   │
 │  │    • Repeated-word detection                                       │   │
 │  │    Output: wpm, fluencyScore, paceCategory                        │   │
 │  │             ('slow' | 'optimal' | 'fast')                         │   │
 │  │                     │                                              │   │
 │  │  Step 4 — feedbackAgent.ts  ──► Gemini 2.5 Flash (REST)           │   │
 │  │    Prompt includes: expected text, transcript, accent style,       │   │
 │  │                     incorrect/unclear words                        │   │
 │  │    Gemini returns:  phonetic breakdown per word                    │   │
 │  │                     coaching tips & suggestions                    │   │
 │  │                     accent influence notes                         │   │
 │  │                     speakCorrectWords[]                            │   │
 │  │    geminiRetry.ts: auto-retry up to 3×  on 429/quota errors       │   │
 │  └─────────────────────────────────────────────────────────────────────┘   │
 │                          │                                                  │
 │                          ▼                                                  │
 │               FinalAnalysisResult  JSON                                     │
 └─────────────────────────┬───────────────────────────────────────────────────┘
                           │  HTTP 200 JSON
                           ▼
 ┌─────────────────────────────────────────────────────────────────────────────┐
 │  Browser  (ReadingViewer.tsx)                                               │
 │                                                                             │
 │  ├── PronunciationCard  per word (green / yellow / red based on score)     │
 │  ├── ExplanationCard    (collapsible phonetic + tip sections)              │
 │  ├── Progress saved to Zustand store + localStorage                        │
 │  └── progressService.ts  ──►  POST /session  ──►  Firestore               │
 └─────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Live Conversation Rooms Data Flow

How two speakers interact through the real-time room feature.

```
  UserA (Browser)                  Backend (Socket.IO)            UserB (Browser)
 ─────────────────────────         ───────────────────────────    ─────────────────────
                                                                  
  emit 'join-queue'  ──────────►  liveConversationServer.ts
                                   waitingQueue.push(UserA)
                                                                   emit 'join-queue' ──►
                                   waitingQueue.push(UserB)
                                   match: create Room{A,B}
                                   emit 'room-ready' ◄──────────────────────────────────
  ◄──── emit 'room-ready'          (to both users)
  
  ─────────────────────────────────────────────────────────────────────────────────────
  
  [Speaking begins]
  
  mic → Web Audio API
  PCM 16kHz → base64
  emit 'audio-stream'  ──────────►  RoomState.sessionA
   { pcmData, mediaData }            SpeakerSession (Gemini Live)
                                     │   audio/pcm;rate=16000
                                     ▼
                                  ┌──────────────────────────────────────────┐
                                  │  Gemini 2.5 Flash Native Audio  (Live)  │
                                  │  System prompt: conversation coach       │
                                  │  Response: AUDIO + TEXT (JSON)           │
                                  └──────────────────────────────────────────┘
                                     │
                                     ├── emit 'ai-feedback' ◄── UserA
                                     │    { transcript, correction,
                                     │      pronunciationTip, interruptTip }
                                     │
                                     ├── emit 'ai-tip' ◄── UserA (quick tip)
                                     │
                                     └── emit 'transcript-entry' ◄── UserA
  
  emit 'audio-stream' ──────────►   RoomState.sessionA
   { mediaData }                     relay partner audio
                                     emit 'partner-audio' ──────────────────►
                                                                   ◄── plays partner voice
  ─────────────────────────────────────────────────────────────────────────────────────
  
  [Same flow in reverse for UserB speaking]
  
  ─────────────────────────────────────────────────────────────────────────────────────
  
  Room Types:
    Random match   →  emit 'join-queue'          (paired with first waiting user)
    Private room   →  emit 'create-invite-room'  (server returns roomId + share URL)
    Join by link   →  emit 'join-room' { roomId } (or ?room=ID URL param)
```

---

## 7. Solo Live Coach Data Flow

How the single-user free-speak practice mode works.

```
  Browser (Practice.tsx / geminiLiveService.ts)
  │
  │  [User clicks "Start Speaking"]
  │
  ├── navigator.mediaDevices.getUserMedia({ audio: true })
  ├── AudioContext → ScriptProcessorNode → PCM Float32 → Int16 → base64
  │
  │  [WebSocket connection established]
  │
  │  new WebSocket('wss://backend/live-ws')
  │       │
  │       │   Send audio chunks:
  │       │   { type: "audio", data: base64PCM, mimeType: "audio/pcm;rate=16000" }
  │       │
  │       ▼
  ┌──────────────────────────────────────────────────────────────────────────┐
  │  Backend: liveProxy.ts                                                  │
  │                                                                          │
  │  On new WebSocket connection:                                            │
  │    • Creates Gemini Live session (ai.live.connect())                    │
  │    • Model: gemini-2.5-flash-native-audio-latest                        │
  │    • System: "You are Sonara, a friendly AI pronunciation coach.        │
  │               Listen carefully, give warm coaching feedback…"           │
  │    • Response modality: AUDIO                                            │
  │                                                                          │
  │  On message from client:                                                 │
  │    • Decode base64 PCM                                                   │
  │    • session.sendRealtimeInput({ audio: { data, mimeType } })           │
  │                                                                          │
  │  On response from Gemini:                                                │
  │    • Forward to browser: { type: "message", payload: geminiResponse }   │
  │                                                                          │
  │  On client disconnect:                                                   │
  │    • session.close()   (no dangling Gemini sessions)                    │
  └──────────────────────────────────────────────────────────────────────────┘
       │
       │  { type: "message", payload: { audio, text } }
       ▼
  Browser: plays audio coaching response + shows transcript
  
  Security note: GEMINI_API_KEY is only in the backend process.
  The browser WebSocket never receives or transmits the API key.
```

---

## 8. Firebase Progress Tracking

How user sessions and progress are stored and retrieved.

```
  [After a practice session completes]
  
  Browser (ReadingViewer.tsx / useSpeechRecognition.ts)
      │
      │  progressService.ts
      │  HTTP POST /session
      │  { userId, text, accuracyScore, fluencyScore, timestamp }
      ▼
  Backend: routes/progress.ts
      │
      ├── If FIREBASE_SERVICE_ACCOUNT env var is set:
      │     firebaseAdmin.ts  (Firebase Admin SDK)
      │       └──►  Firestore  db.collection('sessions').add({...})
      │
      └── If env var NOT set (demo/dev mode):
            in-memory mock database (resets on server restart)
  
  ─────────────────────────────────────────────────────────────────────────────
  
  [User views Dashboard / Progress page]
  
  Browser (ProgressDashboard.tsx)
      │
      │  progressService.ts
      │  HTTP GET /progress?userId=<firebaseUid>
      ▼
  Backend: routes/progress.ts
      │     Firestore db.collection('progress').where('userId','==',userId)
      ▼
  Response: { wordsPracticed, streak, averageScore, totalSessions }
      │
      ▼
  Frontend: renders charts, streak counter, accuracy trend (Framer Motion)
  
  Local state:
    Zustand store + localStorage also cache sessions (max 200) so the
    dashboard works fully offline / without Firebase.
  
  Firebase Collections:
  ─────────────────────────────────────────────────────────────────────────────
    sessions  { userId, text, accuracyScore, fluencyScore, timestamp }
    progress  { userId, wordsPracticed, streak, averageScore }
```

---

## 9. Deployment Architecture

How the system is hosted in production.

```
 ┌──────────────────────────────────────────────────────────────────────────┐
 │                         PRODUCTION DEPLOYMENT                           │
 └──────────────────────────────────────────────────────────────────────────┘

 ┌─────────────────────────┐        ┌──────────────────────────────────────┐
 │   Vercel (CDN / Edge)   │        │   Google Cloud Run                   │
 │                         │        │                                      │
 │  React SPA (Vite build) │        │  Docker container (node:18-alpine)   │
 │  ─────────────────────  │        │  ─────────────────────────────────   │
 │  • Static files served  │        │  backend/server.ts  (port 8080)      │
 │    from global CDN      │        │                                      │
 │  • Auto-deploy from     │        │  Environment variables:              │
 │    GitHub main branch   │        │    GEMINI_API_KEY                    │
 │                         │        │    FIREBASE_SERVICE_ACCOUNT          │
 │  Environment variables: │        │    CORS_ORIGINS                      │
 │    VITE_BACKEND_URL     │        │    PORT                              │
 │    VITE_BACKEND_WS_URL  │        │                                      │
 └────────────┬────────────┘        └──────────────────┬───────────────────┘
              │                                        │
              │  HTTPS                                 │  HTTPS / WSS
              │  (browser → backend REST + WS)        │  (to Gemini API)
              │                                        │
              └─────────────────┬──────────────────────┘
                                │
                                ▼
                    ┌─────────────────────────┐
                    │     Google AI Studio    │
                    │    (Gemini API)          │
                    │                         │
                    │  gemini-2.5-flash        │
                    │  gemini-2.5-flash-       │
                    │  native-audio-*          │
                    └─────────────────────────┘

 Build & Deploy Commands:
 ─────────────────────────────────────────────────────────────────────────
  Frontend:   npm run build          # tsc -b && vite build → dist/
  Backend:    cd backend && npx tsc --noEmit   # type-check only
  Deploy:     ./deploy.sh            # builds Docker image & deploys to
                                     # Google Cloud Run via gcloud CLI

 Local Development:
 ─────────────────────────────────────────────────────────────────────────
  Frontend:   npm run dev            # Vite dev server → localhost:5173
  Backend:    cd backend && node -r  # ts-node or compiled JS → localhost:3000
  Lint:       npm run lint           # ESLint
```

---

*Generated by GitHub Copilot — reflects the codebase at time of creation.*
