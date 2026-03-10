import { useState } from 'react';
import { Icon } from '@iconify/react';
import { speakText } from '../utils/tts';

interface Props {
    word: string;
    phonetic?: string;
    accentStyle: 'American' | 'British' | 'Indian';
}

const PronunciationMockup = ({ word, phonetic = 'kawn·fuh·dns', accentStyle }: Props) => {
    const [isSlow, setIsSlow] = useState(false);

    const playAudio = () => {
        speakText({
            text: word,
            accentStyle,
            rate: isSlow ? 0.4 : 0.9
        });
    };

    return (
        <div className="bg-[#202124] text-white rounded-2xl p-5 border border-neutral-700/50 flex items-center justify-between w-full mt-3 overflow-hidden font-sans">
            <div className="flex flex-col gap-1 items-start">
                <span className="text-neutral-400 text-xs tracking-wide">Sounds like</span>
                <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold font-dm-sans">{phonetic}</span>
                    <button
                        onClick={playAudio}
                        className="text-neutral-300 hover:text-white transition-colors"
                        title="Listen to pronunciation"
                    >
                        <Icon icon="solar:volume-loud-bold" width="24" />
                    </button>
                </div>

                <div className="flex items-center gap-2 mt-4 opacity-80 hover:opacity-100 transition-opacity cursor-pointer" onClick={() => setIsSlow(!isSlow)}>
                    <div className={`w-8 h-4 rounded-full flex items-center transition-colors ${isSlow ? 'bg-indigo-500' : 'bg-neutral-600'}`}>
                        <div className={`w-3 h-3 bg-white rounded-full mx-0.5 transition-transform ${isSlow ? 'translate-x-4' : 'translate-x-0'}`} />
                    </div>
                    <span className="text-xs font-semibold">Slow</span>
                </div>
            </div>

            <div className="relative w-24 h-24 bg-[#E8F0FE] rounded-2xl overflow-hidden shadow-inner flex items-center justify-center border border-indigo-100/10">
                <img
                    src="/lips_mockup.png"
                    alt="Mouth pronouncing"
                    className="w-[120%] h-[120%] object-cover object-center translate-y-2 mix-blend-multiply opacity-80"
                    loading="lazy"
                />
                <span className="absolute bottom-1 right-2 text-[8px] text-indigo-400 font-semibold italic">Feedback</span>
            </div>
        </div>
    );
};

export default PronunciationMockup;
