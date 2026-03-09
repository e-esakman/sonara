import { useState, useEffect, useCallback } from 'react';

// Extend window object to include the speech recognition APIs
declare global {
    interface Window {
        SpeechRecognition: any;
        webkitSpeechRecognition: any;
    }
}

export const useSpeechRecognition = () => {
    const [isRecording, setIsRecording] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [isSupported, setIsSupported] = useState(true);

    useEffect(() => {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            setIsSupported(false);
        }
    }, []);

    const startRecording = useCallback(() => {
        if (!isSupported) return;
        setIsRecording(true);
        setTranscript('');

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onresult = (event: any) => {
            const speechResult = event.results[0][0].transcript;
            setTranscript(speechResult);
        };

        recognition.onerror = (event: any) => {
            console.error('Speech recognition error', event.error);
            setIsRecording(false);
        };

        recognition.onend = () => {
            setIsRecording(false);
        };

        recognition.start();
    }, [isSupported]);

    return { isRecording, transcript, startRecording, isSupported };
}
