import { getRequiredBackendUrl } from './backendConfig';

export interface SessionData {
    text: string;
    accuracyScore: number;
    fluencyScore: number;
    timestamp: Date;
    userId?: string;
}

export interface ProgressData {
    pronunciationScore: number;
    fluencyScore: number;
    streak: number;
    wordsPracticed: number;
}

export const saveSession = async (session: SessionData): Promise<void> => {
    try {
        const backendUrl = getRequiredBackendUrl();
        await fetch(`${backendUrl}/session`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(session)
        });
    } catch (error) {
        console.error('Failed to save session:', error);
    }
};

export const getProgress = async (userId: string = 'anonymous'): Promise<ProgressData | null> => {
    try {
        const backendUrl = getRequiredBackendUrl();
        const encodedUserId = encodeURIComponent(userId);
        const response = await fetch(`${backendUrl}/progress?userId=${encodedUserId}`);
        if (!response.ok) {
            throw new Error(`Error: ${response.statusText}`);
        }
        const data: ProgressData = await response.json();
        return data;
    } catch (error) {
        console.error('Failed to get progress:', error);
        return null;
    }
};
