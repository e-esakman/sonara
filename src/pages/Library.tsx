import { useState } from 'react';
import { Icon } from '@iconify/react';
import passages, { categories } from '../data/passages';
import type { Passage } from '../data/passages';
import BookCard from '../components/BookCard';


const Library = () => {
    const [activeCategory, setActiveCategory] = useState<string>('All');
    const [activeDifficulty, setActiveDifficulty] = useState<string>('All');

    const filtered = passages.filter((p: Passage) => {
        if (activeCategory !== 'All' && p.category !== activeCategory) return false;
        if (activeDifficulty !== 'All' && p.difficulty !== activeDifficulty) return false;
        return true;
    });

    return (
        <div className="bg-[#FAFAFA] text-gray-900 antialiased min-h-screen pt-36 pb-20 selection:bg-gray-200 font-sans">
            <div className="max-w-[90rem] mx-auto">
                {/* Filters Proper Section */}
                <div className="px-6 md:px-12 mb-12">
                    <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200 shadow-sm flex flex-col lg:flex-row gap-8 lg:gap-12">
                        <div className="flex-1">
                            <h3 className="text-sm font-semibold text-gray-900 mb-4 tracking-tight font-dm-sans uppercase">Categories</h3>
                            <div className="flex flex-wrap gap-2">
                                {['All', ...categories].map((cat) => (
                                    <button
                                        key={cat}
                                        onClick={() => setActiveCategory(cat)}
                                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${activeCategory === cat
                                            ? 'bg-gray-900 text-white shadow-md shadow-gray-200'
                                            : 'bg-gray-50 text-gray-600 border border-gray-200 hover:border-gray-300 hover:bg-white hover:shadow-sm'
                                            }`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="lg:w-72 shrink-0">
                            <h3 className="text-sm font-semibold text-gray-900 mb-4 tracking-tight font-dm-sans uppercase">Difficulty</h3>
                            <div className="flex flex-wrap gap-2">
                                {['All', 'Beginner', 'Intermediate', 'Advanced'].map((diff) => (
                                    <button
                                        key={diff}
                                        onClick={() => setActiveDifficulty(diff)}
                                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${activeDifficulty === diff
                                            ? 'bg-gray-900 text-white shadow-md shadow-gray-200'
                                            : 'bg-gray-50 text-gray-600 border border-gray-200 hover:border-gray-300 hover:bg-white hover:shadow-sm'
                                            }`}
                                    >
                                        {diff}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bookshelf Grid */}
                {filtered.length > 0 ? (
                    <div className="px-6 md:px-12 pb-16 pt-2">
                        <div className="rounded-[36px] border border-[#e6e0d8] bg-[linear-gradient(180deg,#f8f5ef_0%,#f4eee6_100%)] p-6 shadow-sm">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-x-8 gap-y-12">
                                {filtered.map((passage: Passage) => (
                                    <div key={passage.id} className="w-full">
                                        <BookCard passage={passage} />
                                    </div>
                                ))}
                            </div>
                            <div className="mt-6 h-4 rounded-full bg-[linear-gradient(180deg,#cabaa6_0%,#b7a38f_100%)] shadow-[inset_0_2px_4px_rgba(255,255,255,0.35)]" />
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-20 px-6 md:px-12">
                        <Icon icon="lucide:book-x" className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 text-lg">No passages match the selected filters.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Library;
