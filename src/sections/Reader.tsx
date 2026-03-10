import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { analyzePronunciation } from '../services/geminiService';
import type { AnalysisResult } from '../services/geminiService';
import ExplanationCard from '../components/ExplanationCard';

const PASSAGE = "In my younger and more vulnerable years my father gave me some advice that I've been turning over in my mind ever since.";

const Reader = () => {
    const { isRecording, transcript, startRecording, isSupported } = useSpeechRecognition();
    const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    useEffect(() => {
        const analyze = async () => {
            if (transcript && !isRecording) {
                setIsAnalyzing(true);
                try {
                    const result = await analyzePronunciation(PASSAGE, transcript);
                    setAnalysis(result);
                } catch (error) {
                    console.error("Analysis failed", error);
                } finally {
                    setIsAnalyzing(false);
                }
            }
        };
        analyze();
    }, [transcript, isRecording]);

    // Simple text renderer with color coding
    const renderPassage = () => {
        return PASSAGE.split(' ').map((word, idx) => {
            const isIncorrect = analysis?.incorrectWords.map(w => w.toLowerCase()).includes(word.toLowerCase().replace(/[.,!?]/g, ''));
            const isCorrect = analysis && !isIncorrect;

            let colorClass = 'text-neutral-600';
            if (isIncorrect) colorClass = 'text-rose-600 underline decoration-rose-300';
            if (isCorrect) colorClass = 'text-emerald-700';

            return (
                <span key={idx} className={`${colorClass} mr-1 transition-colors duration-300`}>
                    {word}
                </span>
            );
        });
    };

    return (
        <section id="reader" className="w-full py-32 bg-white px-6">
            <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-12 items-start">

                <div className="w-full lg:w-2/3 flex flex-col gap-6">
                    <div className="text-sm font-medium tracking-tight text-neutral-400 mb-2 uppercase font-sans">Practice Mode</div>
                    <h3 className="text-3xl tracking-tight text-[#111] mb-6 font-normal font-dm-sans">Read along</h3>

                    <div className="bg-[#F7F5F2] p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-neutral-100 w-full relative overflow-hidden">
                        <div className="flex items-center gap-4 mb-8 relative z-10">
                            <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center text-neutral-400 shadow-sm border border-neutral-200">
                                <Icon icon="solar:book-linear" width="28" />
                            </div>
                            <div>
                                <h4 className="text-lg font-medium tracking-tight text-[#111] font-sans">The Great Gatsby</h4>
                                <p className="text-sm text-neutral-500 font-sans">Chapter 1 • Reading Exercise</p>
                            </div>
                        </div>

                        {/* Text Passage Box */}
                        <div className="bg-white rounded-2xl p-6 border border-neutral-200 mb-8 relative z-10 min-h-[160px]">
                            <p className="text-lg md:text-xl leading-relaxed italic font-sans">
                                "{renderPassage()}"
                            </p>
                        </div>

                        <div className="flex justify-between items-center relative z-10">
                            <button className="text-sm font-medium text-neutral-500 hover:text-[#111] transition-colors font-sans">Skip</button>
                            <div className="flex flex-col items-center">
                                <button
                                    className={`text-white px-8 py-4 rounded-full text-base font-medium flex items-center gap-2 transition-all shadow-lg ${isRecording ? 'bg-rose-500 mic-pulse scale-105' : 'bg-[#111] hover:bg-neutral-800'}`}
                                    onClick={startRecording}
                                    disabled={isRecording || isAnalyzing || !isSupported}
                                >
                                    <Icon icon="solar:microphone-2-linear" width="22" />
                                    {isRecording ? 'Listening...' : 'Hold to speak'}
                                </button>
                                {isAnalyzing && <span className="text-xs text-indigo-500 mt-3 absolute -bottom-6 animate-pulse">Analyzing text with Gemini...</span>}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="w-full lg:w-1/3 pt-14 lg:pt-20">
                    <ExplanationCard analysis={analysis} />
                </div>

            </div>
        </section>
    );
};

export default Reader;
