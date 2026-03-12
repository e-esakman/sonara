import { Link } from 'react-router-dom';
import { Icon } from '@iconify/react';
import type { Passage } from '../data/passages';

interface Props {
    passage: Passage;
}

const getDifficultyColors = (diff: string) => {
    switch (diff) {
        case 'Beginner': return 'bg-emerald-100 text-emerald-700';
        case 'Intermediate': return 'bg-amber-100 text-amber-700';
        case 'Advanced': return 'bg-rose-100 text-rose-700';
        default: return 'bg-gray-100 text-gray-700';
    }
};

const renderPattern = (type: string, accent: string) => {
    switch (type) {
        case 'grid':
            return (
                <div className="absolute -bottom-10 right-10 w-8 h-64 mix-blend-multiply rotate-[22deg] z-0 opacity-40" style={{ backgroundColor: accent }}>
                    <div className="w-full h-full opacity-30" style={{ backgroundImage: `linear-gradient(${accent} 1px, transparent 1px), linear-gradient(90deg, ${accent} 1px, transparent 1px)`, backgroundSize: '8px 8px' }}></div>
                </div>
            );
        case 'wave':
            return (
                <>
                    <div className="absolute top-[55%] -left-8 w-[120%] h-12 -rotate-12 z-10 blur-[0.5px]" style={{ backgroundColor: `${accent}E6` }}></div>
                    <svg className="absolute bottom-10 left-8 w-32 h-16 z-0" viewBox="0 0 100 50" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M0 25 Q 25 50, 50 25 T 100 25" stroke={accent} strokeWidth="3" strokeLinecap="round" fill="none" />
                    </svg>
                </>
            );
        case 'curve':
            return (
                <svg className="absolute bottom-12 left-8 w-32 h-16 z-0" viewBox="0 0 100 50" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M0 40 Q 25 10, 50 40 T 100 20" stroke={accent} strokeWidth="3" strokeLinecap="round" fill="none" />
                </svg>
            );
        case 'tilt':
            return (
                <>
                    <div className="absolute top-[50%] -left-8 w-[120%] h-16 bg-gray-300/60 -rotate-[15deg] z-10 mix-blend-multiply"></div>
                    <svg className="absolute bottom-10 left-8 w-32 h-16 z-0" viewBox="0 0 100 50" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M0 25 Q 30 50, 60 20 T 110 30" stroke={accent} strokeWidth="3" strokeLinecap="round" fill="none" />
                    </svg>
                </>
            );
        case 'radial':
            return (
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent"></div>
            );
        case 'split':
            return (
                <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent mix-blend-overlay pointer-events-none"></div>
            );
        case 'circle':
            return (
                <div className="absolute -bottom-12 -left-12 w-48 h-48 border-[20px] rounded-full z-0" style={{ borderColor: `${accent}1A` }}></div>
            );
        case 'corner':
            return (
                <>
                    <div className="absolute top-0 right-0 w-32 h-32 rounded-bl-full z-0" style={{ backgroundColor: `${accent}33` }}></div>
                    <div className="absolute bottom-12 left-8 w-16 h-16 rounded-full z-0" style={{ backgroundColor: `${accent}26` }}></div>
                </>
            );
        case 'dots':
            return (
                <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(0,0,0,0.02)_50%,transparent_75%,transparent_100%)] bg-[length:20px_20px]"></div>
            );
        case 'gradient-fade':
            return (
                <div className="absolute bottom-0 right-0 w-full h-full bg-gradient-to-tr to-transparent z-0" style={{ '--tw-gradient-from': `${accent}26` } as any}></div>
            );
        default:
            return null;
    }
};

const BookCard = ({ passage }: Props) => {
    // Generate inner color slightly lighter than cover
    return (
        <Link to={`/read/${passage.id}`} className="group flex flex-col gap-4 w-full max-w-[220px] mx-auto outline-none">
            <div
                className="relative h-[320px] rounded-[22px] p-3 transition-all duration-500 ease-out group-hover:-translate-y-2 group-hover:rotate-[0.5deg] hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.18)] before:absolute before:inset-y-3 before:-left-2 before:w-3 before:rounded-l-[12px] before:bg-black/8 before:opacity-80"
                style={{ backgroundColor: passage.coverColor }}
            >
                <div
                    className="relative h-full w-full rounded-[16px] shadow-[0_8px_20px_rgba(0,0,0,0.08)] overflow-hidden flex flex-col bg-white/90"
                    style={{ backgroundColor: passage.innerColor || '#FFFFFF' }}
                >
                    <h3
                        className="text-xl font-bold tracking-tight mt-6 ml-6 z-10 font-dm-sans"
                        style={{ color: passage.accentColor }}
                    >
                        {passage.title.split(' ').map((word, i) => (
                            <span key={i}>{word}<br /></span>
                        ))}
                    </h3>

                    {renderPattern(passage.patternType, passage.accentColor)}
                </div>
            </div>

            <div className="px-1 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-xs text-gray-500 uppercase tracking-widest font-medium">
                    <span className={`${getDifficultyColors(passage.difficulty)} px-2.5 py-1 rounded-full`}>
                        {passage.difficulty}
                    </span>
                    <span>•</span>
                    <span>{passage.category}</span>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-600 mt-1 font-sans">
                    <span className="flex items-center gap-1.5"><Icon icon="solar:clock-circle-linear" width="16" /> {passage.readingTime}</span>
                    <span className="flex items-center gap-1.5"><Icon icon="solar:document-text-linear" width="16" /> {passage.wordCount}w</span>
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                    Practice Reading <Icon icon="solar:arrow-right-linear" className="group-hover:translate-x-1 transition-transform" />
                </div>
            </div>
        </Link>
    );
};

export default BookCard;
