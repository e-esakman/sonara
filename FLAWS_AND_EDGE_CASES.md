# Sonara — Known Flaws & Edge Cases

This document catalogues current technical limitations, known bugs, and edge cases that represent opportunities for improvement. It is intended for internal engineering use and future sprint planning.

---

## 1. Real-time Audio Processing

### 1.1 `ScriptProcessorNode` is deprecated
**File:** `src/pages/Rooms.tsx`  
**Issue:** `AudioContext.createScriptProcessor()` was deprecated in the Web Audio API in favor of `AudioWorkletNode`. Browsers continue to support it but may remove it in future releases.  
**Impact:** Possible silent failure in future browser versions; worklet migration also improves off-main-thread processing performance.  
**Fix:** Migrate to `AudioWorkletProcessor` with a dedicated worklet script (`pcm-processor.worklet.js`).

### 1.2 No explicit audio track teardown on tab hide
**File:** `src/pages/Rooms.tsx`  
**Issue:** If the user switches tabs while recording, the `ScriptProcessorNode` keeps firing and buffering audio but the `visibilitychange` event is never handled.  
**Impact:** Stale audio chunks accumulate; Gemini Live session receives meaningless audio; waveform visualiser freezes.  
**Fix:** Listen to `document.addEventListener('visibilitychange', ...)` and pause/resume the audio graph.

### 1.3 PCM frame size mismatch at low-spec devices
**File:** `src/pages/Rooms.tsx`  
**Issue:** The `bufferSize` is hardcoded at 4096 samples. Some low-end Android browsers request a different sample rate from `getUserMedia`, which can silently deliver 8 kHz audio wrapped in the 16 kHz container expected by Gemini.  
**Impact:** Muffled/unintelligible audio to Gemini; garbled transcripts.  
**Fix:** Read `audioTrack.getSettings().sampleRate` and resample if it differs from 16 000 Hz.

---

## 2. Socket.IO & WebSocket Layer

### 2.1 Forced `polling` transport prevents true WebSocket upgrade
**File:** `src/services/liveConversationRoom.ts`  
**Issue:** Socket.IO client is constructed with `transports: ['polling']` — HTTP long-polling only. WebSocket transport is disabled.  
**Impact:** Higher latency per audio chunk (HTTP round-trip overhead); audio bursts can saturate the polling connection; not suitable for truly low-latency streaming.  
**Fix:** Change to `transports: ['websocket', 'polling']` (websocket first, polling as fallback); update Cloud Run to allow WebSocket upgrade (currently requires `--allow-unauthenticated` and no load-balancer timeout issues).

### 2.2 No heartbeat / reconnection guard on Gemini Live sessions
**File:** `backend/rooms/liveConversationServer.ts`, `backend/liveProxy.ts`  
**Issue:** If the Gemini Live SDK silently drops the session (network blip), the backend continues buffering PCM and emitting events with no feedback returned.  
**Impact:** Users hear silence; they do not know the AI coach has disconnected.  
**Fix:** Implement a keep-alive ping on the Gemini session and re-establish it on failure; emit a `coach-offline` event to the frontend.

### 2.3 Room state is in-process memory only
**File:** `backend/rooms/liveConversationServer.ts` — `rooms: Map<string, RoomState>`  
**Issue:** All room state lives in a Node.js `Map` on a single Cloud Run instance.  
**Impact:** Cloud Run can spin up multiple instances; two users matched by queue could land on different instances and never see each other.  
**Fix:** Use a Redis or Firestore-backed room registry; or enforce sticky sessions (`--session-affinity` on Cloud Run); or use a dedicated Socket.IO adapter (e.g., `socket.io-redis`).

### 2.4 Partner audio relay via base64 over Socket.IO
**File:** `src/pages/Rooms.tsx`, `backend/rooms/liveConversationServer.ts`  
**Issue:** Partner audio (WebM/Opus) is base64-encoded and sent as JSON over Socket.IO. This adds ~33 % payload overhead per chunk.  
**Fix:** Use Socket.IO binary frames (`socket.emit('partner-audio', Buffer.from(...))`) with `ArrayBuffer` on the client.

---

## 3. Room & Session Management

### 3.1 No room size enforcement beyond 2 users
**File:** `backend/rooms/liveConversationServer.ts`  
**Issue:** The code guards against `userB` being already set, but a race condition between two concurrent `join-room` events could allow a third socket to replace `userB`.  
**Impact:** One user is silently evicted; Gemini sessions may dangle.  
**Fix:** Wrap the `join-room` handler in a mutex or check-and-set pattern; emit an explicit `room-full` error.

### 3.2 Gemini sessions are not cleaned up on unexpected disconnect
**File:** `backend/rooms/liveConversationServer.ts` — `disconnect` handler  
**Issue:** If a user's socket disconnects without emitting `leave-room` (e.g., network drop), the `disconnect` event handler calls `closeRoom`, which tries to call `geminiSession.close()`. If the session object is in a half-open state, this can throw and leave the room in the `rooms` map indefinitely.  
**Impact:** Memory leak; stale `rooms` entries.  
**Fix:** Wrap `geminiSession.close()` in `try/catch` (partially done) and ensure `rooms.delete(roomId)` is always called in a `finally` block.

### 3.3 Orphaned invite rooms never expire
**File:** `backend/rooms/liveConversationServer.ts`  
**Issue:** When a user creates an invite link (`create-invite-room`) but no second user ever joins, the `RoomState` entry lives in the `rooms` map forever.  
**Impact:** Memory grows unboundedly on long-running instances.  
**Fix:** Set a TTL (e.g., 10 minutes) using `setTimeout`; delete the room and notify the creator.

---

## 4. AI / Gemini Integration

### 4.1 Duplicate transcript filtering is fragile
**File:** `backend/rooms/liveConversationServer.ts`  
**Issue:** `lastTranscriptA` / `lastTranscriptB` are compared with strict equality to avoid emitting the same transcript twice. Gemini often returns partial transcripts that accumulate (e.g., `"Hello"` → `"Hello how"` → `"Hello how are"`). The deduplication discards valid continuations.  
**Impact:** Transcript display may skip words.  
**Fix:** Use the `inputAudioTranscription` field's `isFinal` flag (when Gemini provides it) or compare transcript suffix overlap rather than full equality.

### 4.2 `analyzeBufferedAudio` fallback re-transcribes unnecessarily
**File:** `backend/rooms/liveConversationServer.ts`  
**Issue:** When the post-turn fallback fires (`audio-stream-end`), it sends buffered PCM to Gemini Flash for a second transcription pass, even if the Live session already returned a full transcript.  
**Impact:** Extra API cost and latency; responses may conflict.  
**Fix:** Gate the fallback on whether a valid transcript was already received from the Live session during the turn.

### 4.3 No retry or timeout on `runAnalysisPipeline`
**File:** `backend/routes/analyze.ts`, `backend/agents/geminiRetry.ts`  
**Issue:** `geminiRetry.ts` exists but it is unclear whether all agents (especially `feedbackAgent.ts`) wrap their Gemini calls with it.  
**Impact:** A single Gemini hiccup returns a 500 to the user with no retry.  
**Fix:** Audit all `generateContent` calls and ensure they go through the retry helper with an exponential back-off (max 3 attempts).

### 4.4 Model name hardcoded as preview/experimental variant
**File:** `backend/rooms/liveConversationServer.ts`  
**Issue:** The rooms pipeline uses `gemini-2.5-flash-native-audio-preview-12-2025`, a time-limited preview model.  
**Impact:** The model may be deprecated without notice, breaking the feature.  
**Fix:** Move model identifiers to environment variables with stable-channel defaults; add a health-check endpoint that tests the Gemini connection on startup.

---

## 5. Security & Input Validation

### 5.1 CORS configuration is too permissive in code despite env var
**File:** `backend/server.ts`  
**Issue:** The parsed `allowedOrigins` set is built from `CORS_ORIGINS` but the `cors()` middleware is configured with `origin: true` (allow all origins). The allowlist is only used for Socket.IO, not for REST endpoints.  
**Impact:** Any origin can call `/analyze`, `/grammar`, and `/progress` — potentially abused by third-party scrapers or prompt-injection services.  
**Fix:** Pass `origin: (origin, cb) => cb(null, allowedOrigins.has(origin ?? '') || !origin)` to the `cors()` call.

### 5.2 No authentication on room endpoints
**File:** `backend/rooms/liveConversationServer.ts`  
**Issue:** Anyone who discovers the Socket.IO endpoint can create rooms, join queues, and consume Gemini quota.  
**Impact:** Quota exhaustion attack; Gemini billing risk.  
**Fix:** Validate a short-lived JWT or session token on the Socket.IO `connection` event (e.g., passed via `auth` option in Socket.IO handshake).

### 5.3 `userId` in progress route accepts arbitrary strings after sanitisation
**File:** `backend/routes/progress.ts`  
**Issue:** `userId` is sanitised to `[a-zA-Z0-9_-]` but its maximum length is not capped.  
**Impact:** An attacker can craft a very long `userId` to create unboundedly large Firestore document IDs (Firestore limit is 1 500 bytes; values approaching this may cause silent truncation or errors).  
**Fix:** Add `userId = userId.slice(0, 128)` after sanitisation.

---

## 6. Frontend State & UX

### 6.1 Transcript array capped at 24 entries with `Array.unshift`
**File:** `src/pages/Rooms.tsx`  
**Issue:** `transcripts` is kept to the last 24 entries by slicing after each `unshift`. On slow devices, frequent state updates cause re-renders for every 256 ms audio chunk (even when there is nothing new to show).  
**Fix:** Batch transcript updates with `useReducer` or debounce state flushes.

### 6.2 `liveTip` clears after a fixed 3 200 ms regardless of tip length
**File:** `src/pages/Rooms.tsx`  
**Issue:** Short tips disappear before users can read them; long tips are cleared mid-read.  
**Fix:** Calculate display duration based on word count (e.g., 200 WPM minimum).

### 6.3 No error boundary around the room component
**File:** `src/pages/Rooms.tsx`  
**Issue:** Any unhandled JavaScript exception inside the 800-line `Rooms.tsx` will blank the entire page with React's default error overlay (in dev) or a white screen (in production).  
**Fix:** Wrap with a React `ErrorBoundary` component that shows a graceful "Something went wrong" UI and logs to a monitoring service.

### 6.4 Audio playback queue has no buffer underrun handling
**File:** `src/pages/Rooms.tsx` — `playNextPartnerChunk()`  
**Issue:** Partner audio blobs are played sequentially; if network latency causes a gap, the queue empties and there is no jitter buffer or silence insertion.  
**Impact:** Choppy partner audio in high-latency conditions.  
**Fix:** Introduce a small playback buffer (e.g., pre-buffer 2 chunks before starting playback).

---

## 7. Scalability

### 7.1 Cloud Run default concurrency may interleave audio processing
**File:** `deploy.sh`  
**Issue:** Cloud Run by default allows many concurrent requests per container instance. CPU-bound PCM processing or multiple concurrent Gemini Live sessions on the same instance could starve each other.  
**Fix:** Set `--concurrency=10` (or tune based on load testing) and `--cpu=2` in `deploy.sh`.

### 7.2 No observability / distributed tracing
**Issue:** There are no structured logs, no request IDs propagated end-to-end, and no metrics (Prometheus/Cloud Monitoring) exposed.  
**Impact:** Debugging production incidents requires grepping raw logs.  
**Fix:** Add `pino` or `winston` structured logging with a `requestId` correlation header; export metrics to Cloud Monitoring via the OpenTelemetry SDK.

---

## 8. Minor Edge Cases That Silently Break Voice or Transcription

These are smaller, targeted bugs found directly in the source code. Each one can cause audio to stop flowing or transcription to silently fail without any visible error.

---

### 8.1 Wrong fallback model name — `gemini-3-flash-preview` does not exist
**File:** `backend/rooms/liveConversationServer.ts` — `analyzeBufferedAudio()`  
**Issue:** The post-turn fallback calls `ai.models.generateContent({ model: 'gemini-3-flash-preview', ... })`. This model identifier does not exist in the Gemini API (the correct name is `gemini-2.0-flash-001` or `gemini-1.5-flash`).  
**Impact:** Every post-turn fallback analysis silently throws a `404 / NOT_FOUND` error, which is caught and logged. The user sees "Gemini analysis failed" in the debug panel and receives no fallback transcript. This is a guaranteed failure on every call.  
**Fix:** Change to a valid model name and move it to an environment variable, matching the approach recommended for the Live model in item 4.4.

---

### 8.2 `ensureSpeakerSession` race condition creates duplicate Gemini sessions
**File:** `backend/rooms/liveConversationServer.ts` — `ensureSpeakerSession()` and the `audio-stream` handler  
**Issue:** `audio-stream` events fire every ~256 ms. Each handler `await`s `ensureSpeakerSession`. Because `async` handlers are not serialized, multiple calls can enter the function concurrently while `room[key]` is still `null`. Each concurrent call starts a new `SpeakerSession.connect()`, and all but the last overwrite `room[key]`, leaving orphaned Gemini Live sessions open indefinitely.  
**Impact:** Duplicate Gemini connections consume API quota. The sessions that lose the race are never closed, and their callbacks fire into a stale closure, occasionally emitting phantom feedback events to the wrong socket.  
**Fix:** Set `room[key]` to a sentinel (e.g., a pending `Promise`) before the first `await`, so subsequent calls return the in-flight promise rather than starting a new session.

---

### 8.3 Socket.IO reconnection silently destroys room membership
**File:** `src/services/liveConversationRoom.ts`, `backend/rooms/liveConversationServer.ts`  
**Issue:** Socket.IO is created with `reconnection: true`. If the connection drops and reconnects, the socket gets a new `socket.id`. The backend's `roomBySocket` map still has the old socket ID; the new ID is unknown. All subsequent `audio-stream` events are silently discarded (`roomBySocket.get(socket.id)` returns `undefined`). The frontend still shows the room as connected.  
**Impact:** After any reconnect, the user's audio is silently dropped, no transcription occurs, and no error is shown.  
**Fix:** Either disable reconnection (`reconnection: false`) and show a clear "Connection lost, please rejoin" message, or implement a `rejoin-room` socket event that the client emits on `reconnect` with the stored `roomId` so the backend can remap the socket ID.

---

### 8.4 `AudioContext` enters suspended state after browser tab blur
**File:** `src/pages/Rooms.tsx` — `startSpeaking()`  
**Issue:** Chromium-based browsers automatically suspend `AudioContext` when the page loses focus (e.g., user alt-tabs). The `ScriptProcessorNode`'s `onaudioprocess` callback stops firing. The code never calls `micContextRef.current.resume()` after the context is suspended.  
**Impact:** If the user switches away and back, audio processing stops silently. The waveform freezes, no PCM is sent, and the Gemini Live session eventually times out waiting for input.  
**Fix:** Listen to `document.addEventListener('visibilitychange', ...)` and call `micContextRef.current?.resume()` when `document.visibilityState === 'visible'` and the mic is active.

---

### 8.5 Partner audio relay fails silently on iOS Safari
**File:** `src/pages/Rooms.tsx` — `relayMimeType` detection  
**Issue:** The `relayMimeType` is chosen by checking `MediaRecorder.isTypeSupported('audio/webm;codecs=opus')`, falling back to `'audio/webm'`. Neither format is supported by `MediaRecorder` on iOS Safari (which only supports `audio/mp4`). When `MediaRecorder` is constructed with an unsupported `mimeType`, it throws a `NotSupportedError`.  
**Impact:** The `relayRecorder` creation inside `startSpeaking()` throws, which is not caught. The whole `startSpeaking()` call rejects, the mic never starts, and the user sees "Unable to access your microphone right now."  
**Fix:** Add `audio/mp4` to the type detection chain; wrap `new MediaRecorder(stream, { mimeType })` in a `try/catch` and fall back to `new MediaRecorder(stream)` with no explicit mimeType.

---

### 8.6 Duplicate feedback emission for the same speech turn
**File:** `backend/rooms/liveConversationServer.ts` — `SpeakerSession.handleMessage()`  
**Issue:** The message handler emits a feedback event for `inputTranscription.text` (the raw transcript) **and** separately parses `modelTurn.parts[].text` for a JSON feedback object. When Gemini returns both in the same message, `onFeedback()` is called twice for the same turn — first with only the transcript, then again with the full parsed JSON.  
**Impact:** The frontend receives two `ai-feedback` events per turn. The first (transcript-only) appears in the feedback panel immediately, then a second entry arrives with the pronunciation tip and correction. Users see the same turn listed twice.  
**Fix:** Prefer the full JSON feedback when it parses successfully; emit the raw `inputTranscription.text` only as a fallback when JSON parsing fails.

---

### 8.7 Microphone OS indicator stays active after leaving a room
**File:** `src/pages/Rooms.tsx` — `leaveRoom()`  
**Issue:** `leaveRoom()` calls `stopSpeaking()`, which disconnects the Web Audio graph nodes but does **not** call `mediaStreamRef.current?.getTracks().forEach(t => t.stop())`. The underlying `MediaStream` track stays live.  
**Impact:** The browser's microphone-in-use indicator (the red dot in the tab) stays active after leaving the room. On mobile, the microphone hardware may not release until the component unmounts. The OS mic lock can prevent other apps from accessing the microphone.  
**Fix:** In `stopSpeaking()` (or immediately after in `leaveRoom()`), call `mediaStreamRef.current?.getTracks().forEach(t => t.stop())` and set `mediaStreamRef.current = null` so the next `ensureMicrophone()` call requests a fresh stream.

---

### 8.8 `partnerAudioQueueRef` not cleared when the room ends
**File:** `src/pages/Rooms.tsx` — `room-ended` socket handler  
**Issue:** The `room-ended` event handler calls `stopSpeaking()` but does not reset `partnerAudioQueueRef.current`. If audio chunks arrived just before the room ended, they sit in the queue and are played after the user is back in the lobby.  
**Impact:** The user hears the partner's voice unexpectedly after the room has ended, potentially over a new room's audio.  
**Fix:** Add `partnerAudioQueueRef.current = [];` inside the `room-ended` handler (alongside the existing `stopSpeaking()` call).

---

### 8.9 `webkitAudioContext` ignores the `sampleRate` constructor option
**File:** `src/pages/Rooms.tsx` — `startSpeaking()`  
**Issue:** On older Safari, `webkitAudioContext` does not honor the `sampleRate` option passed to its constructor. The context is created at the system's default rate (typically 44 100 Hz or 48 000 Hz). The PCM data sent to Gemini is then labelled `audio/pcm;rate=16000` but actually contains audio at a higher rate.  
**Impact:** Gemini receives audio that is pitched down and approximately 2.75× slower than expected. Transcription fails or returns garbled text.  
**Fix:** After creating the context, check `micContext.sampleRate` and, if it differs from 16 000 Hz, insert an `OfflineAudioContext` resample step, or explicitly inform the user that their browser does not support the required audio format.

---

### 8.10 `VITE_BACKEND_URL` fallback constructs wrong URL in production
**File:** `src/services/liveConversationRoom.ts`  
**Issue:** When `VITE_BACKEND_URL` is not set, the service falls back to `` `${window.location.protocol}//${window.location.hostname}:3000` ``. On Vercel, `window.location.hostname` is the Vercel domain (e.g., `sonara.vercel.app`). The constructed URL becomes `https://sonara.vercel.app:3000`, which does not exist.  
**Impact:** All Socket.IO connection attempts fail in production if `VITE_BACKEND_URL` is not explicitly configured on Vercel. The error shows as "Room server offline" with no hint that the environment variable is missing.  
**Fix:** Remove the dynamic fallback and document that `VITE_BACKEND_URL` is **required** in production deployments; throw an explicit error or display a configuration warning when the variable is absent.

---

## Priority Matrix

| ID | Area | Severity | Effort | Recommended Action |
|----|------|----------|--------|--------------------|
| 2.3 | Multi-instance room state | 🔴 Critical | Medium | Redis adapter |
| 5.1 | CORS over-permissive | 🔴 Critical | Low | Fix `cors()` call |
| 5.2 | Unauthenticated rooms | 🔴 Critical | Medium | JWT on handshake |
| 8.1 | Wrong fallback model name | 🔴 Critical | Low | Fix model name / env var |
| 8.3 | Reconnect destroys room membership | 🔴 Critical | Low | `rejoin-room` event or disable reconnect |
| 2.1 | Polling-only transport | 🟠 High | Low | Enable WS transport |
| 3.3 | Orphaned invite rooms | 🟠 High | Low | TTL + cleanup |
| 4.4 | Preview Live model hardcoded | 🟠 High | Low | Env var for model name |
| 8.2 | `ensureSpeakerSession` race | 🟠 High | Low | Promise sentinel guard |
| 8.5 | iOS Safari MediaRecorder failure | 🟠 High | Low | `audio/mp4` fallback |
| 8.10 | `VITE_BACKEND_URL` wrong fallback | 🟠 High | Low | Require env var, add warning |
| 1.1 | `ScriptProcessorNode` deprecated | 🟡 Medium | High | AudioWorklet migration |
| 4.2 | Redundant fallback transcription | 🟡 Medium | Low | Gate on Live transcript |
| 6.3 | No error boundary | 🟡 Medium | Low | Add `ErrorBoundary` |
| 7.1 | Cloud Run concurrency | 🟡 Medium | Low | Tune `--concurrency` |
| 8.4 | AudioContext suspended on blur | 🟡 Medium | Low | `visibilitychange` resume |
| 8.6 | Duplicate feedback per turn | 🟡 Medium | Low | Prefer JSON over raw transcript |
| 8.7 | Mic track not released on leave | 🟡 Medium | Low | `getTracks().stop()` in `leaveRoom` |
| 8.8 | Partner audio queue not cleared | 🟡 Medium | Low | Clear queue in `room-ended` handler |
| 8.9 | `webkitAudioContext` ignores sampleRate | 🟡 Medium | Medium | Post-construct rate check + resample |
