# Dead Code & Firebase Removal Guide

This file catalogues every Firebase reference in the repository, every file that is unreachable (never imported or routed to), and other redundant/dead code. Each entry includes the exact file path, the relevant lines, the reason it is safe to remove, and the suggested clean-up action.

---

## 1. Firebase — Files & Code That Can Be Removed

Firebase Firestore is described as "optional" and used only for the `/session` and `/progress` REST endpoints. The frontend never calls those endpoints directly from the main application flow (only `src/sections/Trainer.tsx` calls `saveSession`, and `src/sections/Progress.tsx` calls `getProgress`, but both fall back gracefully when the backend is unavailable). In practice the project runs fully without Firebase. Every reference below can be deleted without breaking any core feature.

---

### 1.1 `backend/firebaseAdmin.ts` — entire file
**Lines:** 1–37 (entire file)  
**What it does:** Initialises Firebase Admin SDK with a service-account JSON and exports either a real `admin.firestore()` instance or a no-op `mockDb` object.  
**Why it is safe to remove:** The `mockDb` object proves the app already runs without a real Firestore connection. Removing this file and the `firebase-admin` npm dependency saves ~30 MB from the production Docker image.  
**Action:** Delete the file. Remove `"firebase-admin": "^13.7.0"` from `backend/package.json` and run `npm install` to regenerate the lock file.

---

### 1.2 `backend/routes/progress.ts` — entire file
**Lines:** 1–87 (entire file)  
**What it does:** Exposes `POST /session` and `GET /progress` REST endpoints that write/read Firestore via the `db` import from `firebaseAdmin.ts`.  
**Why it is safe to remove:** Progress state is maintained entirely in the Zustand store (`src/store/useStore.ts`). The `ProgressDashboard`, `Sessions`, and all chart components read from `useStore().progressStats` and `useStore().sessions`, not from these REST endpoints. The `saveSession` call in `Trainer.tsx` silently ignores errors, so removing the route causes no visible change.  
**Action:** Delete the file. Remove the `import progressRoute` line and the `app.use('/', progressRoute)` line from `backend/server.ts`.

---

### 1.3 `backend/server.ts` — two lines referencing `progressRoute`
**File:** `backend/server.ts`  
**Lines:**
```ts
import progressRoute from './routes/progress.ts'; // line ~8
app.use('/', progressRoute);                       // line ~37
```
**Action:** Delete both lines after removing `progress.ts`.

---

### 1.4 `src/services/progressService.ts` — entire file
**Lines:** 1–44 (entire file)  
**What it does:** Contains `saveSession()` and `getProgress()` which call the now-removed `/session` and `/progress` REST endpoints.  
**Why it is safe to remove:** `saveSession` is only called from `src/sections/Trainer.tsx` (which is itself unused — see section 2.4 below). `getProgress` is only called from `src/sections/Progress.tsx`, a landing-page section that already has hardcoded fallback values (`pScore = 92`, `fScore = 88`, etc.) and shows those fallbacks when the API is unavailable.  
**Action:** Delete the file. Remove the two import lines in `Trainer.tsx` and `Progress.tsx`.

---

### 1.5 `backend/.env.example` — Firebase block (lines 10–25)
**Lines:** 10–25 — the entire `# ── Firebase Admin SDK` section  
**What it does:** Documents `FIREBASE_SERVICE_ACCOUNT` env var.  
**Action:** Remove the block after deleting the Firebase code. Keep all other env var documentation.

---

### 1.6 `README.md` — Firebase references
The README mentions Firebase in multiple places:
- Line 28: ASCII architecture diagram — `──REST──► … /session / /progress ──► Firebase`
- Line 47: "*(Optional)* A Firebase project for persistent progress tracking"
- Line 79: "Firebase for persistent progress tracking."
- Line 113: `FIREBASE_SERVICE_ACCOUNT` env var table row
- Line 147: `├── firebaseAdmin.ts    # Firebase Admin SDK initialisation`

**Action:** Remove or replace all of the above after the Firebase code is deleted.

---

### 1.7 `ARCHITECTURE.md` — Firebase references
The architecture document (added in this PR) still mentions Firebase:
- Table row: `| **Persistence** | Firebase Firestore (optional) | User sessions, accuracy scores, streaks |`
- Mermaid diagram node: `Firebase[("Firebase Firestore\n(progress & sessions)")]` and the edge `HTTP <--> Firebase`
- Env var table row: `FIREBASE_SERVICE_ACCOUNT`

**Action:** Remove the Firebase row from the technology table, the `Firebase` node and its edge from the Mermaid diagram, and the env var row from the deployment section.

---

## 2. Unreachable / Dead Pages and Sections

### 2.1 `src/pages/Analytics.tsx` — entire file (dead page)
**Lines:** 1–162 (entire file)  
**What it does:** Renders a "Speech Analytics" page with `BarChart` and `LineChart` components from Recharts, reading from `useStore()`.  
**Why it is dead:** It is never imported in `App.tsx`. The route `/analytics` is mapped to `ProgressDashboard`, not to this component. The file is completely unreachable.  
**Action:** Delete the file. No import or route changes are needed because none exist.

---

### 2.2 `src/sections/Accessibility.tsx` — entire file (dead section)
**Lines:** entire file  
**What it does:** Renders an "Accessibility" marketing section.  
**Why it is dead:** It is never imported in any page or layout file. Searching all pages and layouts finds zero references.  
**Action:** Delete the file.

---

### 2.3 `src/sections/ChatPractice.tsx` — entire file (dead section)
**Lines:** entire file  
**What it does:** Renders a "Chat Practice" section.  
**Why it is dead:** Never imported anywhere. Zero references across pages and layouts.  
**Action:** Delete the file.

---

### 2.4 `src/sections/Trainer.tsx` — entire file (dead section)
**Lines:** entire file  
**What it does:** Renders an interactive pronunciation trainer with `ScriptProcessorNode` audio capture, Gemini Live integration via `geminiLiveService`, and calls `saveSession` from `progressService`.  
**Why it is dead:** Never imported anywhere. Zero references across pages and layouts. Its only import, `progressService.saveSession`, is the sole consumer of the Firebase-backed `/session` endpoint.  
**Action:** Delete the file. This also eliminates the last call-site of `progressService.saveSession`, making `progressService.ts` fully removable (see 1.4).

---

### 2.5 `src/sections/PracticeDemo.tsx` — entire file (dead section)
**Lines:** entire file  
**What it does:** Renders a demo section showing a practice UI mockup.  
**Why it is dead:** Never imported anywhere. Zero references across pages and layouts.  
**Action:** Delete the file.

---

### 2.6 `src/sections/Reader.tsx` — entire file (dead section)
**Lines:** entire file  
**What it does:** Renders a "Reader" component, likely an older prototype of the read-along feature.  
**Why it is dead:** Never imported anywhere. Zero references across pages and layouts. The production read-along feature lives in `ReadAlongMode.tsx` and `ReadingViewer.tsx`.  
**Action:** Delete the file.

---

## 3. Leftover Test / Scratch Files

### 3.1 `backend/test_genai.js`
**Lines:** 1–3  
```js
const { GoogleGenAI } = require('@google/genai');
const ai = new GoogleGenAI({ apiKey: "foo" });
console.log(Object.keys(ai.live));
```
**What it does:** A one-off script used during development to inspect the Gemini SDK's `live` API surface.  
**Why it is dead:** Never required or executed by the application. Contains a hardcoded fake API key string.  
**Action:** Delete the file.

---

### 3.2 `backend/test_message.js`
**Lines:** 1–3  
```js
import { GoogleGenAI } from '@google/genai';
console.log('Testing...');
```
**What it does:** A throwaway test script with only a `console.log` call.  
**Why it is dead:** Never imported or executed by the application.  
**Action:** Delete the file.

---

## 4. Redundant / Duplicated Code

### 4.1 `src/sections/Progress.tsx` — hardcoded fallback values mask real data
**File:** `src/sections/Progress.tsx`, lines ~14–17  
```ts
const pScore = progress?.pronunciationScore || 92;
const fScore  = progress?.fluencyScore      || 88;
const streak  = progress?.streak            || 14;
const wordsPracticed = progress?.wordsPracticed || '1.2k';
```
The section displays fake scores (92, 88, 14 days, "1.2k") when the API call returns `null`. Because the Firebase backend is optional and usually absent, users always see the fake numbers. This gives a false impression of activity.  
**Action:** Replace the hardcoded fallbacks with `0` or `'—'` once the Firebase integration is removed, so the section honestly reflects "no data yet."

---

### 4.2 `backend/server.ts` — `allowedOrigins` is populated but never used for REST CORS
**File:** `backend/server.ts`, lines ~15–23  
```ts
const allowedOrigins = new Set(/* reads CORS_ORIGINS env var */);
app.use(cors({ origin: true, credentials: true })); // ← ignores allowedOrigins
```
The `allowedOrigins` set is constructed and passed to `setupConversationRoomServer`, but the REST layer uses `cors({ origin: true })` which accepts every origin. The variable is redundant for the purpose of protecting REST routes.  
**Action:** Replace `origin: true` with `origin: Array.from(allowedOrigins)` to actually enforce the allowlist (this also fixes security issue 5.1 in `FLAWS_AND_EDGE_CASES.md`).

---

### 4.3 `App.tsx` — `/analytics` route duplicates `/progress`
**File:** `src/App.tsx`, lines ~32–33  
```tsx
<Route path="progress"   element={<ProtectedRoute><ProgressDashboard /></ProtectedRoute>} />
<Route path="analytics"  element={<ProtectedRoute><ProgressDashboard /></ProtectedRoute>} />
```
Both routes render the identical `ProgressDashboard` component. The `/analytics` route was presumably created for `Analytics.tsx` but was never wired to it.  
**Action:** Remove the `analytics` route (or point it to `Analytics.tsx` if that page is revived).

---

## 5. Summary — Files Safe to Delete

| File | Reason |
|------|--------|
| `backend/firebaseAdmin.ts` | Firebase not used in production |
| `backend/routes/progress.ts` | Firebase-backed endpoints, not consumed by frontend |
| `src/services/progressService.ts` | Only consumers are dead/removed files |
| `backend/test_genai.js` | One-off dev scratch file |
| `backend/test_message.js` | One-off dev scratch file |
| `src/pages/Analytics.tsx` | Never routed to; dead page |
| `src/sections/Accessibility.tsx` | Never mounted; dead section |
| `src/sections/ChatPractice.tsx` | Never mounted; dead section |
| `src/sections/Trainer.tsx` | Never mounted; dead section |
| `src/sections/PracticeDemo.tsx` | Never mounted; dead section |
| `src/sections/Reader.tsx` | Never mounted; dead section |

**npm package to remove:** `firebase-admin` from `backend/package.json`
