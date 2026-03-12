import { useState } from 'react';
import { Icon } from '@iconify/react';
import { motion, AnimatePresence } from 'framer-motion';
import passages from '../data/passages';
import type { Passage } from '../data/passages';
import ReadAlongMode from '../sections/ReadAlongMode';
import FreeSpeakMode from '../sections/FreeSpeakMode';

type PracticeTab = 'read-along' | 'live-coach';

const Practice = () => {
    const [tab, setTab] = useState<PracticeTab>('read-along');
    const [selectedPassage, setSelectedPassage] = useState<Passage | null>(null);
    const [showSelector, setShowSelector] = useState(false);
    const [filterCategory, setFilterCategory] = useState<string>('All');

    const categories = ['All', ...new Set(passages.map((passage) => passage.category))];
    const filtered = filterCategory === 'All'
        ? passages
        : passages.filter((passage) => passage.category === filterCategory);

    const selectPassage = (passage: Passage) => {
        setSelectedPassage(passage);
        setShowSelector(false);
    };

    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(212,235,248,0.35),_transparent_28%),linear-gradient(180deg,_#fbfbfa_0%,_#f6f2ec_100%)] pt-36 pb-20">
            <div className="mx-auto max-w-[90rem] px-6 md:px-12">
                <div className="grid grid-cols-1 gap-8 xl:grid-cols-[280px_1fr]">
                    <aside className="rounded-[32px] border border-[#e6e0d8] bg-[linear-gradient(180deg,rgba(255,255,255,0.72)_0%,rgba(247,245,242,0.96)_100%)] p-6 shadow-[0_10px_30px_rgba(0,0,0,0.04)]">
                        <p className="mb-5 text-xs font-bold uppercase tracking-[0.18em] text-neutral-400">Practice</p>

                        <div className="space-y-2">
                            {[
                                {
                                    id: 'read-along',
                                    label: 'Read Along',
                                    caption: 'Choose a passage and compare what you read.',
                                    icon: 'solar:book-2-linear',
                                },
                                {
                                    id: 'live-coach',
                                    label: 'Live AI Coach',
                                    caption: 'Speak naturally and get tutor-style feedback.',
                                    icon: 'solar:stars-line-duotone',
                                },
                            ].map((item) => {
                                const active = tab === item.id;

                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => setTab(item.id as PracticeTab)}
                                        className={`w-full rounded-[24px] border px-4 py-4 text-left transition-all duration-200 ${
                                            active
                                                ? 'border-indigo-200 bg-indigo-50/90 shadow-sm'
                                                : 'border-transparent bg-white/55 hover:border-neutral-200 hover:bg-white'
                                        }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className={`mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl ${
                                                active ? 'bg-white text-indigo-600' : 'bg-neutral-100 text-neutral-500'
                                            }`}>
                                                <Icon icon={item.icon} width="20" />
                                            </div>
                                            <div>
                                                <h2 className={`text-lg font-dm-sans font-semibold tracking-tight ${
                                                    active ? 'text-indigo-700' : 'text-[#111]'
                                                }`}>
                                                    {item.label}
                                                </h2>
                                                <p className="mt-1 text-sm leading-relaxed text-neutral-500 font-sans">
                                                    {item.caption}
                                                </p>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </aside>

                    <section className="overflow-hidden rounded-[34px] border border-[#e6e0d8] bg-[linear-gradient(180deg,rgba(255,255,255,0.82)_0%,rgba(247,245,242,0.98)_100%)] shadow-[0_12px_36px_rgba(0,0,0,0.05)]">
                        <div className="border-b border-[#e6e0d8] px-6 py-5 sm:px-8">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                <div>
                                    <h2 className="text-[28px] font-dm-sans font-semibold tracking-tight text-[#111]">
                                        {tab === 'read-along' ? 'Read Along Studio' : 'Live AI Coach'}
                                    </h2>
                                    <p className="mt-1 text-sm leading-relaxed text-neutral-500 font-sans">
                                        {tab === 'read-along'
                                            ? 'Select a passage, read it aloud, then review your spoken text and pronunciation feedback.'
                                            : 'Talk to the coach in one focused space, with your transcript and the AI response in the same flow.'}
                                    </p>
                                </div>

                                {tab === 'read-along' && (
                                    <div className="relative lg:min-w-[360px]">
                                        <button
                                            onClick={() => setShowSelector((current) => !current)}
                                            className="flex w-full items-center gap-3 rounded-[22px] border border-neutral-200 bg-white px-5 py-4 text-left shadow-sm transition-all hover:border-neutral-300"
                                        >
                                            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-500">
                                                <Icon icon="solar:book-2-linear" width="18" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                {selectedPassage ? (
                                                    <>
                                                        <p className="truncate text-[15px] font-semibold text-[#111] font-dm-sans">
                                                            {selectedPassage.title}
                                                        </p>
                                                        <p className="truncate text-xs text-neutral-400 font-sans">
                                                            {selectedPassage.category} • {selectedPassage.difficulty} • {selectedPassage.wordCount} words
                                                        </p>
                                                    </>
                                                ) : (
                                                    <>
                                                        <p className="text-[15px] font-semibold text-[#111] font-dm-sans">Choose a passage to practice</p>
                                                        <p className="text-xs text-neutral-400 font-sans">Library passages and custom text are both available.</p>
                                                    </>
                                                )}
                                            </div>
                                            <Icon
                                                icon="solar:alt-arrow-down-linear"
                                                width="18"
                                                className={`text-neutral-400 transition-transform ${showSelector ? 'rotate-180' : ''}`}
                                            />
                                        </button>

                                        {showSelector && (
                                            <div className="absolute right-0 z-20 mt-3 w-full overflow-hidden rounded-[26px] border border-neutral-200 bg-white shadow-[0_18px_40px_rgba(0,0,0,0.08)]">
                                                <div className="border-b border-neutral-100 px-5 py-4">
                                                    <div className="flex flex-wrap gap-2">
                                                        {categories.map((category) => (
                                                            <button
                                                                key={category}
                                                                onClick={() => setFilterCategory(category)}
                                                                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                                                                    filterCategory === category
                                                                        ? 'bg-[#111] text-white'
                                                                        : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'
                                                                }`}
                                                            >
                                                                {category}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className="max-h-[360px] overflow-y-auto p-3">
                                                    <div className="grid grid-cols-1 gap-2">
                                                        {filtered.map((passage) => (
                                                            <button
                                                                key={passage.id}
                                                                onClick={() => selectPassage(passage)}
                                                                className={`rounded-[18px] border p-3 text-left transition-all ${
                                                                    selectedPassage?.id === passage.id
                                                                        ? 'border-indigo-200 bg-indigo-50/70'
                                                                        : 'border-transparent hover:border-neutral-200 hover:bg-neutral-50'
                                                                }`}
                                                            >
                                                                <p className="text-sm font-semibold text-[#111] font-dm-sans">{passage.title}</p>
                                                                <p className="mt-1 text-xs text-neutral-400 font-sans">
                                                                    {passage.category} • {passage.difficulty} • {passage.readingTime}
                                                                </p>
                                                            </button>
                                                        ))}

                                                        <button
                                                            onClick={() => {
                                                                setSelectedPassage({
                                                                    id: 'custom',
                                                                    title: 'Custom Text',
                                                                    category: 'Custom',
                                                                    difficulty: 'Beginner',
                                                                    readingTime: '—',
                                                                    wordCount: 0,
                                                                    content: '',
                                                                    coverColor: 'bg-neutral-800',
                                                                    innerColor: 'bg-neutral-700',
                                                                    accentColor: 'border-neutral-600',
                                                                    patternType: 'dots',
                                                                });
                                                                setShowSelector(false);
                                                            }}
                                                            className="rounded-[18px] border border-dashed border-neutral-200 p-3 text-left transition-all hover:border-neutral-300 hover:bg-neutral-50"
                                                        >
                                                            <p className="text-sm font-semibold text-[#111] font-dm-sans">Custom Text Input</p>
                                                            <p className="mt-1 text-xs text-neutral-400 font-sans">Paste your own sentence or paragraph to practice.</p>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="px-4 py-4 sm:px-6 sm:py-6">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={tab}
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -8 }}
                                    transition={{ duration: 0.24, ease: 'easeOut' }}
                                >
                                    {tab === 'read-along' ? (
                                        selectedPassage ? (
                                            <ReadAlongMode passage={selectedPassage} />
                                        ) : (
                                            <div className="flex min-h-[560px] items-center justify-center rounded-[28px] border border-dashed border-neutral-200 bg-white/65 p-10 text-center">
                                                <div className="max-w-md">
                                                    <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-indigo-100/70 text-indigo-500">
                                                        <Icon icon="solar:book-2-linear" width="34" />
                                                    </div>
                                                    <h3 className="text-3xl font-dm-sans font-semibold tracking-tight text-[#111]">Select a Passage</h3>
                                                    <p className="mt-3 text-lg leading-relaxed text-neutral-500 font-sans">
                                                        Choose a passage from the selector above, or open Custom Text to practice in the same workspace.
                                                    </p>
                                                </div>
                                            </div>
                                        )
                                    ) : (
                                        <FreeSpeakMode initialMode="live" hideToggle={true} titleMode="live-coach" />
                                    )}
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default Practice;
