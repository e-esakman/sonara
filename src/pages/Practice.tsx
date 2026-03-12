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

    const categories = ['All', ...new Set(passages.map(p => p.category))];
    const filtered = filterCategory === 'All' ? passages : passages.filter(p => p.category === filterCategory);

    const selectPassage = (p: Passage) => {
        setSelectedPassage(p);
        setShowSelector(false);
    };

    return (
        <div className="bg-[#FAFAFA] min-h-screen pt-36 pb-20">
            <div className="max-w-[90rem] mx-auto px-6 md:px-12">
                
                <div className="mb-8 border-b border-gray-200 pb-6 flex items-end justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center">
                                <Icon icon="solar:chart-square-linear" width="22" className="text-indigo-600" />
                            </div>
                            <h1 className="text-4xl font-dm-sans font-semibold text-[#111] tracking-tight">Practice Session</h1>
                        </div>
                        <p className="text-neutral-500 font-sans ml-[52px]">Select a practice method and improve your speaking.</p>
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Left Column (Practice Navigation Sidebar) */}
                    <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.35, ease: 'easeOut' }}
                        className="w-full lg:w-[240px] shrink-0"
                    >
                        <h2 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-4 px-2">Practice</h2>
                        <ul className="space-y-1.5 flex flex-row lg:flex-col overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
                            {[
                                { id: 'read-along', label: 'Read Along', icon: 'solar:book-2-linear' },
                                { id: 'live-coach', label: 'Live AI Coach', icon: 'solar:stars-line-duotone' },
                            ].map((item) => (
                                <li key={item.id}>
                                    <button
                                        onClick={() => setTab(item.id as PracticeTab)}
                                        className={`w-full whitespace-nowrap text-left px-4 py-3.5 rounded-xl border-l-[3px] font-sans text-sm transition-all duration-200 flex items-center gap-3 ${
                                            tab === item.id 
                                                ? (item.id === 'live-coach' 
                                                    ? 'bg-indigo-50 border-l-indigo-500 text-indigo-700 font-bold' 
                                                    : 'bg-indigo-50/70 border-l-indigo-600 text-indigo-700 font-bold') 
                                                : 'bg-transparent border-l-transparent hover:border-l-indigo-200 text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 font-bold'
                                        }`}
                                    >
                                        <Icon icon={item.icon} width="20" />
                                        {item.label}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </motion.div>

                    {/* Right Column (Practice Workspace) */}
                    <div className="flex-1 min-w-0">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={tab}
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.25, ease: 'easeOut' }}
                            >
                                {/* Read Along Mode */}
                        {tab === 'read-along' && (
                            <div className="page-enter">
                                {/* Passage Selector */}
                                <div className="mb-6">
                                    <button
                                        onClick={() => setShowSelector(!showSelector)}
                                        className="flex items-center gap-3 bg-white rounded-2xl px-5 py-4 border border-neutral-200 hover:border-neutral-300 hover:shadow-sm transition-all w-full sm:w-auto"
                                    >
                                        {selectedPassage ? (
                                            <>
                                                <span className="text-2xl">📘</span>
                                                <div className="text-left">
                                                    <p className="text-sm font-semibold text-[#111] font-sans">{selectedPassage.title}</p>
                                                    <p className="text-xs text-neutral-400 font-sans">{selectedPassage.category} • {selectedPassage.difficulty}</p>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <Icon icon="solar:book-2-linear" width="20" className="text-neutral-400" />
                                                <span className="text-sm font-medium text-neutral-500 font-sans">Choose a passage to practice</span>
                                            </>
                                        )}
                                        <Icon icon="solar:alt-arrow-down-linear" width="16" className={`text-neutral-400 ml-auto transition-transform ${showSelector ? 'rotate-180' : ''}`} />
                                    </button>

                                    {/* Dropdown Passage Grid */}
                                    {showSelector && (
                                        <div className="mt-3 bg-white rounded-2xl border border-neutral-200 shadow-lg p-5 animate-[pageSlideIn_0.3s_ease] max-h-[60vh] overflow-y-auto">
                                            {/* Category pills */}
                                            <div className="flex flex-wrap gap-2 mb-4 pb-3 border-b border-neutral-100">
                                                {categories.map(cat => (
                                                    <button
                                                        key={cat}
                                                        onClick={() => setFilterCategory(cat)}
                                                        className={`px-3 py-1.5 rounded-full text-xs font-sans font-medium transition-all ${filterCategory === cat
                                                            ? 'bg-[#111] text-white'
                                                            : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'
                                                            }`}
                                                    >
                                                        {cat}
                                                    </button>
                                                ))}
                                            </div>

                                            {/* Passage list */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                                {filtered.map(p => (
                                                    <button
                                                        key={p.id}
                                                        onClick={() => selectPassage(p)}
                                                        className={`flex items-center gap-3 p-3 rounded-xl text-left transition-all hover:bg-neutral-50 border ${selectedPassage?.id === p.id
                                                            ? 'border-indigo-200 bg-indigo-50/50'
                                                            : 'border-transparent hover:border-neutral-200'
                                                            }`}
                                                    >
                                                        <span className="text-xl shrink-0">📘</span>
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-medium text-[#111] font-sans truncate">{p.title}</p>
                                                            <p className="text-xs text-neutral-400 font-sans">{p.difficulty} • {p.wordCount}w</p>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>

                                            {/* Custom text option */}
                                            <div className="mt-4 pt-3 border-t border-neutral-100">
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
                                                    className="flex items-center gap-3 p-3 rounded-xl text-left transition-all hover:bg-neutral-50 w-full"
                                                >
                                                    <span className="text-xl">✏️</span>
                                                    <div>
                                                        <p className="text-sm font-medium text-[#111] font-sans">Custom Text Input</p>
                                                        <p className="text-xs text-neutral-400 font-sans">Type your own text to practice</p>
                                                    </div>
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Read Along Exercise */}
                                {selectedPassage ? (
                                    <ReadAlongMode passage={selectedPassage} />
                                ) : (
                                    <div className="bg-white rounded-3xl p-12 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-neutral-100 flex flex-col items-center justify-center text-center gap-4 min-h-[400px]">
                                        <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center">
                                            <Icon icon="solar:book-2-linear" width="32" className="text-indigo-400" />
                                        </div>
                                        <h3 className="font-dm-sans text-xl text-[#111]">Select a Passage</h3>
                                        <p className="text-neutral-500 font-sans text-sm max-w-sm">
                                            Choose a passage from the library, a tongue twister, or type your own text to begin practicing.
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Live AI Coach */}
                        {tab === 'live-coach' && (
                            <div className="page-enter">
                                <FreeSpeakMode initialMode="live" hideToggle={true} titleMode="live-coach" />
                            </div>
                        )}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Practice;
