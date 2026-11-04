/// <reference types="dom-speech-recognition" />
import { useCallback, useRef, useEffect } from 'react';

interface SpeechRecognitionOptions {
    continuous?: boolean;
    interimResults?: boolean;
    lang?: string;
    onTranscript: (text: string) => void;
}

// The live coach owns the microphone stream. This hook only supplies browser
// captions; it does not open a second stream or save unused audio recordings.
export const useSpeechRecognition = ({
    continuous = true,
    interimResults = false,
    lang = 'en-US',
    onTranscript,
}: SpeechRecognitionOptions) => {
    const recognitionRef = useRef<SpeechRecognition | null>(null);

    const stopRecording = useCallback(() => {
        const recognition = recognitionRef.current;
        recognitionRef.current = null;
        recognition?.stop();
    }, []);

    const startRecording = useCallback(() => {
        const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        // Captions are optional; AI audio works without browser recognition.
        if (!Recognition || recognitionRef.current) return;
        const recognition = new Recognition();
        recognition.continuous = continuous;
        recognition.interimResults = interimResults;
        recognition.lang = lang;
        recognition.onresult = event => {
            let finalText = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                if (event.results[i].isFinal) finalText += event.results[i][0].transcript;
            }
            if (finalText) onTranscript(finalText);
        };
        recognition.onend = () => {
            if (recognitionRef.current === recognition) recognitionRef.current = null;
        };
        recognition.onerror = () => {
            if (recognitionRef.current === recognition) recognitionRef.current = null;
        };
        recognitionRef.current = recognition;
        try {
            recognition.start();
        } catch {
            recognitionRef.current = null;
        }
    }, [continuous, interimResults, lang, onTranscript]);

    useEffect(() => () => {
        const recognition = recognitionRef.current;
        recognitionRef.current = null;
        if (recognition) {
            recognition.onresult = null;
            recognition.onend = null;
            recognition.onerror = null;
            recognition.abort();
        }
    }, []);

    return { startRecording, stopRecording };
};
