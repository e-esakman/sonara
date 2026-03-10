import { useState } from 'react';
import { Icon } from '@iconify/react';
import passages from '../data/passages';
import type { Passage } from '../data/passages';
import ReadAlongMode from '../sections/ReadAlongMode';
import FreeSpeakMode from '../sections/FreeSpeakMode';

type PracticeTab = 'read-along' | 'free-speak';

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
        <div className="pt-36 min-h-screen bg-neutral-50 pb-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center">
                            <Icon icon="solar:microphone-2-linear" width="22" className="text-indigo-600" />
                        </div>
                        <h1 className="text-3xl sm:text-4xl font-dm-sans text-[#111] tracking-tight">Practice</h1>
                    </div>
                    <p className="text-neutral-500 font-sans ml-[52px]">Choose a mode to start improving your pronunciation.</p>
                </div>

                {/* Mode Toggle Tabs */}
                <div className="flex bg-neutral-100 rounded-full p-1 w-fit mb-8 border border-neutral-200 shadow-sm">
                    <button
                        onClick={() => setTab('read-along')}
                        className={`px-6 py-2.5 rounded-full text-sm font-semibold font-sans transition-all duration-300 flex items-center gap-2 ${tab === 'read-along'
                            ? 'bg-white shadow-[0_2px_8px_rgba(0,0,0,0.08)] text-indigo-600'
                            : 'text-neutral-500 hover:text-[#111]'
                            }`}
                    >
                        <Icon icon="solar:book-2-linear" width="16" />
                        Read Along
                    </button>
                    <button
                        onClick={() => setTab('free-speak')}
                        className={`px-6 py-2.5 rounded-full text-sm font-semibold font-sans transition-all duration-300 flex items-center gap-2 ${tab === 'free-speak'
                            ? 'bg-white shadow-[0_2px_8px_rgba(0,0,0,0.08)] text-indigo-600'
                            : 'text-neutral-500 hover:text-[#111]'
                            }`}
                    >
                        <Icon icon="solar:microphone-3-bold-duotone" width="16" />
                        Free Speak
                    </button>
                </div>

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

                {/* Free Speak Mode */}
                {tab === 'free-speak' && (
                    <div className="page-enter">
                        <FreeSpeakMode />
                    </div>
                )}
            </div>
        </div>
    );
};

export default Practice;
