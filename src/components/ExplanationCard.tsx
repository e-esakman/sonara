
const ExplanationCard = () => {
    return (
        <div className="bg-surface border border-stroke rounded-xl p-6 max-w-sm mx-auto w-full space-y-4 hover:border-pink-500/30 transition-colors duration-500">
            <div className="text-text">
                <span className="font-bold">Word: </span>
                <span className="font-medium text-pink-100">seashore</span>
            </div>

            <div className="space-y-1">
                <div className="text-xs text-muted uppercase tracking-wider">Syllables</div>
                <div className="text-sm text-text font-medium">sea • shore</div>
            </div>

            <div className="space-y-1">
                <div className="text-xs text-muted uppercase tracking-wider">Phonetic</div>
                <div className="text-sm text-pink-200 bg-bg px-3 py-1.5 rounded-md inline-block font-mono border border-stroke">
                    /ˈsiːʃɔːr/
                </div>
            </div>

            <div className="pt-3 border-t border-stroke space-y-1">
                <div className="text-xs text-muted uppercase tracking-wider">Tip</div>
                <div className="text-sm text-text italic">
                    Stress the first syllable. Make sure the "sh" sound is distinct.
                </div>
            </div>
        </div>
    );
}

export default ExplanationCard;
