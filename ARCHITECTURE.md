# Sonara architecture

## Frontend

React and Vite provide three main routes: `/`, `/practice`, and `/rooms`. `/login` provides a local browser profile for solo practice; it is not server authentication. Accessibility and voice preferences are stored locally. Reading, grammar lessons, dashboards, and progress tracking have been removed.

`FreeSpeakMode` owns the solo microphone stream and AI playback. The speech-recognition hook supplies optional browser captions without opening a second recording stream or storing audio files. The Gemini WebSocket service connects through the backend's `/live-ws` endpoint, so API credentials stay on the server.

`Rooms` captures mono 16 kHz PCM, relays it through Socket.IO, and schedules incoming PCM frames through Web Audio. Both participants must enable audio with a user gesture. A pause or capture limit ends an analysis turn without ending the call.

## Backend

One Node.js HTTP server hosts Express, the solo WebSocket proxy, and Socket.IO rooms.

| Entry point | Purpose |
| --- | --- |
| `GET /` | Health response |
| `/live-ws` WebSocket | Solo audio conversation with Gemini Live |
| `/socket.io/` Socket.IO | Invite/join/rejoin/leave, audio relay, transcripts, private coaching |
| `POST /analyze` | Supplemental analysis of browser-recognized text in solo practice |

The room server holds two participants per room, bounded PCM buffers, reconnect tokens, and the latest private feedback. A completed audio turn is wrapped as WAV and sent to the configured audio-capable analysis model. Results are sent only to the relevant speaker; transcripts are shared with both. Calls can relay audio even when coaching is unavailable. Only one analysis request per speaker runs at a time; extra completed turns are skipped while it is busy.

The solo `/analyze` pipeline compares recognized text and generates supplemental feedback. Text recognition alone cannot establish acoustic pronunciation accuracy; audible coaching comes from Gemini Live's audio input. Room feedback is generated from captured audio.

## Configuration and deployment

Frontend variables: `VITE_BACKEND_URL` and optional `VITE_BACKEND_WS_URL`.

Backend variables: `PORT`, `CORS_ORIGINS`, `GEMINI_API_KEY`, `GEMINI_LIVE_MODEL`, and `GEMINI_ANALYSIS_MODEL`. Optional room key pools are supported by `GEMINI_ROOM_KEYS` or `GEMINI_API_KEYS`; `GEMINI_LIVEVOICE_KEY` can supply a separate voice key.

Configure HTTPS and WebSocket upgrades. Rooms exist in one process and disappear on restart; multi-instance deployment needs sticky routing. There is no Firebase dependency or remote progress storage.
