import { useState, useEffect } from 'react';
import { Mic, Play, Volume2 } from 'lucide-react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { EXPECTED_SENTENCE, checkPronunciation } from '../utils/pronunciationUtils';
import { motion } from 'framer-motion';

const PronunciationCard = () => {
    const { isRecording, transcript, startRecording, isSupported } = useSpeechRecognition();
    const [results, setResults] = useState<{ word: string, correct: boolean }[]>([]);

    useEffect(() => {
        if (transcript && !isRecording) {
            setResults(checkPronunciation(transcript, EXPECTED_SENTENCE));
        }
    }, [transcript, isRecording]);

    const handleMicClick = () => {
        if (!isRecording) {
            startRecording();
        }
    };

    const playCorrect = () => {
        const utterance = new SpeechSynthesisUtterance(EXPECTED_SENTENCE);
        utterance.lang = 'en-US';
        window.speechSynthesis.speak(utterance);
    };

    return (
        <div className="bg-surface border border-stroke rounded-2xl p-6 md:p-10 max-w-xl mx-auto w-full relative">
            <div className="text-center space-y-8">
                <h3 className="text-xl md:text-2xl font-medium tracking-wide">
                    {results.length > 0 ? (
                        <div className="flex flex-wrap justify-center gap-x-2 leading-relaxed">
                            {results.map((r, i) => (
                                <span key={i} className={r.correct ? 'text-text' : 'text-pink-400 border-b border-pink-400 border-dashed pb-1'}>
                                    {r.word}
                                </span>
                            ))}
                        </div>
                    ) : (
                        <span className="text-text leading-relaxed">{EXPECTED_SENTENCE}</span>
                    )}
                </h3>

                <div className="flex items-center justify-center space-x-6">
                    <button
                        onClick={handleMicClick}
                        className={`p-4 rounded-full border border-stroke bg-bg transition-all duration-300 hover:scale-105 active:scale-95 ${isRecording ? 'scale-110 voice-gradient-border shadow-[0_0_30px_rgba(255,155,216,0.2)]' : ''
                            }`}
                        aria-label="Start recording"
                    >
                        {isRecording ? (
                            <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 1.5 }}>
                                <Mic className="w-6 h-6 text-pink-400 drop-shadow-lg" />
                            </motion.div>
                        ) : (
                            <Mic className="w-6 h-6 text-text hover:text-pink-300 transition-colors" />
                        )}
                    </button>

                    <button className="p-4 rounded-full border border-stroke bg-bg transition-all hover:scale-105 active:scale-95 group" aria-label="Replay recording">
                        <Play className="w-6 h-6 text-text group-hover:text-pink-300 transition-colors" />
                    </button>

                    <button onClick={playCorrect} className="p-4 rounded-full border border-stroke bg-bg transition-all hover:scale-105 active:scale-95 group" aria-label="Play correct pronunciation">
                        <Volume2 className="w-6 h-6 text-text group-hover:text-pink-300 transition-colors" />
                    </button>
                </div>

                <div className="text-sm text-muted min-h-[20px]">
                    {!isSupported && <span className="text-red-400">Speech recognition not supported in your browser</span>}
                    {isRecording && <span className="voice-gradient-text animate-pulse font-medium">Processing...</span>}
                    {!isRecording && isSupported && <span>Tap to start recording</span>}
                </div>
            </div>
        </div>
    );
};

export default PronunciationCard;
