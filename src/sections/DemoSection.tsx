import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { motion, AnimatePresence } from 'framer-motion';

type DemoTab = 'pronunciation' | 'ai-coach' | 'grammar';

const DEMO_TABS: { id: DemoTab; label: string; icon: string }[] = [
    { id: 'pronunciation', label: 'Pronunciation', icon: 'solar:soundwave-linear' },
    { id: 'ai-coach', label: 'AI Coach', icon: 'solar:stars-line-duotone' },
    { id: 'grammar', label: 'Grammar', icon: 'solar:document-text-linear' },
];

// ─── Pronunciation Demo ────────────────────────────────────────
const PronunciationDemo = () => {
    const [animating, setAnimating] = useState(false);
    const [showResult, setShowResult] = useState(false);

    const startAnimation = () => {
        if (animating) return;
        setAnimating(true);
        setShowResult(false);
        setTimeout(() => {
            setShowResult(true);
            setAnimating(false);
        }, 1800);
    };

    const words = [
        { text: 'Curiosity', status: 'correct' },
        { text: 'is', status: 'correct' },
        { text: 'the', status: 'correct' },
        { text: 'EN-gine', status: 'incorrect' },
        { text: 'of', status: 'correct' },
        { text: 'progress.', status: 'correct' },
    ];

    return (
        <div className="space-y-6">
            {/* Sentence Display */}
            <div className="bg-neutral-50 rounded-2xl p-6 border border-neutral-100">
                <p className="text-xs text-neutral-400 uppercase tracking-wider font-sans mb-3">Read aloud:</p>
                <p className="text-xl font-dm-sans text-[#111] leading-relaxed tracking-tight">
                    {showResult ? (
                        words.map((word, i) => (
                            <motion.span
                                key={i}
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1, duration: 0.3 }}
                                className={`inline-block mr-1.5 ${word.status === 'correct'
                                        ? 'text-emerald-600'
                                        : 'text-rose-500 bg-rose-50 px-1 rounded border-b-2 border-rose-300'
                                    }`}
                            >
                                {word.text}
                            </motion.span>
                        ))
                    ) : (
                        'Curiosity is the engine of progress.'
                    )}
                </p>
            </div>

            {/* Mic button */}
            <div className="flex justify-center">
                <button
                    onClick={startAnimation}
                    className={`w-14 h-14 rounded-full flex items-center justify-center text-white shadow-lg transition-all duration-300 ${animating
                            ? 'bg-rose-500 scale-110 mic-recording'
                            : showResult
                                ? 'bg-emerald-500 hover:bg-emerald-600'
                                : 'bg-[#111] hover:scale-105'
                        }`}
                >
                    <Icon icon={showResult ? 'solar:restart-linear' : 'solar:microphone-2-linear'} width="24" />
                </button>
            </div>

            {/* Results */}
            <AnimatePresence>
                {showResult && (
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.4 }}
                        className="space-y-4"
                    >
                        {/* Scores */}
                        <div className="grid grid-cols-3 gap-3">
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
                                <li>"Engine" stresses the first syllable: <span className="font-bold">EN</span>-gine</li>
                                <li>Focus on the "th" sound in words like "the".</li>
                            </ul>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// ─── AI Coach Demo ─────────────────────────────────────────────
const AICoachDemo = () => {
    const [step, setStep] = useState(0);

    useEffect(() => {
        if (step === 0) {
            const t1 = setTimeout(() => setStep(1), 800);
            return () => clearTimeout(t1);
        }
        if (step === 1) {
            const t2 = setTimeout(() => setStep(2), 1600);
            return () => clearTimeout(t2);
        }
    }, [step]);

    return (
        <div className="space-y-3">
            {/* User message */}
            <AnimatePresence>
                {step >= 1 && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex justify-end gap-2"
                    >
                        <div className="bg-indigo-600 text-white rounded-2xl rounded-tr-md px-4 py-3 max-w-[80%]">
                            <p className="text-sm font-sans">"I want to improve my speaking."</p>
                        </div>
                        <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center mt-1 flex-shrink-0">
                            <span className="text-indigo-700 font-bold text-[9px] font-sans">You</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Coach response */}
            <AnimatePresence>
                {step >= 2 && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex gap-2"
                    >
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center mt-1 flex-shrink-0">
                            <Icon icon="solar:stars-bold-duotone" width="14" className="text-white" />
                        </div>
                        <div className="bg-white border border-neutral-200/80 text-neutral-800 rounded-2xl rounded-tl-md px-4 py-3 max-w-[80%] shadow-sm">
                            <p className="text-sm font-sans leading-relaxed">
                                Nice sentence! Your pronunciation was mostly clear.
                                {'\n\n'}
                                Try stressing the word <strong className="text-indigo-600">confidence</strong> a bit more.
                                {'\n\n'}
                                💡 <strong className="text-indigo-600">Great!</strong> Let's practice together.
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {step < 1 && (
                <div className="flex justify-center py-6">
                    <div className="flex gap-1.5 items-center">
                        <div className="w-2 h-2 bg-indigo-400 rounded-full typing-dot" />
                        <div className="w-2 h-2 bg-indigo-400 rounded-full typing-dot" />
                        <div className="w-2 h-2 bg-indigo-400 rounded-full typing-dot" />
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── Grammar Demo ──────────────────────────────────────────────
const GrammarDemo = () => {
    const [showCorrection, setShowCorrection] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setShowCorrection(true), 1200);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="space-y-5">
            {/* User sentence */}
            <div className="bg-neutral-50 rounded-2xl p-5 border border-neutral-100">
                <p className="text-xs text-neutral-400 uppercase tracking-wider font-sans mb-2">Your sentence:</p>
                <p className="text-lg font-sans text-[#111] leading-relaxed">
                    I have <span className="text-rose-500 bg-rose-50 px-1 rounded border-b-2 border-rose-300 font-medium">finish</span> my homework.
                </p>
            </div>

            {/* AI correction */}
            <AnimatePresence>
                {showCorrection && (
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                    >
                        <div className="bg-emerald-50 rounded-2xl p-5 border border-emerald-100">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center">
                                    <Icon icon="solar:stars-bold-duotone" width="12" className="text-white" />
                                </div>
                                <span className="text-xs text-emerald-600 uppercase tracking-wider font-sans font-semibold">Corrected:</span>
                            </div>
                            <p className="text-lg font-sans text-emerald-800 leading-relaxed">
                                I have <span className="text-emerald-600 bg-emerald-100 px-1 rounded border-b-2 border-emerald-400 font-semibold">finished</span> my homework.
                            </p>
                        </div>

                        <div className="bg-indigo-50 rounded-2xl p-4 border border-indigo-100/50 mt-4">
                            <h4 className="text-indigo-700 text-xs font-medium uppercase tracking-tight flex items-center gap-1.5 font-sans mb-2">
                                <Icon icon="solar:lightbulb-linear" width="16" /> Grammar Tip
                            </h4>
                            <p className="text-sm text-indigo-900 leading-relaxed font-sans">
                                Use the past participle <strong>"finished"</strong> after "have" to form the present perfect tense.
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// ─── Main Demo Section ─────────────────────────────────────────
const DemoSection = () => {
    const [activeTab, setActiveTab] = useState<DemoTab>('pronunciation');

    // Reset animation on tab change
    const [key, setKey] = useState(0);
    useEffect(() => {
        setKey(prev => prev + 1);
    }, [activeTab]);

    return (
        <section className="w-full py-20 px-6 bg-[radial-gradient(circle_at_top,_rgba(212,235,248,0.45),_transparent_34%),linear-gradient(180deg,_#f9fbff_0%,_#ffffff_48%,_#f7f5f2_100%)]">
            <div className="max-w-5xl mx-auto relative">
                <div className="pointer-events-none absolute inset-x-0 top-6 h-40 rounded-[2.5rem] bg-[linear-gradient(90deg,rgba(99,102,241,0.08)_1px,transparent_1px),linear-gradient(rgba(16,185,129,0.08)_1px,transparent_1px)] bg-[size:24px_24px] opacity-50 [mask-image:linear-gradient(to_bottom,black,transparent)]" />
                <div className="pointer-events-none absolute -left-10 top-28 h-40 w-40 rounded-full bg-[radial-gradient(circle,_rgba(99,102,241,0.18),_transparent_70%)] blur-2xl" />
                <div className="pointer-events-none absolute -right-8 bottom-10 h-48 w-48 rounded-full bg-[radial-gradient(circle,_rgba(52,211,153,0.16),_transparent_72%)] blur-2xl" />

                {/* Section heading */}
                <div className="text-center mb-10 relative z-10">
                    <div className="text-sm font-medium tracking-tight text-neutral-400 mb-4 uppercase font-sans">
                        Interactive Preview
                    </div>
                    <h2 className="text-3xl md:text-4xl font-dm-sans font-semibold text-[#111] tracking-tight leading-tight">
                        Try a quick Sonara demo
                    </h2>
                    <p className="text-neutral-500 font-sans mt-4 max-w-2xl mx-auto">
                        Switch between a pronunciation preview, a live AI coach chat preview, and a grammar explanation preview. Each demo runs on its own.
                    </p>
                </div>

                {/* Tab Toggle */}
                <div className="flex justify-center mb-8 relative z-10">
                    <div className="inline-flex items-center gap-1 bg-white/85 backdrop-blur rounded-xl p-1 border border-neutral-200/80 shadow-sm">
                        {DEMO_TABS.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-sans font-medium transition-all ${activeTab === tab.id
                                        ? 'bg-[#111] text-white shadow-sm'
                                        : 'text-neutral-500 hover:text-neutral-800 hover:bg-neutral-50'
                                    }`}
                            >
                                <Icon icon={tab.icon} width="16" />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Demo Content */}
                <div className="relative z-10 max-w-3xl mx-auto overflow-hidden rounded-[2rem] border border-neutral-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.82)_0%,rgba(247,245,242,0.9)_100%)] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.05)] sm:p-8">
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.12),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(245,158,11,0.1),transparent_24%)]" />
                    <div className="pointer-events-none absolute right-5 top-5 h-14 w-14 bg-[linear-gradient(90deg,#6366f1_25%,transparent_25%,transparent_50%,#6366f1_50%,#6366f1_75%,transparent_75%,transparent),linear-gradient(#6366f1_25%,transparent_25%,transparent_50%,#6366f1_50%,#6366f1_75%,transparent_75%,transparent)] bg-[length:12px_12px] opacity-[0.09]" />
                    <div className="pointer-events-none absolute bottom-6 left-6 h-10 w-10 bg-[linear-gradient(90deg,#10b981_25%,transparent_25%,transparent_50%,#10b981_50%,#10b981_75%,transparent_75%,transparent),linear-gradient(#10b981_25%,transparent_25%,transparent_50%,#10b981_50%,#10b981_75%,transparent_75%,transparent)] bg-[length:10px_10px] opacity-[0.09]" />
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={`${activeTab}-${key}`}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.3 }}
                            className="relative"
                        >
                            {activeTab === 'pronunciation' && <PronunciationDemo />}
                            {activeTab === 'ai-coach' && <AICoachDemo />}
                            {activeTab === 'grammar' && <GrammarDemo />}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </section>
    );
};

export default DemoSection;
