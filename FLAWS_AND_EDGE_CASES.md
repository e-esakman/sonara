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

## Priority Matrix

| ID | Area | Severity | Effort | Recommended Action |
|----|------|----------|--------|--------------------|
| 2.3 | Multi-instance room state | 🔴 Critical | Medium | Redis adapter |
| 5.1 | CORS over-permissive | 🔴 Critical | Low | Fix `cors()` call |
| 5.2 | Unauthenticated rooms | 🔴 Critical | Medium | JWT on handshake |
| 2.1 | Polling-only transport | 🟠 High | Low | Enable WS transport |
| 3.3 | Orphaned invite rooms | 🟠 High | Low | TTL + cleanup |
| 4.4 | Preview model hardcoded | 🟠 High | Low | Env var for model name |
| 1.1 | `ScriptProcessorNode` deprecated | 🟡 Medium | High | AudioWorklet migration |
| 4.2 | Redundant fallback transcription | 🟡 Medium | Low | Gate on Live transcript |
| 6.3 | No error boundary | 🟡 Medium | Low | Add `ErrorBoundary` |
| 7.1 | Cloud Run concurrency | 🟡 Medium | Low | Tune `--concurrency` |
