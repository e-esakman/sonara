
const Footer = () => {
    return (
        <footer className="w-full py-24 flex flex-col items-center justify-center border-t border-stroke bg-bg relative overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-[800px] h-64 bg-pink-500/5 blur-[120px] rounded-full" />
            </div>

            <div className="z-10 text-center space-y-10">
                <h2 className="text-4xl font-display italic text-transparent bg-clip-text bg-gradient-to-r from-white to-pink-200">
                    Ready to sound your best?
                </h2>

                <button className="px-10 py-4 rounded-full bg-text text-bg font-medium transition-all duration-300 hover:scale-105 active:scale-95 hover:voice-gradient-border shadow-lg hover:shadow-pink-500/20 hover:text-pink-600 hover:bg-white text-base group cursor-pointer">
                    Get Started
                </button>

                <div className="pt-12 text-sm text-muted">
                    © {new Date().getFullYear()} NovaSpeak. Empowering global voices.
                </div>
            </div>
        </footer>
    );
};

export default Footer;
