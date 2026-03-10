import { useState } from 'react';
import { Icon } from '@iconify/react';

const PracticeDemo = () => {
    const [step, setStep] = useState<'idle' | 'recording' | 'result'>('idle');

    const demoSentence = "She sells seashells by the seashore.";
    const demoTranscript = "She sells sea shells by the sea shore.";

    const handleDemo = () => {
        setStep('recording');
        setTimeout(() => setStep('result'), 2000);
    };

    const reset = () => setStep('idle');

    return (
        <section className="w-full py-32 bg-white px-6">
            <div className="max-w-5xl mx-auto">
                <div className="text-center mb-16">
                    <div className="text-sm font-medium tracking-tight text-neutral-400 mb-4 uppercase font-sans">
                        See It In Action
                    </div>
                    <h2 className="text-4xl md:text-5xl font-dm-sans text-[#111] tracking-tight leading-tight">
                        Try a quick demo
                    </h2>
                    <p className="text-neutral-500 font-sans mt-4 max-w-xl mx-auto">
                        Click the microphone to simulate how Sonara listens, analyzes, and gives you real-time pronunciation feedback.
                    </p>
                </div>

                <div className="bg-neutral-50 rounded-[2rem] p-6 sm:p-10 border border-neutral-100 shadow-[0_20px_60px_rgba(0,0,0,0.05)] max-w-3xl mx-auto">
                    {/* Sentence */}
                    <div className="bg-white rounded-2xl p-6 border border-neutral-100 mb-8">
                        <p className="text-xs text-neutral-400 uppercase tracking-wider font-sans mb-3">Read this sentence:</p>
                        <p className="text-xl sm:text-2xl font-dm-sans text-[#111] leading-relaxed tracking-tight">
                            {step === 'result' ? (
                                <>
                                    <span className="text-emerald-600">She </span>
                                    <span className="text-emerald-600">sells </span>
                                    <span className="text-rose-500 bg-rose-50 px-1 rounded border-b-2 border-rose-300">sea shells </span>
                                    <span className="text-emerald-600">by </span>
                                    <span className="text-emerald-600">the </span>
                                    <span className="text-rose-500 bg-rose-50 px-1 rounded border-b-2 border-rose-300">sea shore</span>
                                    <span className="text-emerald-600">.</span>
                                </>
                            ) : (
                                demoSentence
                            )}
                        </p>
                    </div>

                    {/* Mic + Transcript */}
                    <div className="flex flex-col items-center gap-6">
                        <button
                            onClick={step === 'idle' ? handleDemo : reset}
                            className={`w-20 h-20 rounded-full flex items-center justify-center text-white shadow-lg transition-all duration-300 ${step === 'recording'
                                ? 'bg-rose-500 mic-recording scale-110'
                                : step === 'result'
                                    ? 'bg-emerald-500 hover:bg-emerald-600'
                                    : 'bg-[#111] hover:scale-105 hover:shadow-xl'
                                }`}
                        >
                            <Icon
                                icon={step === 'result' ? 'solar:restart-linear' : 'solar:microphone-2-linear'}
                                width="32"
                            />
                        </button>

                        <p className="text-sm text-neutral-500 font-sans text-center">
                            {step === 'idle' && 'Click the microphone to try'}
                            {step === 'recording' && (
                                <span className="text-rose-500 animate-pulse flex items-center gap-2 justify-center">
                                    <span className="w-2 h-2 bg-rose-500 rounded-full animate-ping" />
                                    Listening...
                                </span>
                            )}
                            {step === 'result' && 'Click again to reset'}
                        </p>
                    </div>

                    {/* Result */}
                    {step === 'result' && (
                        <div className="mt-8 animate-[pageSlideIn_0.5s_ease_forwards]">
                            {/* Transcript */}
                            <div className="bg-indigo-50/50 rounded-2xl p-5 border border-indigo-100 mb-6">
                                <p className="text-xs text-indigo-500 uppercase tracking-wider font-semibold mb-2">You said:</p>
                                <p className="text-base font-sans text-[#111] italic">"{demoTranscript}"</p>
                            </div>

                            {/* Score Cards */}
                            <div className="grid grid-cols-3 gap-3 mb-6">
                                <div className="bg-white rounded-2xl p-4 text-center border border-neutral-100">
                                    <span className="text-2xl font-dm-sans font-medium text-indigo-600 score-animate">82</span>
                                    <p className="text-xs text-indigo-500 mt-1 font-sans">Accuracy</p>
                                </div>
                                <div className="bg-white rounded-2xl p-4 text-center border border-neutral-100">
                                    <span className="text-2xl font-dm-sans font-medium text-emerald-600 score-animate">90</span>
                                    <p className="text-xs text-emerald-500 mt-1 font-sans">Fluency</p>
                                </div>
                                <div className="bg-white rounded-2xl p-4 text-center border border-neutral-100">
                                    <span className="text-2xl font-dm-sans font-medium text-amber-600 score-animate">78</span>
                                    <p className="text-xs text-amber-500 mt-1 font-sans">Confidence</p>
                                </div>
                            </div>

                            {/* Tips */}
                            <div className="bg-amber-50 rounded-2xl p-5 border border-amber-100/50">
                                <h4 className="text-amber-700 text-xs font-medium uppercase tracking-tight flex items-center gap-1.5 font-sans mb-2">
                                    <Icon icon="solar:lightbulb-linear" width="16" /> AI Coaching Tips
                                </h4>
                                <ul className="text-sm text-amber-900 leading-relaxed font-sans space-y-1.5 list-disc pl-4">
                                    <li>"Seashells" should be one word — practice the /ʃ/ transition</li>
                                    <li>"Seashore" is one word — blend the syllables smoothly</li>
                                </ul>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
};

export default PracticeDemo;
