import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { analyzePronunciation } from '../services/pronunciationService';
import type { AnalysisResult } from '../services/pronunciationService';
import { saveSession } from '../services/progressService';

const EXPECTED_SENTENCE = "She sells seashells by the seashore.";

const Trainer = () => {
    const {
        isRecording,
        transcript,
        isSupported,
        error: speechError,
        startRecording,
        stopRecording
    } = useSpeechRecognition();

    const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);

    // Trigger analysis when transcript updates and recording finishes
    useEffect(() => {
        const analyze = async () => {
            if (transcript && !isRecording) {
                setIsAnalyzing(true);
                setApiError(null);
                try {
                    const result = await analyzePronunciation(EXPECTED_SENTENCE, transcript);
                    setAnalysis(result);

                    // Fire-and-forget session save
                    saveSession({
                        text: EXPECTED_SENTENCE,
                        accuracyScore: result.accuracyScore,
                        fluencyScore: 85,
                        timestamp: new Date()
                    }).catch(console.error);

                } catch (error: any) {
                    console.error("Analysis failed:", error);
                    setApiError(error.message || 'Failed connecting to backend.');
                } finally {
                    setIsAnalyzing(false);
                }
            }
        };

        // Debounce slightly to ensure state is settled before hitting the API
        const timer = setTimeout(analyze, 300);
        return () => clearTimeout(timer);
    }, [transcript, isRecording]);

    const playCorrect = () => {
        const utterance = new SpeechSynthesisUtterance(EXPECTED_SENTENCE);
        utterance.lang = 'en-US';
        window.speechSynthesis.speak(utterance);
    };

    // Calculate word correctness safely
    const words = EXPECTED_SENTENCE.split(' ');

    const checkWord = (word: string) => {
        const clean = word.toLowerCase().replace(/[.,!?]/g, '');
        return analysis?.incorrectWords.map(w => w.toLowerCase()).includes(clean) ?? false;
    };

    // Determine current UI states
    const statusText = () => {
        if (!isSupported) return <span className="text-rose-500">Browser doesn't support speech recognition.</span>;
        if (speechError) return <span className="text-rose-500">{speechError}</span>;
        if (apiError) return <span className="text-rose-500">{apiError}</span>;

        if (isRecording) {
            return (
                <span className="text-rose-500 animate-pulse flex items-center gap-2 justify-center">
                    <Icon icon="line-md:loading-twotone-loop" /> Listening...
                </span>
            );
        }
        if (isAnalyzing) {
            return (
                <span className="text-indigo-500 animate-pulse flex items-center gap-2 justify-center">
                    <Icon icon="line-md:loading-loop" /> Analyzing pronunciation...
                </span>
            );
        }

        if (analysis) return <span className="text-emerald-500">Analysis complete. Hold mic to try again.</span>;
        return <span className="text-neutral-500">Hold microphone button to speak</span>;
    };


    return (
        <section className="w-full pr-6 pb-32 pl-6 pt-16">
            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-stretch">

                {/* Visual Pronunciation Card */}
                <div className="lg:col-span-7 h-full">
                    <div className="bg-white rounded-3xl p-8 md:p-12 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-neutral-100 relative overflow-hidden h-full flex flex-col justify-between">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

                        <div className="text-center mb-16 relative z-10">
                            <div className="text-3xl md:text-4xl font-medium tracking-tight text-[#111] flex flex-wrap justify-center gap-x-3 gap-y-4 mb-6">
                                {words.map((word, idx) => {
                                    const isIncorrect = analysis && checkWord(word);
                                    const isCorrect = analysis && !isIncorrect;

                                    return (
                                        <div key={idx} className="flex flex-col items-center gap-2 relative">
                                            <span className={`font-normal font-dm-sans transition-colors duration-300 ${isIncorrect ? 'text-rose-500 border-b-2 border-rose-500/30 pb-1' : (isCorrect ? 'text-emerald-700' : '')}`}>
                                                {word}
                                            </span>
                                            {isCorrect && <Icon icon="solar:check-circle-linear" className="text-emerald-500 text-base absolute -bottom-6 animate-pulse-soft" />}
                                            {isIncorrect && <Icon icon="solar:close-circle-linear" className="text-rose-500 text-base absolute -bottom-6" />}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Show transcript underneath gracefully if there is one */}
                            {transcript && (
                                <p className="text-neutral-400 text-sm mt-8 italic font-sans break-words bg-neutral-50 p-3 rounded-xl border border-neutral-100 inline-block">
                                    You said: "{transcript}"
                                </p>
                            )}
                        </div>

                        <div className="flex justify-center items-center gap-6 relative z-10 mt-auto">
                            <button
                                onClick={playCorrect}
                                className="w-12 h-12 flex items-center justify-center rounded-full bg-neutral-100 text-neutral-600 hover:bg-neutral-200 transition-colors"
                                disabled={isRecording}
                                title="Listen to correct pronunciation"
                            >
                                <Icon icon="solar:volume-loud-linear" width="24" />
                            </button>

                            {/* The Hold-to-Speak button with Mobile Touch support */}
                            <button
                                onMouseDown={startRecording}
                                onMouseUp={stopRecording}
                                onMouseLeave={stopRecording} // Ensure it stops if dragged away
                                onTouchStart={(e) => { e.preventDefault(); startRecording(); }}
                                onTouchEnd={(e) => { e.preventDefault(); stopRecording(); }}
                                className={`w-16 h-16 flex items-center justify-center rounded-full text-white shadow-lg transition-transform touch-none select-none ${isRecording ? 'bg-rose-500 mic-pulse scale-110' : 'bg-[#111] hover:scale-105'}`}
                                disabled={isAnalyzing || !isSupported}
                                aria-label="Hold to speak"
                            >
                                <Icon icon="solar:microphone-2-linear" width="28" />
                            </button>

                            <button className="w-12 h-12 flex items-center justify-center rounded-full bg-neutral-100 text-neutral-600 hover:bg-neutral-200 transition-colors">
                                <Icon icon="solar:play-linear" width="24" />
                            </button>
                        </div>

                        <div className="text-center mt-6 text-sm font-medium font-sans min-h-[20px] transition-all">
                            {statusText()}
                        </div>
                    </div>
                </div>

                {/* Advanced Analysis Output */}
                <div className="lg:col-span-5 relative flex h-full">
                    {!analysis && !isAnalyzing ? (
                        <div className="bg-white rounded-3xl p-8 shadow-[0_20px_40px_rgb(0,0,0,0.06)] border border-neutral-100 w-full flex flex-col items-center justify-center min-h-[300px] text-center gap-4">
                            <Icon icon="solar:clipboard-text-linear" width="48" className="text-neutral-200" />
                            <p className="text-neutral-500 font-sans text-sm">Hold the microphone to read the sentence.<br />Detailed feedback will appear here.</p>
                        </div>
                    ) : isAnalyzing ? (
                        <div className="bg-white rounded-3xl p-8 shadow-[0_20px_40px_rgb(0,0,0,0.06)] border border-neutral-100 w-full flex flex-col items-center justify-center min-h-[300px] text-center gap-4">
                            <Icon icon="line-md:loading-twotone-loop" width="48" className="text-indigo-500" />
                            <h3 className="font-dm-sans text-lg text-[#111]">Analyzing Speech</h3>
                            <p className="text-neutral-500 font-sans text-sm max-w-[250px]">Gemini is processing your pronunciation and matching accents...</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-3xl p-8 shadow-[0_20px_40px_rgb(0,0,0,0.06)] border border-neutral-100 hover:rotate-0 transition-transform duration-500 w-full flex flex-col gap-6">

                            {/* Score header */}
                            <div className="flex justify-between items-center border-b border-neutral-100 pb-4">
                                <span className="text-sm font-medium text-neutral-400 uppercase tracking-tight font-sans">Analysis</span>
                                <div className="flex items-center gap-2">
                                    <div className="w-24 h-2 bg-neutral-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${analysis?.accuracyScore || 0}%` }} />
                                    </div>
                                    <span className="text-sm font-bold text-indigo-600 font-sans">
                                        {analysis?.accuracyScore}%
                                    </span>
                                </div>
                            </div>

                            {analysis?.incorrectWords && analysis.incorrectWords.length > 0 ? (
                                <div className="flex-1 flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar">
                                    <div>
                                        <h4 className="text-neutral-500 text-xs uppercase tracking-tight mb-2 font-sans flex items-center gap-1"><Icon icon="solar:danger-triangle-linear" /> Needs Work</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {analysis.incorrectWords.map((word, i) => (
                                                <span key={i} className="text-lg tracking-tight text-rose-500 font-normal font-dm-sans bg-rose-50 px-3 py-1 rounded-lg border border-rose-100">
                                                    {word}
                                                    {analysis.phoneticBreakdown?.[word] && (
                                                        <span className="text-sm font-sans text-rose-400 ml-2">({analysis.phoneticBreakdown[word]})</span>
                                                    )}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {analysis.accentInfluence && (
                                        <div>
                                            <h4 className="text-neutral-500 text-xs uppercase tracking-tight mb-1 font-sans">Detected Accent</h4>
                                            <p className="text-sm font-medium text-[#111] font-sans p-3 bg-neutral-50 rounded-xl border border-neutral-100">{analysis.accentInfluence}</p>
                                        </div>
                                    )}

                                    {analysis.tips && analysis.tips.length > 0 && (
                                        <div className="bg-amber-50 rounded-2xl p-5 border border-amber-100/50 flex flex-col gap-3">
                                            <h4 className="text-amber-700 text-xs font-medium uppercase tracking-tight flex items-center gap-1.5 font-sans">
                                                <Icon icon="solar:lightbulb-linear" width="16" />
                                                Coaching Tips
                                            </h4>
                                            <ul className="text-sm text-amber-900 leading-relaxed font-sans space-y-2 list-disc pl-4">
                                                {analysis.tips.map((tip, i) => (
                                                    <li key={i}>{tip}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {analysis.suggestions && analysis.suggestions.length > 0 && (
                                        <div className="bg-indigo-50 rounded-2xl p-5 border border-indigo-100/50 flex flex-col gap-3">
                                            <h4 className="text-indigo-700 text-xs font-medium uppercase tracking-tight flex items-center gap-1.5 font-sans">
                                                <Icon icon="solar:magic-stick-3-linear" width="16" />
                                                Improvement Suggestions
                                            </h4>
                                            <ul className="text-sm text-indigo-900 leading-relaxed font-sans space-y-2 list-disc pl-4">
                                                {analysis.suggestions.map((sug, i) => (
                                                    <li key={i}>{sug}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center flex-1 gap-4 text-center">
                                    <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-2">
                                        <Icon icon="solar:check-circle-bold-duotone" width="48" className="text-emerald-500" />
                                    </div>
                                    <h3 className="text-2xl font-dm-sans text-[#111]">Perfect Pronunciation!</h3>
                                    <p className="text-sm text-neutral-500 font-sans max-w-[250px]">Your accent sounds extremely natural and all words were perfectly articulated.</p>

                                    {analysis?.accentInfluence && (
                                        <p className="text-sm font-medium text-[#111] font-sans p-3 bg-neutral-50 rounded-xl border border-neutral-100 mt-4">
                                            <span className="text-neutral-500 text-xs uppercase block mb-1">Detected Profile</span>
                                            {analysis.accentInfluence}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
};

export default Trainer;
