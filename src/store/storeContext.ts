import { createContext } from 'react';

// ─── Types ───────────────────────────────────────────────────────
export interface User {
    id: string;
    name: string;
    email: string;
    createdAt: string;
}

// ─── Context ─────────────────────────────────────────────────────
interface StoreContextValue {
    // Auth
    user: User | null;
    login: (email: string, name: string) => void;
    signup: (email: string, name: string) => void;
    logout: () => void;

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

export const StoreContext = createContext<StoreContextValue | null>(null);

