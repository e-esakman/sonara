import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

// ─── Types ───────────────────────────────────────────────────────
export interface User {
    id: string;
    name: string;
    email: string;
    createdAt: string;
}

export interface PracticeSession {
    sessionId: string;
    userId: string;
    passageId: string;
    expectedText: string;
    spokenTranscript: string;
    pronunciationScore: number;
    fluencyScore: number;
    confidenceScore: number;
    wordsPerMinute: number;
    pauseCount: number;
    incorrectWords: string[];
    accentInfluence?: string;
    audioUrl?: string;
    createdAt: string;
}

export interface ProgressStats {
    avgPronunciation: number;
    avgFluency: number;
    avgConfidence: number;
    totalSessions: number;
    streak: number;
    wordsPracticed: number;
}

// ─── Context ─────────────────────────────────────────────────────
interface StoreContextValue {
    // Auth
    user: User | null;
    login: (email: string, name: string) => void;
    signup: (email: string, name: string) => void;
    logout: () => void;

    // Sessions
    sessions: PracticeSession[];
    addSession: (session: Omit<PracticeSession, 'sessionId' | 'userId' | 'createdAt'>) => void;

    // Derived stats
    progressStats: ProgressStats;

    // Autism Friendly Mode
    autismMode: boolean;
    toggleAutismMode: () => void;

    // Extended Accessibility
    focusMode: boolean;
    toggleFocusMode: () => void;
    gentleFeedback: boolean;
    toggleGentleFeedback: () => void;

    // Accent Training Mode
    accentStyle: 'American' | 'British' | 'Indian';
    setAccentStyle: (accent: 'American' | 'British' | 'Indian') => void;
}

const StoreContext = createContext<StoreContextValue | null>(null);

// ─── Local Storage Helpers ───────────────────────────────────────
const LS_USER_KEY = 'sonara_user';
const LS_SESSIONS_KEY = 'sonara_sessions';
const LS_AUTISM_KEY = 'sonara_autism_mode';
const LS_FOCUS_KEY = 'sonara_focus_mode';
const LS_GENTLE_KEY = 'sonara_gentle_feedback';
const LS_ACCENT_KEY = 'sonara_accent_style';

// Maximum number of sessions kept in localStorage to prevent quota overflow
const MAX_STORED_SESSIONS = 200;

function isValidUser(obj: unknown): obj is User {
    return (
        typeof obj === 'object' && obj !== null &&
        typeof (obj as User).id === 'string' && (obj as User).id.length > 0 &&
        typeof (obj as User).email === 'string' && (obj as User).email.length > 0 &&
        typeof (obj as User).name === 'string' &&
        typeof (obj as User).createdAt === 'string'
    );
}

function isValidSession(obj: unknown): obj is PracticeSession {
    return (
        typeof obj === 'object' && obj !== null &&
        typeof (obj as PracticeSession).sessionId === 'string' &&
        typeof (obj as PracticeSession).passageId === 'string' &&
        typeof (obj as PracticeSession).pronunciationScore === 'number' &&
        typeof (obj as PracticeSession).createdAt === 'string'
    );
}

function loadUser(): User | null {
    try {
        const raw = localStorage.getItem(LS_USER_KEY);
        if (!raw) return null;
        const parsed: unknown = JSON.parse(raw);
        if (isValidUser(parsed)) return parsed;
        localStorage.removeItem(LS_USER_KEY);
        return null;
    } catch { return null; }
}

function loadSessions(): PracticeSession[] {
    try {
        const raw = localStorage.getItem(LS_SESSIONS_KEY);
        if (!raw) return [];
        const parsed: unknown = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed.filter(isValidSession);
    } catch { return []; }
}

function loadAutismMode(): boolean {
    try {
        return localStorage.getItem(LS_AUTISM_KEY) === 'true';
    } catch { return false; }
}

function loadFocusMode(): boolean {
    try {
        return localStorage.getItem(LS_FOCUS_KEY) === 'true';
    } catch { return false; }
}

function loadGentleFeedback(): boolean {
    try {
        return localStorage.getItem(LS_GENTLE_KEY) === 'true';
    } catch { return false; }
}

function loadAccentStyle(): 'American' | 'British' | 'Indian' {
    try {
        const val = localStorage.getItem(LS_ACCENT_KEY);
        if (val === 'American' || val === 'British' || val === 'Indian') return val;
        return 'American';
    } catch { return 'American'; }
}

// ─── Stats calculator ────────────────────────────────────────────
function calcStats(sessions: PracticeSession[]): ProgressStats {
    if (sessions.length === 0) {
        return { avgPronunciation: 0, avgFluency: 0, avgConfidence: 0, totalSessions: 0, streak: 0, wordsPracticed: 0 };
    }

    const avgPronunciation = Math.round(sessions.reduce((a, s) => a + s.pronunciationScore, 0) / sessions.length);
    const avgFluency = Math.round(sessions.reduce((a, s) => a + s.fluencyScore, 0) / sessions.length);
    const avgConfidence = Math.round(sessions.reduce((a, s) => a + s.confidenceScore, 0) / sessions.length);
    const wordsPracticed = sessions.reduce((a, s) => a + s.expectedText.split(' ').length, 0);

    // Calculate streak (consecutive days with at least one session)
    const dates = [...new Set(sessions.map(s => new Date(s.createdAt).toDateString()))].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i < dates.length; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(checkDate.getDate() - i);
        if (dates.includes(checkDate.toDateString())) {
            streak++;
        } else {
            break;
        }
    }

    return {
        avgPronunciation,
        avgFluency,
        avgConfidence,
        totalSessions: sessions.length,
        streak,
        wordsPracticed
    };
}

// ─── Provider ────────────────────────────────────────────────────
export const StoreProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(loadUser);
    const [sessions, setSessions] = useState<PracticeSession[]>(loadSessions);
    const [progressStats, setProgressStats] = useState<ProgressStats>(() => calcStats(loadSessions()));
    const [autismMode, setAutismMode] = useState<boolean>(loadAutismMode);
    const [focusMode, setFocusMode] = useState<boolean>(loadFocusMode);
    const [gentleFeedback, setGentleFeedback] = useState<boolean>(loadGentleFeedback);
    const [accentStyle, setAccentStyle] = useState<'American' | 'British' | 'Indian'>(loadAccentStyle);

    // Persist user
    useEffect(() => {
        if (user) localStorage.setItem(LS_USER_KEY, JSON.stringify(user));
        else localStorage.removeItem(LS_USER_KEY);
    }, [user]);

    // Persist sessions and recalc stats
    useEffect(() => {
        // Sessions are stored newest-first (prepended in addSession), so slice(0, MAX) keeps the most recent.
        const toStore = sessions.slice(0, MAX_STORED_SESSIONS);
        localStorage.setItem(LS_SESSIONS_KEY, JSON.stringify(toStore));
        setProgressStats(calcStats(sessions));
    }, [sessions]);

    // Persist autism mode + body class
    useEffect(() => {
        localStorage.setItem(LS_AUTISM_KEY, String(autismMode));
        if (autismMode) {
            document.body.classList.add('autism-mode');
        } else {
            document.body.classList.remove('autism-mode');
        }
    }, [autismMode]);

    // Persist focus mode + body class
    useEffect(() => {
        localStorage.setItem(LS_FOCUS_KEY, String(focusMode));
        if (focusMode) {
            document.body.classList.add('focus-mode');
        } else {
            document.body.classList.remove('focus-mode');
        }
    }, [focusMode]);

    // Persist gentle feedback
    useEffect(() => {
        localStorage.setItem(LS_GENTLE_KEY, String(gentleFeedback));
    }, [gentleFeedback]);

    // Persist accent style
    useEffect(() => {
        localStorage.setItem(LS_ACCENT_KEY, accentStyle);
    }, [accentStyle]);

    const login = useCallback((email: string, name: string) => {
        const existing = loadUser();
        if (existing && existing.email === email) {
            setUser(existing);
            return;
        }
        const newUser: User = { id: crypto.randomUUID(), name, email, createdAt: new Date().toISOString() };
        setUser(newUser);
    }, []);

    const signup = useCallback((email: string, name: string) => {
        const newUser: User = { id: crypto.randomUUID(), name, email, createdAt: new Date().toISOString() };
        setUser(newUser);
    }, []);

    const logout = useCallback(() => {
        setUser(null);
    }, []);

    const addSession = useCallback((session: Omit<PracticeSession, 'sessionId' | 'userId' | 'createdAt'>) => {
        const fullSession: PracticeSession = {
            ...session,
            sessionId: crypto.randomUUID(),
            userId: user?.id || 'anonymous',
            createdAt: new Date().toISOString()
        };
        setSessions(prev => [fullSession, ...prev]);
    }, [user]);

    const toggleAutismMode = useCallback(() => {
        setAutismMode(prev => !prev);
    }, []);

    const toggleFocusMode = useCallback(() => {
        setFocusMode(prev => !prev);
    }, []);

    const toggleGentleFeedback = useCallback(() => {
        setGentleFeedback(prev => !prev);
    }, []);

    const updateAccentStyle = useCallback((accent: 'American' | 'British' | 'Indian') => {
        setAccentStyle(accent);
    }, []);

    return (
        <StoreContext.Provider value={{
            user, login, signup, logout, sessions, addSession, progressStats,
            autismMode, toggleAutismMode, focusMode, toggleFocusMode, gentleFeedback, toggleGentleFeedback,
            accentStyle, setAccentStyle: updateAccentStyle
        }}>
            {children}
        </StoreContext.Provider>
    );
};

// ─── Hook ────────────────────────────────────────────────────────
export const useStore = () => {
    const ctx = useContext(StoreContext);
    if (!ctx) throw new Error('useStore must be used within StoreProvider');
    return ctx;
};
