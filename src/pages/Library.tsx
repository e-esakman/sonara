import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@iconify/react';
import passages, { categories } from '../data/passages';
import type { Passage } from '../data/passages';

const difficultyColor: Record<string, string> = {
    Beginner: 'bg-emerald-500',
    Intermediate: 'bg-amber-500',
    Advanced: 'bg-rose-500',
};

const Library = () => {
    const [activeCategory, setActiveCategory] = useState<string>('All');
    const [activeDifficulty, setActiveDifficulty] = useState<string>('All');

    const filtered = passages.filter(p => {
        if (activeCategory !== 'All' && p.category !== activeCategory) return false;
        if (activeDifficulty !== 'All' && p.difficulty !== activeDifficulty) return false;
        return true;
    });

    return (
        <div className="pt-24 min-h-screen bg-neutral-50 pb-20">
            <div className="max-w-7xl mx-auto px-6">
                {/* Header */}
                <div className="mb-10">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center">
                            <Icon icon="solar:library-linear" width="22" className="text-indigo-600" />
                        </div>
                        <h1 className="text-4xl font-dm-sans text-[#111] tracking-tight">Reading Library</h1>
                    </div>
                    <p className="text-neutral-500 font-sans ml-[52px]">Choose a passage and practice your pronunciation with AI coaching.</p>
                </div>

                {/* Filters */}
                <div className="flex flex-col md:flex-row gap-4 mb-10">
                    <div className="flex flex-wrap gap-2">
                        {['All', ...categories].map(cat => (
                            <button
                                key={cat}
                                onClick={() => setActiveCategory(cat)}
                                className={`px-4 py-2 rounded-full text-sm font-sans font-medium transition-all duration-200 ${activeCategory === cat
                                    ? 'bg-[#111] text-white shadow-md shadow-neutral-200'
                                    : 'bg-white text-neutral-600 border border-neutral-200 hover:border-neutral-300 hover:shadow-sm'
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                    <div className="flex gap-2 md:ml-auto">
                        {['All', 'Beginner', 'Intermediate', 'Advanced'].map(diff => (
                            <button
                                key={diff}
                                onClick={() => setActiveDifficulty(diff)}
                                className={`px-4 py-2 rounded-full text-sm font-sans font-medium transition-all duration-200 ${activeDifficulty === diff
                                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-sm'
                                    : 'bg-white text-neutral-600 border border-neutral-200 hover:border-neutral-300'
                                    }`}
                            >
                                {diff}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Bookshelf */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-6 gap-y-10">
                    {filtered.map((passage: Passage) => (
                        <Link
                            to={`/read/${passage.id}`}
                            key={passage.id}
                            className="group"
                        >
                            {/* Book Card — 3D perspective */}
                            <div className="book-card book-spine">
                                <div className={`bg-gradient-to-br ${passage.gradient} rounded-2xl h-64 sm:h-72 flex flex-col justify-between relative overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.12)] group-hover:shadow-[0_16px_50px_rgba(0,0,0,0.2)] transition-shadow duration-400`}>
                                    {/* Decorative circles */}
                                    <div className="absolute -top-10 -right-10 w-36 h-36 bg-white/10 rounded-full pointer-events-none" />
                                    <div className="absolute -bottom-8 -left-8 w-28 h-28 bg-white/5 rounded-full pointer-events-none" />
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-white/5 rounded-full pointer-events-none" />

                                    {/* Top: Badge + Emoji */}
                                    <div className="flex justify-between items-start p-5 relative z-10">
                                        <span className={`text-[10px] font-bold uppercase tracking-wider text-white px-2.5 py-1 rounded-full ${difficultyColor[passage.difficulty]} bg-opacity-90`}>
                                            {passage.difficulty}
                                        </span>
                                        <span className="text-3xl opacity-70 drop-shadow-sm select-none">{passage.coverEmoji || '📘'}</span>
                                    </div>

                                    {/* Bottom: Title + Meta */}
                                    <div className="relative z-10 p-5 pt-0">
                                        <h3 className="text-lg font-dm-sans text-white font-semibold leading-snug mb-2 line-clamp-2 drop-shadow-sm">
                                            {passage.title}
                                        </h3>
                                        <div className="flex items-center gap-3 text-[11px] text-white/70 font-sans">
                                            <span className="flex items-center gap-1">
                                                <Icon icon="solar:clock-circle-linear" width="12" />
                                                {passage.readingTime}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Icon icon="solar:text-linear" width="12" />
                                                {passage.wordCount}w
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Category label below */}
                            <div className="mt-3 px-1">
                                <p className="text-[11px] text-neutral-400 font-sans uppercase tracking-wider truncate">{passage.category}</p>
                            </div>
                        </Link>
                    ))}
                </div>

                {filtered.length === 0 && (
                    <div className="text-center py-20">
                        <Icon icon="solar:book-2-linear" width="48" className="text-neutral-300 mx-auto mb-4" />
                        <p className="text-neutral-500 font-sans">No passages match the selected filters.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Library;
