# Sonara — Gemini Connection Diagrams (Room · Grammar · Live AI Coach)

This document provides **Mermaid visual diagrams** that show how each feature connects to Gemini through the frontend and backend layers.

---

## 1) Rooms → Gemini (Socket.IO + Gemini Live)

```mermaid
flowchart LR
  %% Frontend
  subgraph FE[Frontend · Browser]
    RoomPage["Rooms.tsx\n(Rooms UI)"]
    RoomSvc["liveConversationRoom.ts\n(Socket.IO client)"]
    Mic["Web Audio API\n16 kHz PCM"]
    Media["MediaRecorder\nWebM/Opus"]
  end

  %% Backend
  subgraph BE[Backend · Node/Express + Socket.IO]
    RoomServer["liveConversationServer.ts\n(RoomState + Socket.IO)"]
    SpeakerA["SpeakerSession A\nGemini Live WS"]
    SpeakerB["SpeakerSession B\nGemini Live WS"]
    TurnAnalysis["Turn analysis\nPCM → WAV → REST"]
  end

  %% Gemini
  subgraph GM[Gemini API]
    Live["Gemini Live\ngemini-2.0-flash-live-001"]
    Flash["Gemini Flash (REST)\ngemini-2.5-flash"]
  end

  Mic -->|"pcmData (base64)"| RoomSvc
  Media -->|"mediaData (WebM base64)"| RoomSvc
  RoomPage --> RoomSvc
  RoomSvc <--> |"Socket.IO"| RoomServer

  RoomServer -->|"sendAudio(pcm)"| SpeakerA
  RoomServer -->|"sendAudio(pcm)"| SpeakerB
  SpeakerA <--> |"Gemini Live WS"| Live
  SpeakerB <--> |"Gemini Live WS"| Live

  RoomServer -->|"audio-stream-end"| TurnAnalysis
  TurnAnalysis -->|"REST"| Flash

  RoomServer -->|"partner-audio"| RoomSvc
  RoomServer -->|"ai-feedback / ai-tip"| RoomSvc
```

**Notes**
- Two **independent Gemini Live sessions** (one per speaker) are created per room.
- `audio-stream-end` triggers a **turn analysis** REST call for detailed feedback rows.

---

## 2) Grammar → Gemini (REST + JSON mode)

```mermaid
flowchart LR
  %% Frontend
  subgraph FE[Frontend · Browser]
    GrammarPage["Grammar.tsx\nText input + Analyze"]
    Lesson["LessonPlayer\n(diff + chart)"]
  end

  %% Backend
  subgraph BE[Backend · Express REST]
    GrammarRoute["routes/grammar.ts\nPOST /grammar"]
    GrammarAgent["agents/grammarAgent.ts\ncheckGrammar(text)"]
  end

  %% Gemini
  subgraph GM[Gemini API]
    Flash["Gemini 2.5 Flash\napplication/json"]
  end

  GrammarPage -->|"POST /grammar {text}"| GrammarRoute
  GrammarRoute --> GrammarAgent
  GrammarAgent -->|"REST"| Flash
  Flash -->|"GrammarResult JSON"| GrammarAgent
  GrammarRoute -->|"JSON response"| Lesson
```

**Notes**
- Uses **Gemini Flash REST** with `responseMimeType: application/json` to return a structured lesson.

---

## 3) Live AI Coach → Gemini (Native WebSocket + Live Audio)

```mermaid
flowchart LR
  %% Frontend
  subgraph FE[Frontend · Browser]
    FreeSpeak["FreeSpeakMode.tsx\nStart Coaching"]
    LiveSvc["geminiLiveService.ts\nWebSocket client"]
    Mic["Web Audio API\n16 kHz PCM"]
    AudioOut["AudioContext\nPlayback"]
  end

  %% Backend
  subgraph BE[Backend · ws Proxy]
    LiveProxy["liveProxy.ts\n/live-ws upgrade"]
    Session["ai.live.connect()\nGemini Live session"]
  end

  %% Gemini
  subgraph GM[Gemini API]
    Live["Gemini Live\nGEMINI_LIVE_MODEL (env)"]
  end

  Mic -->|"base64 PCM chunks"| LiveSvc
  FreeSpeak --> LiveSvc
  LiveSvc <--> |"WebSocket /live-ws"| LiveProxy
  LiveProxy --> Session
  Session <--> |"Gemini Live WS"| Live
  LiveProxy -->|"audio + text"| LiveSvc
  LiveSvc --> AudioOut
```

**Notes**
- The **Gemini API key remains server-side only** inside `liveProxy.ts`.
- Gemini Live returns **audio responses** (plus text transcripts) that are played in the browser.

---

## Security Invariant (All 3 Flows)

The **Gemini API key never reaches the browser**. All Gemini calls are proxied through the backend (`/live-ws` for Live AI Coach, Socket.IO rooms server for Rooms, REST `/grammar` for Grammar).
