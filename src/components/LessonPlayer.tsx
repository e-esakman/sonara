import { useEffect, useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import { AnimatePresence, motion } from 'framer-motion';

export interface LessonStep {
    title: string;
    content: string;
}

interface LessonPlayerProps {
    isOpen: boolean;
    steps: LessonStep[];
    voiceScript: string;
    onClose: () => void;
}

const STEP_DURATION_MS = 4200;

const LessonPlayer = ({ isOpen, steps, voiceScript, onClose }: LessonPlayerProps) => {
    const [activeStep, setActiveStep] = useState(0);
    const [isMuted, setIsMuted] = useState(false);

    const safeSteps = useMemo(
        () => steps.filter((step) => step.title?.trim() && step.content?.trim()),
        [steps]
    );

    useEffect(() => {
        if (!isOpen) {
            setActiveStep(0);
            return;
        }

        setActiveStep(0);

        if (safeSteps.length <= 1) {
            return;
        }

        const interval = window.setInterval(() => {
            setActiveStep((current) => (current + 1) % safeSteps.length);
        }, STEP_DURATION_MS);

        return () => window.clearInterval(interval);
    }, [isOpen, safeSteps]);

    useEffect(() => {
        if (!isOpen || isMuted || !voiceScript.trim() || typeof window === 'undefined' || !('speechSynthesis' in window)) {
            return;
        }

        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(voiceScript);
        utterance.rate = 0.95;
        utterance.pitch = 1;
        window.speechSynthesis.speak(utterance);

        return () => {
            window.speechSynthesis.cancel();
        };
    }, [isMuted, isOpen, voiceScript]);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen || safeSteps.length === 0) {
        return null;
    }

    const currentStep = safeSteps[activeStep];

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-[#111111]/45 px-4 py-6 backdrop-blur-sm"
            >
                <motion.div
                    initial={{ opacity: 0, y: 24, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 18, scale: 0.97 }}
                    transition={{ duration: 0.28, ease: 'easeOut' }}
                    className="relative w-full max-w-3xl overflow-hidden rounded-[34px] border border-[#e9dfd2] bg-[linear-gradient(135deg,rgba(255,255,255,0.98)_0%,rgba(250,246,239,0.97)_48%,rgba(238,245,255,0.98)_100%)] shadow-[0_28px_80px_rgba(17,17,17,0.18)]"
                >
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.13),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(14,165,233,0.12),transparent_24%)]" />

                    <div className="relative border-b border-[#eadfd2] px-6 py-5 sm:px-7">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-500">AI Lesson Player</p>
                                <h3 className="mt-2 text-[28px] font-dm-sans font-semibold tracking-tight text-[#111]">AI Grammar Lesson</h3>
                                <p className="mt-2 max-w-xl text-sm leading-relaxed text-neutral-600 font-sans">
                                    A short teacher-style walkthrough with motion, pacing, and spoken guidance.
                                </p>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsMuted((current) => !current)}
                                    className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/80 bg-white/80 text-neutral-600 shadow-sm transition hover:-translate-y-0.5 hover:text-indigo-600"
                                    aria-label={isMuted ? 'Unmute narration' : 'Mute narration'}
                                >
                                    <Icon icon={isMuted ? 'solar:volume-cross-linear' : 'solar:volume-loud-linear'} width="20" />
                                </button>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/80 bg-white/80 text-neutral-600 shadow-sm transition hover:-translate-y-0.5 hover:text-rose-500"
                                    aria-label="Close lesson player"
                                >
                                    <Icon icon="solar:close-circle-linear" width="20" />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="relative px-6 py-6 sm:px-7 sm:py-7">
                        <div className="mb-5 flex flex-wrap items-center gap-3">
                            {safeSteps.map((step, index) => {
                                const isActive = index === activeStep;
                                return (
                                    <button
                                        key={`${step.title}-${index}`}
                                        type="button"
                                        onClick={() => setActiveStep(index)}
                                        className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] transition ${
                                            isActive
                                                ? 'bg-[#111] text-white shadow-[0_10px_20px_rgba(17,17,17,0.16)]'
                                                : 'bg-white/85 text-neutral-500 shadow-sm hover:text-neutral-700'
                                        }`}
                                    >
                                        Step {index + 1}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
                            <div className="relative min-h-[300px] overflow-hidden rounded-[30px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(249,246,241,0.9)_100%)] p-6 shadow-[0_18px_40px_rgba(17,17,17,0.08)]">
                                <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#6366f1_0%,#0ea5e9_48%,#f59e0b_100%)]" />

                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={`${currentStep.title}-${activeStep}`}
                                        initial={{ opacity: 0, y: 28 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -18 }}
                                        transition={{ duration: 0.4, ease: 'easeOut' }}
                                        className="flex min-h-[268px] flex-col justify-between"
                                    >
                                        <div>
                                            <p className="text-sm font-bold uppercase tracking-[0.2em] text-indigo-500">
                                                Step {activeStep + 1}
                                            </p>
                                            <h4 className="mt-4 text-[30px] font-dm-sans font-semibold tracking-tight text-[#111]">
                                                {currentStep.title}
                                            </h4>
                                            <p className="mt-5 whitespace-pre-line text-lg leading-relaxed text-neutral-700 font-sans">
                                                {currentStep.content}
                                            </p>
                                        </div>

                                        <div className="mt-8 flex items-center gap-3 text-sm text-neutral-500 font-sans">
                                            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                                                <Icon icon="solar:clapperboard-play-linear" width="19" />
                                            </span>
                                            <span>Auto-playing this lesson like a mini tutorial.</span>
                                        </div>
                                    </motion.div>
                                </AnimatePresence>
                            </div>

                            <div className="space-y-4">
                                <div className="rounded-[28px] border border-white/80 bg-white/85 p-5 shadow-[0_16px_32px_rgba(17,17,17,0.06)]">
                                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-400">Narration</p>
                                    <p className="mt-3 text-sm leading-relaxed text-neutral-600 font-sans">
                                        {voiceScript}
                                    </p>
                                </div>

                                <div className="rounded-[28px] border border-white/80 bg-white/85 p-5 shadow-[0_16px_32px_rgba(17,17,17,0.06)]">
                                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-400">Progress</p>
                                    <div className="mt-4 flex gap-2">
                                        {safeSteps.map((step, index) => (
                                            <motion.div
                                                key={`${step.title}-bar-${index}`}
                                                className={`h-2 flex-1 rounded-full ${
                                                    index <= activeStep ? 'bg-indigo-500' : 'bg-neutral-200'
                                                }`}
                                                animate={{ opacity: index === activeStep ? 1 : 0.55 }}
                                            />
                                        ))}
                                    </div>
                                    <p className="mt-4 text-sm text-neutral-500 font-sans">
                                        {activeStep + 1} of {safeSteps.length} steps
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default LessonPlayer;
