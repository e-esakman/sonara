import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { Play } from 'lucide-react';
import { motion } from 'framer-motion';

const OrbitRing = () => {
    const ring1Ref = useRef<HTMLDivElement>(null);
    const ring2Ref = useRef<HTMLDivElement>(null);
    const ring3Ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const ctx = gsap.context(() => {
            if (ring1Ref.current) gsap.to(ring1Ref.current, { rotation: 360, duration: 30, repeat: -1, ease: 'linear' });
            if (ring2Ref.current) gsap.to(ring2Ref.current, { rotation: -360, duration: 20, repeat: -1, ease: 'linear' });
            if (ring3Ref.current) gsap.to(ring3Ref.current, { rotation: 360, duration: 12, repeat: -1, ease: 'linear' });
        });
        return () => ctx.revert();
    }, []);

    return (
        <div className="relative w-[380px] h-[380px] flex items-center justify-center">
            {/* Background blobs */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="absolute w-64 h-64 bg-gradient-to-r from-white via-pink-400 to-white rounded-full blur-[80px] opacity-30 animate-voice-wave" />
            </div>

            <div ref={ring1Ref} className="absolute border border-stroke rounded-full w-80 h-80 flex items-center justify-center">
                <motion.span className="absolute -top-3 text-sm text-muted font-medium bg-bg px-1" animate={{ rotate: -360 }} transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}>अ</motion.span>
                <motion.span className="absolute -bottom-3 text-sm text-muted font-medium bg-bg px-1" animate={{ rotate: -360 }} transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}>あ</motion.span>
                <motion.span className="absolute -left-3 text-sm text-muted font-medium bg-bg px-1" animate={{ rotate: -360 }} transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}>Ok</motion.span>
            </div>

            <div ref={ring2Ref} className="absolute border border-stroke rounded-full w-64 h-64 flex items-center justify-center">
                <motion.span className="absolute -right-3 text-sm text-muted font-medium bg-bg px-1" animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}>한</motion.span>
                <motion.span className="absolute -left-3 text-sm text-muted font-medium bg-bg px-1" animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}>Hola</motion.span>
            </div>

            <div ref={ring3Ref} className="absolute border border-stroke rounded-full w-48 h-48 flex items-center justify-center">
                <motion.span className="absolute -top-3 text-sm text-muted font-medium bg-bg px-1" animate={{ rotate: -360 }} transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}>H</motion.span>
                <motion.span className="absolute -bottom-3 text-sm text-muted font-medium bg-bg px-1" animate={{ rotate: -360 }} transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}>Sí</motion.span>
                <motion.span className="absolute -right-3 text-sm text-muted font-medium bg-bg px-1" animate={{ rotate: -360 }} transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}>你好</motion.span>
            </div>

            <button
                className="relative w-14 h-14 rounded-full flex items-center justify-center bg-surface border border-stroke hover:scale-110 active:scale-95 transition-all duration-300 hover:voice-gradient-border z-10 group"
                aria-label="Play Example"
            >
                <div className="absolute inset-0 rounded-full group-hover:animate-ping opacity-0 group-hover:opacity-20 bg-pink-100 duration-700" />
                <Play className="w-5 h-5 text-text group-hover:text-pink-300 transition-colors ml-1" />
            </button>
        </div>
    );
};

export default OrbitRing;
