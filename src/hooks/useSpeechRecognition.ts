import { useState, useCallback, useRef, useEffect } from 'react';

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
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<BlobPart[]>([]);
    const recognitionRef = useRef<any>(null);
    const isRecordingRef = useRef(false);
    const startTimeRef = useRef(0);

    // Initial check for browser support
    const isSupported = typeof window !== 'undefined' &&
        (!!window.SpeechRecognition || !!window.webkitSpeechRecognition);

    const initRecognition = useCallback(() => {
        if (!isSupported) {
            setError('Speech recognition is not supported in this browser.');
            return null;
        }

        if (!recognitionRef.current) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            const recognition = new SpeechRecognition();

            // Configure based on requirements
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.lang = 'en-US';

            recognition.onresult = (event: any) => {
                let finalTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    }
                }
                if (finalTranscript) {
                    setTranscript(finalTranscript);
                }
                setIsRecording(false);
                isRecordingRef.current = false;
            };

            recognition.onerror = (event: any) => {
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
                    // Stop tracks to release microphone if wanted, but recognition might need it
                };

                mediaRecorderRef.current = mediaRecorder;

            } catch (err) {
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
            } catch (err: any) {
                // Handle cases where recognition is already started
                if (err.name === 'InvalidStateError') {
                    recognition.stop();
                    setTimeout(() => {
                        try {
                            recognition.start();
                            setIsRecording(true);
                            isRecordingRef.current = true;
                            startTimeRef.current = Date.now();
                        } catch (e) { }
                    }, 200);
                } else {
                    setError('Failed to start recording');
                }
            }
        }
    }, [initRecognition]);

    const stopRecording = useCallback(() => {
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
        audioUrl,
        isRecording,
        isSupported,
        error,
        startRecording,
        stopRecording
    };
};
