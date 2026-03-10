const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

export interface AnalysisResult {
    accuracyScore: number;
    incorrectWords: string[];
    phoneticBreakdown: { [key: string]: string };
    tips: string[];
    accentInfluence?: string;
    suggestions?: string[];
}

export const analyzePronunciation = async (text: string, transcript: string): Promise<AnalysisResult> => {
    try {
        const response = await fetch(`${BACKEND_URL}/analyze`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ text, transcript })
        });

        if (!response.ok) {
            throw new Error(`Error: ${response.statusText}`);
        }

        const data: AnalysisResult = await response.json();
        return data;
    } catch (error) {
        console.error('Failed to analyze pronunciation:', error);
        throw error;
    }
};
