# Sonara — AI Pronunciation Coach

Practice English through conversations with an AI coach or a friend.

- **Talk to AI:** speak with a live audio coach and review the conversation.
- **Practice together:** invite one friend to a voice room. Each speaker receives private pronunciation feedback during pauses, with a shared transcript.
- **Display preferences:** comfort and focus modes, plus English accent preferences.

## Local setup

Requires Node.js 22.18+ and a Gemini API key.

```sh
npm ci
npm ci --prefix backend
cp .env.example .env
cp backend/.env.example backend/.env
```

Set `GEMINI_API_KEY` in `backend/.env`. Start the backend from its directory so dotenv reads that file:

```sh
cd backend
npm run dev
```

In another terminal, run `npm run dev` from the repository root. Open http://localhost:5173. The backend uses port 8080.

For friend calls, share the room link and tap the microphone on both devices. Use headphones. Devices outside localhost require HTTPS and a reachable backend; configure `VITE_BACKEND_URL` and `CORS_ORIGINS` for the deployed addresses.

## Validation

```sh
npm run build
npm run typecheck:backend
npm run lint
npm run test:rooms
```

The room integration test uses a local server and does not require AI credentials. Live AI feedback and physical microphone playback require browser testing with a working Gemini account.

See [architecture](ARCHITECTURE.md) and [voice behavior, deployment, and verification](PRONUNCIATION_FOCUS.md) for details.
