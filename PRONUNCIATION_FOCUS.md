# Sonara pronunciation-focused revision

The main experience now has two choices: solo AI conversations and two-person practice calls with private pronunciation feedback. Reading, library, grammar, dashboard, and analytics routes are removed from navigation and routing. The retired pages, reading content, demo components, grammar/progress endpoints, and Firebase storage have been deleted. Unused dependencies and legacy recording helpers have also been removed. Accessibility and accent preferences remain available.

## Run locally

Requires Node.js 22.18+ (the room test uses native TypeScript stripping).

1. Run `npm ci` and `npm ci --prefix backend`.
2. Copy `.env.example` to `.env` and `backend/.env.example` to `backend/.env`.
3. Set `GEMINI_API_KEY` in `backend/.env`. Never put API keys in frontend variables.
4. From `backend/`, run `npm run dev`. Run `npm run dev` from the repository root in another terminal.
5. Open http://localhost:5173.

The API runs on port 8080 consistently. `GEMINI_ANALYSIS_MODEL` controls private turn analysis; `GEMINI_LIVE_MODEL` controls solo voice coaching. Defaults and example values follow Google's model catalog: https://aistudio.google.com/docs/models. Override model IDs if your account does not have access.

For deployment, configure `VITE_BACKEND_URL` with the HTTPS backend address and `CORS_ORIGINS` with the exact frontend origin. The reverse proxy must support WebSocket upgrades for `/socket.io/` and `/live-ws`. Use HTTPS for microphone access outside localhost. Rooms are held in one backend process: use a single instance or sticky routing; server restarts end calls.

## Voice behavior

Both friends must tap the microphone to join audio (this unlocks browser audio playback). Use headphones. Invite links let a friend join without the login redirect that previously lost the room query. PCM16 audio is relayed and scheduled through Web Audio, instead of treating MediaRecorder fragments as standalone files. Each speaker's audio is analyzed independently after roughly 0.8 seconds of quiet or 12 seconds of continuous capture. Feedback is private, while transcripts are shared in the room. Coaching audio does not automatically speak over an active microphone; pause it to listen to a pending tip.

Analysis buffers are detached before network requests, so a response cannot erase newly arriving speech. One analysis request per speaker is allowed at a time; extra completed turns are skipped while analysis is busy. Captured audio is bounded. Calls continue when the AI service is unavailable. Reconnecting a participant requires that participant's private reconnect token, rather than just knowing the room ID and role.

## Checks

- `npm run build`
- `npm run typecheck:backend`
- `npm run test:rooms`

The room integration test runs two real Socket.IO clients against a local server. It covers audio relay in both directions, capacity, reconnect authorization, successful reconnect, leave, and expired-room handling. It does not test microphone hardware, browser audio policies, or Gemini responses.

Before release, use two devices with headphones to test an invite, permission denial, joining audio on both sides, full-duplex conversation, mute/unmute, private feedback for each voice, reconnection, and leaving. Also run a solo AI conversation and verify spoken responses and transcript. A Gemini API key and a working backend are required. No live AI or two-device browser verification was performed during this revision.

Run `npm run lint` for repository-wide static checks.
