import { Icon } from '@iconify/react';

const Navigation = () => {
    return (
        <nav className="fixed top-0 left-0 w-full z-50 px-6 py-4 flex justify-between items-center bg-white/40 backdrop-blur-md border-b border-neutral-200/50 transition-all">
            <a href="#" className="text-xl tracking-tight text-[#111] flex items-center gap-2 font-normal font-dm-sans">
                <Icon icon="solar:soundwave-linear" width="24" />
                Sonara
            </a>

            <div className="hidden md:flex gap-8 text-sm font-normal text-neutral-600">
                <a href="#" className="hover:text-[#111] transition-colors font-sans">Home</a>
                <a href="#how-it-works" className="hover:text-[#111] transition-colors font-sans">How it works</a>
                <a href="#progress" className="hover:text-[#111] transition-colors font-sans">Progress</a>
                <a href="#features" className="hover:text-[#111] transition-colors font-sans">Features</a>
            </div>

            <div className="flex items-center gap-6 text-sm font-medium">
                <a href="#" className="hidden md:block text-neutral-600 hover:text-[#111] transition-colors font-sans">Sign in</a>
                <button className="bg-[#111] text-white px-5 py-2.5 rounded-full hover:bg-neutral-800 transition-colors tracking-tight font-sans">
                    Get Started
                </button>
            </div>
        </nav>
    );
};

export default Navigation;
