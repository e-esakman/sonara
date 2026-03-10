import { Icon } from '@iconify/react';
import { Link } from 'react-router-dom';

const Hero = () => {
    return (
        <header className="min-h-screen flex flex-col overflow-hidden w-full pt-32 relative items-center justify-center">

            {/* Circular Voice Rings */}
            <div className="relative w-[26rem] h-[26rem] md:w-[32rem] md:h-[32rem] flex justify-center items-center mb-10 mt-8">

                {/* Center Mic */}
                <button className="mic-pulse absolute z-20 w-16 h-16 bg-white rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.08)] flex items-center justify-center text-[#111] border border-neutral-100 hover:scale-110 transition-transform duration-300">
                    <Icon icon="solar:microphone-2-linear" width="28" />
                </button>

                {/* Ring 1 (Inner) */}
                <div className="absolute w-[14rem] h-[14rem] md:w-[16rem] md:h-[16rem] border border-[#E0E0FF] rounded-full ring-1">
                    <div className="absolute top-0 left-1/2 bg-white/80 backdrop-blur px-3 py-1 rounded-full shadow-sm border border-neutral-100 text-xs font-medium text-indigo-900 ring-1-token whitespace-nowrap font-sans">
                        Hola
                    </div>
                    <div className="absolute bottom-0 left-1/2 bg-white/80 backdrop-blur px-3 py-1 rounded-full shadow-sm border border-neutral-100 text-xs font-medium text-indigo-900 ring-1-token whitespace-nowrap font-sans">
                        Bonjour
                    </div>
                </div>

                {/* Ring 2 (Middle) */}
                <div className="absolute w-[20rem] h-[20rem] md:w-[24rem] md:h-[24rem] border border-[#D4EBF8] rounded-full ring-2">
                    <div className="absolute top-1/2 -left-4 bg-white/80 backdrop-blur px-3 py-1 rounded-full shadow-sm border border-neutral-100 text-xs font-medium text-blue-900 ring-2-token whitespace-nowrap font-sans">
                        안녕하세요
                    </div>
                    <div className="absolute top-1/2 -right-4 bg-white/80 backdrop-blur px-3 py-1 rounded-full shadow-sm border border-neutral-100 text-xs font-medium text-blue-900 ring-2-token whitespace-nowrap font-sans">
                        नमस्ते
                    </div>
                </div>

                {/* Ring 3 (Outer) */}
                <div className="absolute w-[26rem] h-[26rem] md:w-[32rem] md:h-[32rem] border border-[#FDF4DC] rounded-full ring-3">
                    <div className="absolute top-1/4 -right-2 bg-white/80 backdrop-blur px-3 py-1 rounded-full shadow-sm border border-neutral-100 text-xs font-medium text-yellow-900 ring-3-token whitespace-nowrap font-sans">
                        你好
                    </div>
                    <div className="absolute bottom-1/4 -left-2 bg-white/80 backdrop-blur px-3 py-1 rounded-full shadow-sm border border-neutral-100 text-xs font-medium text-yellow-900 ring-3-token whitespace-nowrap font-sans">
                        Sí
                    </div>
                    <div className="absolute -bottom-4 left-1/2 bg-white/80 backdrop-blur px-3 py-1 rounded-full shadow-sm border border-neutral-100 text-xs font-medium text-yellow-900 ring-3-token whitespace-nowrap font-sans">
                        OK
                    </div>
                </div>
            </div>

            {/* Typography */}
            <div className="relative z-10 text-center max-w-3xl px-6">
                <h1 className="text-4xl md:text-6xl tracking-tight text-[#111] leading-[1.15] mb-5 font-dm-sans font-light">
                    Speak clearly.<br />
                    Speak confidently.
                </h1>
                <p className="text-base md:text-lg text-neutral-500 leading-relaxed max-w-xl mx-auto mb-8 font-normal font-dm-sans">
                    Sonara is an AI pronunciation coach that listens, analyzes your speech, and helps you sound natural in any language.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <Link to="/library" className="w-full sm:w-auto bg-[#111] text-white px-8 py-4 rounded-full font-medium tracking-tight hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2 font-sans">
                        Start speaking
                        <Icon icon="solar:arrow-right-linear" width="20" />
                    </Link>
                    <Link to="/practice" className="w-full sm:w-auto bg-white text-[#111] border border-neutral-200 px-8 py-4 rounded-full font-medium tracking-tight hover:bg-neutral-50 transition-colors flex items-center justify-center gap-2 font-sans">
                        Try quick practice
                    </Link>
                </div>
            </div>
        </header>
    );
};

export default Hero;
