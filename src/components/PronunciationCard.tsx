import { Icon } from '@iconify/react';

interface PronunciationCardProps {
    expectedText: string;
    incorrectWords: string[];
    isRecording: boolean;
    isSupported: boolean;
    isAnalyzing: boolean;
    onStartRecording: () => void;
    onReplayExpected: () => void;
}

const PronunciationCard = ({
    expectedText,
    incorrectWords,
    isRecording,
    isAnalyzing,
    isSupported,
    onStartRecording,
    onReplayExpected
}: PronunciationCardProps) => {

    const words = expectedText.split(' ');

    // Normalize word for checking
    const checkWord = (word: string) => {
        const clean = word.toLowerCase().replace(/[.,!?]/g, '');
        return incorrectWords.map(w => w.toLowerCase()).includes(clean);
    };

    return (
        <div className="bg-white rounded-3xl p-8 md:p-12 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-neutral-100 relative overflow-hidden h-full flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

            <div className="text-center mb-16 relative z-10">
                <div className="text-3xl md:text-4xl font-medium tracking-tight text-[#111] flex flex-wrap justify-center gap-x-3 gap-y-4 mb-6">
                    {words.map((word, idx) => {
                        const isIncorrect = incorrectWords.length > 0 && checkWord(word);
                        const isCorrect = incorrectWords.length > 0 && !isIncorrect;

                        return (
                            <div key={idx} className="flex flex-col items-center gap-2 relative">
                                <span className={`font-normal font-dm-sans ${isIncorrect ? 'text-rose-500 border-b-2 border-rose-500/30 pb-1' : (isCorrect ? 'text-emerald-700' : '')}`}>
                                    {word}
                                </span>
                                {isCorrect && <Icon icon="solar:check-circle-linear" className="text-emerald-500 text-base" />}
                                {isIncorrect && <Icon icon="solar:close-circle-linear" className="text-rose-500 text-base" />}
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="flex justify-center items-center gap-6 relative z-10 mt-auto">
                <button
                    onClick={onReplayExpected}
                    className="w-12 h-12 flex items-center justify-center rounded-full bg-neutral-100 text-neutral-600 hover:bg-neutral-200 transition-colors"
                    disabled={isRecording}
                >
                    <Icon icon="solar:volume-loud-linear" width="24" />
                </button>
                <button
                    onClick={onStartRecording}
                    className={`w-16 h-16 flex items-center justify-center rounded-full text-white shadow-lg transition-transform ${isRecording ? 'bg-rose-500 mic-pulse scale-110' : 'bg-[#111] hover:scale-105'}`}
                    disabled={isRecording || isAnalyzing || !isSupported}
                >
                    <Icon icon="solar:microphone-2-linear" width="28" />
                </button>
                <button className="w-12 h-12 flex items-center justify-center rounded-full bg-neutral-100 text-neutral-600 hover:bg-neutral-200 transition-colors">
                    <Icon icon="solar:play-linear" width="24" />
                </button>
            </div>

            <div className="text-center mt-6 text-sm font-medium font-sans min-h-[20px]">
                {!isSupported && <span className="text-rose-500">Speech recognition not supported in your browser</span>}
                {isRecording && <span className="text-rose-500 animate-pulse">Listening...</span>}
                {isAnalyzing && <span className="text-indigo-500 animate-pulse">Analyzing pronunciation with AI...</span>}
                {!isRecording && !isAnalyzing && isSupported && <span className="text-neutral-500">Tap to start recording</span>}
            </div>
        </div>
    );
}

export default PronunciationCard;
