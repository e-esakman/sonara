import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { StoreContext, type User } from './storeContext';

// ─── Local Storage Helpers ───────────────────────────────────────
const LS_USER_KEY = 'sonara_user';
const LS_AUTISM_KEY = 'sonara_autism_mode';
const LS_FOCUS_KEY = 'sonara_focus_mode';
const LS_GENTLE_KEY = 'sonara_gentle_feedback';
const LS_ACCENT_KEY = 'sonara_accent_style';

function isValidUser(obj: unknown): obj is User {
    return (
        typeof obj === 'object' && obj !== null &&
        typeof (obj as User).id === 'string' && (obj as User).id.length > 0 &&
        typeof (obj as User).email === 'string' && (obj as User).email.length > 0 &&
        typeof (obj as User).name === 'string' &&
        typeof (obj as User).createdAt === 'string'
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

// ─── Provider ────────────────────────────────────────────────────
export const StoreProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(loadUser);
    const [autismMode, setAutismMode] = useState<boolean>(loadAutismMode);
    const [focusMode, setFocusMode] = useState<boolean>(loadFocusMode);
    const [gentleFeedback, setGentleFeedback] = useState<boolean>(loadGentleFeedback);
    const [accentStyle, setAccentStyle] = useState<'American' | 'British' | 'Indian'>(loadAccentStyle);

    // Persist user
    useEffect(() => {
        if (user) localStorage.setItem(LS_USER_KEY, JSON.stringify(user));
        else localStorage.removeItem(LS_USER_KEY);
    }, [user]);

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
            user, login, signup, logout,
            autismMode, toggleAutismMode, focusMode, toggleFocusMode, gentleFeedback, toggleGentleFeedback,
            accentStyle, setAccentStyle: updateAccentStyle
        }}>
            {children}
        </StoreContext.Provider>
    );
};

