/// <reference types="@types/dom-speech-recognition" />
import { useState, useCallback, useRef, useEffect } from 'react';

// Provide minimal fallback types to fix TS errors without full dom-speech-recognition
interface SpeechRecognitionEvent extends Event {
    resultIndex: number;
    results: any;
}

interface SpeechRecognitionErrorEvent extends Event {
    error: string;
    message: string;
}

declare global {
    interface Window {
        SpeechRecognition: any;
        webkitSpeechRecognition: any;
    }
}

// Maximum allowed recording duration (2 minutes)
const MAX_RECORDING_MS = 120_000;

export const useSpeechRecognition = () => {
    const [isRecording, setIsRecording] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [interimTranscript, setInterimTranscript] = useState('');
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<BlobPart[]>([]);
    const recognitionRef = useRef<any>(null);
    const isRecordingRef = useRef(false);
    const startTimeRef = useRef(0);
    const maxRecordingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const prevAudioUrlRef = useRef<string | null>(null);

    // Initial check for browser support
    const isSupported = typeof window !== 'undefined' &&
        (!!window.SpeechRecognition || !!window.webkitSpeechRecognition);

    // Revoke previous ObjectURL when a new one is set (prevent memory leaks)
    useEffect(() => {
        if (prevAudioUrlRef.current) {
            URL.revokeObjectURL(prevAudioUrlRef.current);
        }
        prevAudioUrlRef.current = audioUrl;
    }, [audioUrl]);

    // Revoke ObjectURL on unmount
    useEffect(() => {
        return () => {
            if (prevAudioUrlRef.current) {
                URL.revokeObjectURL(prevAudioUrlRef.current);
                prevAudioUrlRef.current = null;
            }
            if (maxRecordingTimerRef.current) {
                clearTimeout(maxRecordingTimerRef.current);
            }
        };
    }, []);

    const initRecognition = useCallback(() => {
        if (!isSupported) {
            setError('Speech recognition is not supported in this browser.');
            return null;
        }

        if (!recognitionRef.current) {
            const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
            const recognition = new SpeechRecognitionAPI();

            // Configure based on requirements
            recognition.continuous = false;
            recognition.interimResults = true;
            recognition.lang = 'en-US';

            recognition.onresult = (event: SpeechRecognitionEvent) => {
                let finalT = '';
                let interimT = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalT += event.results[i][0].transcript;
                    } else {
                        interimT += event.results[i][0].transcript;
                    }
                }
                if (finalT) setTranscript(finalT);
                setInterimTranscript(interimT);
            };

            recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
                const errorMsg = event.error === 'not-allowed'
                    ? 'Microphone access denied. Please click "Allow".'
                    : `Speech error: ${event.error}`;

                // Don't show aborted errors to user
                if (event.error !== 'aborted') {
                    setError(errorMsg);
                }
                setIsRecording(false);
                isRecordingRef.current = false;
            };

            recognition.onend = () => {
                setIsRecording(false);
                isRecordingRef.current = false;
            };

            recognitionRef.current = recognition;
        }

        return recognitionRef.current;
    }, [isSupported]);

    const startRecording = useCallback(async () => {
        setError(null);
        setTranscript('');
        setInterimTranscript('');

        // Ensure browser has permission before starting to prevent the "Hold-to-speak permission flash" bug
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

                // Set up MediaRecorder to capture the recording
                const mediaRecorder = new MediaRecorder(stream);
                audioChunksRef.current = [];
                setAudioUrl(null);

                mediaRecorder.ondataavailable = (event) => {
                    if (event.data.size > 0) {
                        audioChunksRef.current.push(event.data);
                    }
                };

                mediaRecorder.onstop = () => {
                    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                    const url = URL.createObjectURL(audioBlob);
                    setAudioUrl(url);
                    // Stop tracks to release microphone
                    stream.getTracks().forEach(track => track.stop());
                };

                mediaRecorderRef.current = mediaRecorder;

            } catch {
                setError('Microphone access denied. Please allow microphone access.');
                return;
            }
        }

        const recognition = initRecognition();

        if (recognition) {
            try {
                recognition.start();
                mediaRecorderRef.current?.start();
                setIsRecording(true);
                isRecordingRef.current = true;
                startTimeRef.current = Date.now();

                // Auto-stop after maximum duration to prevent runaway recordings
                maxRecordingTimerRef.current = setTimeout(() => {
                    if (isRecordingRef.current) {
                        recognitionRef.current?.stop();
                        if (mediaRecorderRef.current?.state === 'recording') {
                            mediaRecorderRef.current.stop();
                        }
                        setError('Recording stopped: maximum duration of 2 minutes reached.');
                    }
                }, MAX_RECORDING_MS);
            } catch (err: unknown) {
                // Handle cases where recognition is already started
                if (err instanceof DOMException && err.name === 'InvalidStateError') {
                    recognition.stop();
                    setTimeout(() => {
                        try {
                            recognition.start();
                            setIsRecording(true);
                            isRecordingRef.current = true;
                            startTimeRef.current = Date.now();
                        } catch { /* ignore */ }
                    }, 200);
                } else {
                    setError('Failed to start recording');
                }
            }
        }
    }, [initRecognition]);

    const stopRecording = useCallback(() => {
        // Clear the max-duration timer
        if (maxRecordingTimerRef.current) {
            clearTimeout(maxRecordingTimerRef.current);
            maxRecordingTimerRef.current = null;
        }

        // Prevent immediately stopping if the user just tapped it (allow at least 500ms to register real hold)
        const timeElapsed = Date.now() - startTimeRef.current;

        if (recognitionRef.current && isRecordingRef.current) {
            if (timeElapsed < 500) {
                console.log("Quick tap detected. Letting silence detection end recording.");
            } else {
                recognitionRef.current.stop();
                if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                    mediaRecorderRef.current.stop();
                }
            }
        }
    }, []);

    // Also handle when recognition ends naturally
    useEffect(() => {
        if (!isRecording && mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
    }, [isRecording]);

    return {
        transcript,
        interimTranscript,
        audioUrl,
        isRecording,
        isSupported,
        error,
        startRecording,
        stopRecording
    };
};
