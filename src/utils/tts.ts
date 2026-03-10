type AccentStyle = 'American' | 'British' | 'Indian';

interface SpeakOptions {
    text: string;
    accentStyle: AccentStyle;
    rate?: number;
    onBoundary?: (charIndex: number, length: number) => void;
    onEnd?: () => void;
}

const getVoice = (accentStyle: AccentStyle): SpeechSynthesisVoice | null => {
    const voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) return null;

    let targetVoices: SpeechSynthesisVoice[] = [];

    switch (accentStyle) {
        case 'British':
            targetVoices = voices.filter(v => v.lang.includes('en-GB'));
            break;
        case 'American':
            targetVoices = voices.filter(v => v.lang.includes('en-US'));
            break;
        case 'Indian':
            targetVoices = voices.filter(v => v.lang.includes('en-IN') || v.lang.includes('hi-IN'));
            break;
    }

    // Prefer non-local service voices if available for better quality, but fallback to any
    const premiumVoice = targetVoices.find(v => v.name.includes('Premium') || v.name.includes('Google'));

    return premiumVoice || targetVoices[0] || voices.find(v => v.lang.startsWith('en')) || voices[0];
};

export const speakText = ({ text, accentStyle, rate = 1, onBoundary, onEnd }: SpeakOptions) => {
    if (!('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel(); // Stop any currently playing audio

    const utterance = new SpeechSynthesisUtterance(text);

    // Attach event handlers before calling speak to avoid missing early events
    if (onBoundary) {
        utterance.onboundary = (event) => {
            if (event.name === 'word') {
                onBoundary(event.charIndex, event.charLength || 0);
            }
        };
    }

    if (onEnd) {
        utterance.onend = onEnd;
    }

    // Ensure voices are loaded (Chrome sometimes needs this on first load)
    if (window.speechSynthesis.getVoices().length === 0) {
        window.speechSynthesis.onvoiceschanged = () => {
            // Clear the handler after first invocation to avoid replaying
            window.speechSynthesis.onvoiceschanged = null;
            const voice = getVoice(accentStyle);
            if (voice) utterance.voice = voice;
            utterance.rate = rate;
            window.speechSynthesis.speak(utterance);
        };
    } else {
        const voice = getVoice(accentStyle);
        if (voice) utterance.voice = voice;
        utterance.rate = rate;
        window.speechSynthesis.speak(utterance);
    }
};

export const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }
};
