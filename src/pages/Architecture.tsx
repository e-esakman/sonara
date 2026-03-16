import { useState } from 'react';
import { Icon } from '@iconify/react';

// ─── shared primitives ────────────────────────────────────────────────────────

type LayerColor = 'indigo' | 'violet' | 'emerald' | 'amber' | 'rose' | 'sky' | 'teal';

interface NodeProps {
  icon: string;
  label: string;
  sub?: string;
  color: LayerColor;
  badge?: string;
}

const COLOR: Record<LayerColor, { bg: string; ring: string; icon: string; badge: string; dot: string }> = {
  indigo: { bg: 'bg-indigo-50',    ring: 'ring-indigo-200',   icon: 'text-indigo-600',   badge: 'bg-indigo-600',    dot: 'bg-indigo-500' },
  violet: { bg: 'bg-violet-50',    ring: 'ring-violet-200',   icon: 'text-violet-600',   badge: 'bg-violet-600',    dot: 'bg-violet-500' },
  emerald:{ bg: 'bg-emerald-50',   ring: 'ring-emerald-200',  icon: 'text-emerald-600',  badge: 'bg-emerald-600',   dot: 'bg-emerald-500' },
  amber:  { bg: 'bg-amber-50',     ring: 'ring-amber-200',    icon: 'text-amber-600',    badge: 'bg-amber-600',     dot: 'bg-amber-500' },
  rose:   { bg: 'bg-rose-50',      ring: 'ring-rose-200',     icon: 'text-rose-600',     badge: 'bg-rose-600',      dot: 'bg-rose-500' },
  sky:    { bg: 'bg-sky-50',       ring: 'ring-sky-200',      icon: 'text-sky-600',      badge: 'bg-sky-600',       dot: 'bg-sky-500' },
  teal:   { bg: 'bg-teal-50',      ring: 'ring-teal-200',     icon: 'text-teal-600',     badge: 'bg-teal-600',      dot: 'bg-teal-500' },
};

function Node({ icon, label, sub, color, badge }: NodeProps) {
  const c = COLOR[color];
  return (
    <div className={`relative flex flex-col items-center gap-2 rounded-2xl px-5 py-4 ring-1 ${c.bg} ${c.ring} shadow-sm min-w-[140px] max-w-[180px]`}>
      {badge && (
        <span className={`absolute -top-2.5 right-2 text-[10px] font-bold text-white px-2 py-0.5 rounded-full tracking-wide ${c.badge}`}>
          {badge}
        </span>
      )}
      <Icon icon={icon} width={28} className={c.icon} />
      <div className="text-center">
        <p className="text-sm font-semibold text-neutral-800 leading-tight whitespace-pre-line">{label}</p>
        {sub && <p className="text-[11px] text-neutral-500 mt-0.5 leading-tight whitespace-pre-line">{sub}</p>}
      </div>
    </div>
  );
}

// A labelled horizontal arrow between two nodes
function Arrow({ label, bidirectional = false }: { label?: string; bidirectional?: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center mx-1 min-w-[56px]">
      {label && <span className="text-[10px] font-medium text-neutral-400 mb-1 text-center leading-tight whitespace-pre-line">{label}</span>}
      <div className="flex items-center gap-0">
        {bidirectional && <Icon icon="solar:arrow-left-linear" width={14} className="text-neutral-400" />}
        <div className="h-px w-10 bg-neutral-300" />
        <Icon icon="solar:arrow-right-linear" width={14} className="text-neutral-400" />
      </div>
    </div>
  );
}

// A labelled vertical arrow (downward)
function VertArrow({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center my-1">
      {label && <span className="text-[10px] font-medium text-neutral-400 mb-0.5 text-center">{label}</span>}
      <Icon icon="solar:arrow-down-linear" width={16} className="text-neutral-400" />
    </div>
  );
}

// Row of nodes connected by arrows
function FlowRow({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center gap-0 justify-center">{children}</div>;
}

// A labelled section lane (Frontend / Backend / Gemini)
function Lane({ label, color, children }: { label: string; color: string; children: React.ReactNode }) {
  return (
    <div className={`relative rounded-2xl border ${color} p-4 flex flex-col gap-3`}>
      <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 absolute -top-2.5 left-4 bg-white px-2">{label}</span>
      {children}
    </div>
  );
}

// Payload / message badge line
function Payload({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 text-xs">
      <span className="font-semibold text-neutral-600 shrink-0">{label}:</span>
      <code className="text-neutral-500 font-mono break-all">{value}</code>
    </div>
  );
}

// ─── Feature 1: Rooms ─────────────────────────────────────────────────────────

function RoomDiagram() {
  return (
    <div className="flex flex-col gap-6">
      {/* Overview banner */}
      <div className="rounded-xl bg-indigo-50 border border-indigo-100 px-5 py-3 text-sm text-indigo-700 flex items-start gap-3">
        <Icon icon="solar:info-circle-linear" width={18} className="mt-0.5 shrink-0" />
        <span>
          Two users join a shared room. Each speaker's microphone audio is sent via <strong>Socket.IO</strong> to the backend, which maintains two independent <strong>Gemini Live WebSocket</strong> sessions — one per speaker — for real-time pronunciation &amp; grammar coaching.
        </span>
      </div>

      {/* Layer diagram */}
      <div className="grid grid-cols-1 gap-4">

        {/* FRONTEND */}
        <Lane label="Frontend  (Browser)" color="border-indigo-200">
          <FlowRow>
            <Node icon="solar:user-speak-rounded-linear" label="User A" sub="Rooms.tsx" color="indigo" />
            <Arrow label="emit audio-stream\n(PCM + WebM)" />
            <Node icon="solar:socket-linear" label="Socket.IO Client" sub="liveConversationRoom.ts" color="indigo" badge="Client" />
            <Arrow label="receive partner-audio\n+ ai-feedback" bidirectional />
            <Node icon="solar:user-speak-rounded-linear" label="User B" sub="Rooms.tsx" color="indigo" />
          </FlowRow>
          <div className="grid grid-cols-2 gap-3 mt-1 text-xs text-neutral-500">
            <div className="rounded-xl bg-indigo-50/60 border border-indigo-100 p-3">
              <p className="font-semibold text-neutral-700 mb-1">Audio capture (User A)</p>
              <Payload label="format" value="16 kHz PCM (Int16 base64)" />
              <Payload label="chunk" value="256 ms via ScriptProcessorNode" />
              <Payload label="relay" value="WebM audio → partner playback" />
            </div>
            <div className="rounded-xl bg-indigo-50/60 border border-indigo-100 p-3">
              <p className="font-semibold text-neutral-700 mb-1">Events emitted</p>
              <Payload label="audio-stream" value="{pcmData, mediaData}" />
              <Payload label="audio-stream-end" value="turn complete signal" />
              <Payload label="coach-question" value="optional follow-up" />
            </div>
          </div>
        </Lane>

        <VertArrow label="WebSocket / Socket.IO  (TCP)" />

        {/* BACKEND */}
        <Lane label="Backend  (Node.js / Express + Socket.IO)" color="border-violet-200">
          <FlowRow>
            <Node icon="solar:server-square-update-linear" label="liveConversationServer" sub=".ts — RoomState" color="violet" badge="Socket.IO" />
            <Arrow label="sendAudio(pcmData)" />
            <Node icon="solar:shield-keyhole-minimalistic-linear" label="SpeakerSession A" sub="Gemini WS wrapper" color="violet" />
            <div className="mx-4 text-neutral-300 font-light">⫸</div>
            <Node icon="solar:shield-keyhole-minimalistic-linear" label="SpeakerSession B" sub="Gemini WS wrapper" color="violet" />
          </FlowRow>
          <div className="grid grid-cols-2 gap-3 mt-1 text-xs text-neutral-500">
            <div className="rounded-xl bg-violet-50/60 border border-violet-100 p-3">
              <p className="font-semibold text-neutral-700 mb-1">Per-turn analysis (audio-stream-end)</p>
              <Payload label="step 1" value="PCM chunks → WAV file" />
              <Payload label="step 2" value="POST to Gemini Flash REST" />
              <Payload label="step 3" value="emit ai-feedback {rows[]}" />
            </div>
            <div className="rounded-xl bg-violet-50/60 border border-violet-100 p-3">
              <p className="font-semibold text-neutral-700 mb-1">Audio relay</p>
              <Payload label="partner-audio" value="WebM base64 → User B" />
              <Payload label="ai-feedback" value="JSON coaching → User A" />
              <Payload label="ai-tip" value="interrupt tip if mistake" />
            </div>
          </div>
        </Lane>

        <VertArrow label="Gemini Live WebSocket  (secure wss)" />

        {/* GEMINI */}
        <Lane label="Gemini API  (Google Cloud)" color="border-emerald-200">
          <FlowRow>
            <Node icon="solar:stars-minimalistic-linear" label="Gemini Live" sub="gemini-2.0-flash-live-001" color="emerald" badge="Live WS" />
            <Arrow label="JSON coaching\n{transcript, correction,\npronunciationTip}" bidirectional />
            <Node icon="solar:cpu-bolt-linear" label="Real-time\nTranscription" sub="INPUT: audio/pcm 16kHz" color="emerald" />
            <Arrow label="Turn analysis\n(REST)" bidirectional />
            <Node icon="solar:stars-linear" label="Gemini Flash" sub="gemini-2.5-flash" color="emerald" badge="REST" />
          </FlowRow>
          <div className="rounded-xl bg-emerald-50/60 border border-emerald-100 p-3 mt-1 text-xs text-neutral-500">
            <p className="font-semibold text-neutral-700 mb-1">Coaching JSON response format</p>
            <code className="font-mono text-emerald-700 block">
              {'{"transcript":"…","correction":"…","pronunciationTip":"…","interruptTip":"…","rows":[]}'}
            </code>
          </div>
        </Lane>
      </div>
    </div>
  );
}

// ─── Feature 2: Grammar ───────────────────────────────────────────────────────

function GrammarDiagram() {
  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl bg-amber-50 border border-amber-100 px-5 py-3 text-sm text-amber-700 flex items-start gap-3">
        <Icon icon="solar:info-circle-linear" width={18} className="mt-0.5 shrink-0" />
        <span>
          The user submits a sentence via a simple <strong>REST POST</strong> call. The backend calls Gemini Flash's JSON-mode API to evaluate grammar, complexity, IELTS band, and return a structured lesson. No real-time audio — entirely text-based.
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4">

        {/* FRONTEND */}
        <Lane label="Frontend  (Browser)" color="border-amber-200">
          <FlowRow>
            <Node icon="solar:text-field-focus-linear" label="Grammar.tsx" sub="Text input" color="amber" />
            <Arrow label="POST /grammar\n{text}" />
            <Node icon="solar:book-2-linear" label="LessonPlayer" sub="component" color="amber" />
          </FlowRow>
          <div className="grid grid-cols-2 gap-3 mt-1 text-xs text-neutral-500">
            <div className="rounded-xl bg-amber-50/60 border border-amber-100 p-3">
              <p className="font-semibold text-neutral-700 mb-1">User actions</p>
              <Payload label="input" value="Custom sentence or topic card" />
              <Payload label="action" value="Click 'Analyze'" />
              <Payload label="display" value="buildSentenceDiff() highlights" />
            </div>
            <div className="rounded-xl bg-amber-50/60 border border-amber-100 p-3">
              <p className="font-semibold text-neutral-700 mb-1">Rendered output</p>
              <Payload label="diff" value="original vs corrected sentence" />
              <Payload label="structureChart" value="SVO table" />
              <Payload label="bandEstimate" value="IELTS Band 5-6 etc." />
            </div>
          </div>
        </Lane>

        <VertArrow label="HTTP REST  (fetch)" />

        {/* BACKEND */}
        <Lane label="Backend  (Express REST)" color="border-rose-200">
          <FlowRow>
            <Node icon="solar:route-linear" label="POST /grammar" sub="routes/grammar.ts" color="rose" badge="Route" />
            <Arrow label="checkGrammar(text)" />
            <Node icon="solar:cpu-bolt-linear" label="grammarAgent.ts" sub="Gemini REST caller" color="rose" badge="Agent" />
          </FlowRow>
          <div className="rounded-xl bg-rose-50/60 border border-rose-100 p-3 mt-1 text-xs text-neutral-500">
            <p className="font-semibold text-neutral-700 mb-1">Gemini prompt config</p>
            <Payload label="model" value="gemini-2.5-flash" />
            <Payload label="temp" value="0.3" />
            <Payload label="mime" value="application/json (structured output)" />
            <Payload label="system" value="English grammar tutor for Sonara…" />
          </div>
        </Lane>

        <VertArrow label="HTTPS REST  (google-genai SDK)" />

        {/* GEMINI */}
        <Lane label="Gemini API  (Google Cloud)" color="border-teal-200">
          <FlowRow>
            <Node icon="solar:stars-linear" label="Gemini 2.5 Flash" sub="REST / JSON-mode" color="teal" badge="REST" />
            <Arrow label="GrammarResult JSON" bidirectional />
            <Node icon="solar:document-text-linear" label="Structured JSON\nResponse" sub="correction + lesson" color="teal" />
          </FlowRow>
          <div className="rounded-xl bg-teal-50/60 border border-teal-100 p-3 mt-1 text-xs text-neutral-500">
            <p className="font-semibold text-neutral-700 mb-1">GrammarResult fields</p>
            <div className="grid grid-cols-2 gap-x-4">
              <Payload label="correction" value="corrected sentence" />
              <Payload label="rule" value="grammar rule applied" />
              <Payload label="lessonSteps" value="3-5 teaching steps" />
              <Payload label="structureChart" value="SVO table rows[]" />
              <Payload label="bandEstimate" value="IELTS Band N-N" />
              <Payload label="tips" value="improvement tips[]" />
            </div>
          </div>
        </Lane>
      </div>
    </div>
  );
}

// ─── Feature 3: Live AI Coach ─────────────────────────────────────────────────

function LiveCoachDiagram() {
  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl bg-sky-50 border border-sky-100 px-5 py-3 text-sm text-sky-700 flex items-start gap-3">
        <Icon icon="solar:info-circle-linear" width={18} className="mt-0.5 shrink-0" />
        <span>
          Solo live coaching: the frontend opens a native <strong>WebSocket</strong> to <code>/live-ws</code> on the backend. The backend proxies audio chunks directly into a <strong>Gemini Live</strong> session and streams audio + text coaching responses back — the API key never reaches the browser.
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4">

        {/* FRONTEND */}
        <Lane label="Frontend  (Browser)" color="border-sky-200">
          <FlowRow>
            <Node icon="solar:microphone-3-linear" label="FreeSpeakMode" sub="src/sections/" color="sky" />
            <Arrow label="sendAudioChunk()\nbase64 PCM" />
            <Node icon="solar:link-round-angle-linear" label="GeminiLiveService" sub="src/services/ — WS client" color="sky" badge="WebSocket" />
          </FlowRow>
          <div className="grid grid-cols-2 gap-3 mt-1 text-xs text-neutral-500">
            <div className="rounded-xl bg-sky-50/60 border border-sky-100 p-3">
              <p className="font-semibold text-neutral-700 mb-1">WS messages sent</p>
              <Payload label="type:audio" value='{data: base64PCM, mimeType: "audio/pcm;rate=16000"}' />
              <Payload label="type:audioEnd" value="end of turn signal" />
            </div>
            <div className="rounded-xl bg-sky-50/60 border border-sky-100 p-3">
              <p className="font-semibold text-neutral-700 mb-1">WS messages received</p>
              <Payload label="type:message" value="{serverContent.modelTurn.parts[]}" />
              <Payload label="audio part" value="base64 → AudioContext playback" />
              <Payload label="text part" value="sanitized coaching transcript" />
            </div>
          </div>
        </Lane>

        <VertArrow label="WebSocket  ws://backend/live-ws" />

        {/* BACKEND */}
        <Lane label="Backend  (Node.js ws library)" color="border-violet-200">
          <FlowRow>
            <Node icon="solar:server-minimalistic-linear" label="liveProxy.ts" sub="setupLiveProxy()" color="violet" badge="WS Proxy" />
            <Arrow label="sendRealtimeInput()\n{audio: data}" />
            <Node icon="solar:shield-keyhole-minimalistic-linear" label="Gemini Live\nSession" sub="ai.live.connect()" color="violet" />
          </FlowRow>
          <div className="rounded-xl bg-violet-50/60 border border-violet-100 p-3 mt-1 text-xs text-neutral-500">
            <p className="font-semibold text-neutral-700 mb-1">Proxy responsibilities</p>
            <Payload label="security" value="API key lives server-side only" />
            <Payload label="upgrade" value="HTTP → WebSocket at /live-ws" />
            <Payload label="forward" value="client audio → Gemini Live" />
            <Payload label="relay" value="Gemini response → client WS" />
          </div>
        </Lane>

        <VertArrow label="Gemini Live WebSocket  (wss)" />

        {/* GEMINI */}
        <Lane label="Gemini API  (Google Cloud)" color="border-emerald-200">
          <FlowRow>
            <Node icon="solar:stars-minimalistic-linear" label="Gemini Live" sub="gemini-2.5-flash-native-audio" color="emerald" badge="Live WS" />
            <Arrow label="audio + text\ncoaching" bidirectional />
            <Node icon="solar:soundwave-linear" label="Audio Response" sub="responseModalities: AUDIO" color="emerald" />
          </FlowRow>
          <div className="rounded-xl bg-emerald-50/60 border border-emerald-100 p-3 mt-1 text-xs text-neutral-500">
            <p className="font-semibold text-neutral-700 mb-1">System instruction</p>
            <Payload label="persona" value="Sonara Live Coach — supportive English tutor" />
            <Payload label="input" value="16 kHz PCM real-time audio stream" />
            <Payload label="output" value="AUDIO (spoken feedback) + text transcript" />
          </div>
        </Lane>
      </div>
    </div>
  );
}

// ─── Combined summary diagram ─────────────────────────────────────────────────

function SummaryDiagram() {
  const features = [
    {
      name: 'Room',
      protocol: 'Socket.IO',
      frontendFile: 'Rooms.tsx\nliveConversationRoom.ts',
      backendFile: 'liveConversationServer.ts',
      geminiModel: 'Gemini 2.0 Flash Live\n+ 2.5 Flash (turn)',
      colorDot: 'bg-indigo-500',
      colorBg: 'bg-indigo-50',
      colorBorder: 'border-indigo-200',
    },
    {
      name: 'Grammar',
      protocol: 'HTTP REST',
      frontendFile: 'Grammar.tsx',
      backendFile: 'routes/grammar.ts\nagents/grammarAgent.ts',
      geminiModel: 'Gemini 2.5 Flash\n(JSON mode)',
      colorDot: 'bg-amber-500',
      colorBg: 'bg-amber-50',
      colorBorder: 'border-amber-200',
    },
    {
      name: 'Live AI Coach',
      protocol: 'WebSocket',
      frontendFile: 'FreeSpeakMode.tsx\ngeminiLiveService.ts',
      backendFile: 'liveProxy.ts',
      geminiModel: 'Gemini 2.5 Flash\nNative Audio (Live)',
      colorDot: 'bg-sky-500',
      colorBg: 'bg-sky-50',
      colorBorder: 'border-sky-200',
    },
  ];

  const cols = ['Feature', 'Protocol', 'Frontend', 'Backend', 'Gemini Model'];

  return (
    <div className="overflow-x-auto rounded-2xl border border-neutral-200 shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200 bg-neutral-50">
            {cols.map((c) => (
              <th key={c} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-neutral-500">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {features.map((f) => (
            <tr key={f.name} className={`border-b border-neutral-100 last:border-0 ${f.colorBg}`}>
              <td className="px-4 py-3 font-semibold text-neutral-800 flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${f.colorDot}`} />
                {f.name}
              </td>
              <td className="px-4 py-3">
                <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full border ${f.colorBorder} text-neutral-700`}>
                  {f.protocol}
                </span>
              </td>
              <td className="px-4 py-3 font-mono text-xs text-neutral-600 whitespace-pre-line">{f.frontendFile}</td>
              <td className="px-4 py-3 font-mono text-xs text-neutral-600 whitespace-pre-line">{f.backendFile}</td>
              <td className="px-4 py-3 font-mono text-xs text-neutral-600 whitespace-pre-line">{f.geminiModel}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'summary',    label: 'Summary',        icon: 'solar:widget-2-linear' },
  { id: 'room',       label: 'Room',            icon: 'solar:users-group-two-rounded-linear' },
  { id: 'grammar',    label: 'Grammar',         icon: 'solar:book-2-linear' },
  { id: 'livecoach',  label: 'Live AI Coach',   icon: 'solar:microphone-3-linear' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function Architecture() {
  const [active, setActive] = useState<TabId>('summary');

  return (
    <div className="min-h-screen bg-neutral-50 pt-28 pb-20 px-4">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 bg-white border border-neutral-200 rounded-full px-4 py-1.5 text-xs font-semibold text-neutral-500 uppercase tracking-widest mb-4 shadow-sm">
            <Icon icon="solar:graph-up-linear" width={14} />
            Architecture
          </div>
          <h1 className="text-3xl sm:text-4xl font-dm-sans font-normal text-neutral-900 mb-3">
            How Sonara connects to Gemini
          </h1>
          <p className="text-neutral-500 max-w-xl mx-auto text-base">
            Visual data-flow diagrams for every feature — from the browser microphone all the way to the Gemini API and back.
          </p>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 bg-white border border-neutral-200 rounded-2xl p-1 shadow-sm mb-8 flex-wrap">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActive(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all flex-1 justify-center ${
                active === tab.id
                  ? 'bg-neutral-900 text-white shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-800 hover:bg-neutral-50'
              }`}
            >
              <Icon icon={tab.icon} width={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-6">
          {active === 'summary'   && (
            <div className="flex flex-col gap-6">
              <div>
                <h2 className="text-lg font-semibold text-neutral-800 mb-1">Feature comparison at a glance</h2>
                <p className="text-sm text-neutral-500 mb-4">Each feature uses a different protocol to talk to Gemini.</p>
                <SummaryDiagram />
              </div>

              <div className="rounded-xl bg-neutral-50 border border-neutral-200 p-5">
                <h3 className="text-sm font-semibold text-neutral-700 mb-3 flex items-center gap-2">
                  <Icon icon="solar:shield-keyhole-minimalistic-linear" width={16} className="text-emerald-600" />
                  Security invariant
                </h3>
                <p className="text-sm text-neutral-600">
                  The <strong>Gemini API key</strong> is stored exclusively as a server-side environment variable (<code>GEMINI_API_KEY</code>). The frontend never receives or sees it. All three features proxy through the backend — REST for Grammar, Socket.IO for Rooms, and a WebSocket upgrade at <code>/live-ws</code> for the Live AI Coach.
                </p>
              </div>
            </div>
          )}
          {active === 'room'      && <RoomDiagram />}
          {active === 'grammar'   && <GrammarDiagram />}
          {active === 'livecoach' && <LiveCoachDiagram />}
        </div>

        {/* Key files legend */}
        <div className="mt-8 grid sm:grid-cols-3 gap-4">
          {[
            {
              title: 'Room',
              color: 'indigo',
              files: [
                'src/pages/Rooms.tsx',
                'src/services/liveConversationRoom.ts',
                'backend/rooms/liveConversationServer.ts',
              ],
            },
            {
              title: 'Grammar',
              color: 'amber',
              files: [
                'src/pages/Grammar.tsx',
                'backend/routes/grammar.ts',
                'backend/agents/grammarAgent.ts',
              ],
            },
            {
              title: 'Live AI Coach',
              color: 'sky',
              files: [
                'src/sections/FreeSpeakMode.tsx',
                'src/services/geminiLiveService.ts',
                'backend/liveProxy.ts',
              ],
            },
          ].map((group) => {
            const c = COLOR[group.color as LayerColor];
            return (
              <div key={group.title} className={`rounded-2xl p-4 border ${c.ring} ${c.bg}`}>
                <p className={`text-xs font-bold uppercase tracking-widest mb-3 ${c.icon}`}>{group.title}</p>
                <ul className="flex flex-col gap-1.5">
                  {group.files.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs text-neutral-600">
                      <span className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${c.dot}`} />
                      <code className="break-all">{f}</code>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
