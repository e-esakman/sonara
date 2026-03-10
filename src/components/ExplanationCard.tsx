import { Icon } from '@iconify/react';
import type { AnalysisResult } from '../services/geminiService';

interface ExplanationCardProps {
    analysis: AnalysisResult | null;
}

const ExplanationCard = ({ analysis }: ExplanationCardProps) => {
    if (!analysis) {
        return (
            <div className="bg-white rounded-3xl p-8 shadow-[0_20px_40px_rgb(0,0,0,0.06)] border border-neutral-100 max-w-sm mx-auto flex items-center justify-center min-h-[300px]">
                <p className="text-neutral-500 font-sans text-sm text-center">Speak to see your detailed pronunciation analysis here.</p>
            </div>
        );
    }

    const { incorrectWords, phoneticBreakdown, tips, accentInfluence, suggestions, accuracyScore } = analysis;

    // Use the first incorrect word as the primary focus, or fallback if none.
    const selectedWord = incorrectWords.length > 0 ? incorrectWords[0] : 'Excellent!';
    const phonetic = phoneticBreakdown && phoneticBreakdown[selectedWord] ? phoneticBreakdown[selectedWord] : '---';

    return (
        <div className="bg-white rounded-3xl p-8 shadow-[0_20px_40px_rgb(0,0,0,0.06)] border border-neutral-100 rotate-2 hover:rotate-0 transition-transform duration-500 max-w-sm mx-auto flex flex-col gap-6">
            <div className="flex justify-between items-start border-b border-neutral-100 pb-4">
                <span className="text-sm font-medium text-neutral-400 uppercase tracking-tight font-sans">Analysis</span>
                <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-2 flex items-center gap-1 rounded font-sans">
                    Score: {accuracyScore}%
                </span>
            </div>

            {incorrectWords.length > 0 ? (
                <>
                    <div>
                        <h4 className="text-neutral-500 text-xs uppercase tracking-tight mb-1 font-sans">Focus Word</h4>
                        <p className="text-2xl tracking-tight text-[#111] font-normal font-dm-sans text-rose-500">{selectedWord}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <h4 className="text-neutral-500 text-xs uppercase tracking-tight mb-1 font-sans">Phonetic</h4>
                            <p className="text-base font-medium text-indigo-600 bg-indigo-50 inline-block px-2 py-0.5 rounded font-sans">{phonetic}</p>
                        </div>
                        {accentInfluence && (
                            <div>
                                <h4 className="text-neutral-500 text-xs uppercase tracking-tight mb-1 font-sans">Accent</h4>
                                <p className="text-sm font-medium text-[#111] font-sans truncate" title={accentInfluence}>{accentInfluence}</p>
                            </div>
                        )}
                    </div>

                    <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100/50 flex flex-col gap-2">
                        <h4 className="text-amber-700 text-xs font-medium uppercase tracking-tight flex items-center gap-1.5 font-sans">
                            <Icon icon="solar:lightbulb-linear" width="16" />
                            Tip
                        </h4>
                        <p className="text-sm text-amber-900 leading-relaxed font-sans">{tips[0] || 'Try practicing the tricky sounds slowly.'}</p>
                        {suggestions && suggestions.length > 0 && (
                            <p className="text-sm text-amber-800 leading-relaxed font-sans italic mt-2 border-t border-amber-200 pt-2">
                                Accent hint: {suggestions[0]}
                            </p>
                        )}
                    </div>
                </>
            ) : (
                <div className="flex flex-col items-center justify-center flex-1 gap-4 text-center">
                    <Icon icon="solar:check-circle-bold-duotone" width="64" className="text-emerald-500" />
                    <h3 className="text-xl font-dm-sans text-[#111]">Perfect Pronunciation!</h3>
                    <p className="text-sm text-neutral-500 font-sans">Your accent sounds extremely natural.</p>
                </div>
            )}
        </div>
    );
}

export default ExplanationCard;
