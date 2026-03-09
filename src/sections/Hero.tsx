import OrbitRing from '../components/OrbitRing';

const Hero = () => {
    return (
        <section className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden">
            {/* Top Left Pill Context */}
            <div className="absolute top-8 left-8">
                <div className="text-xs rounded-full border border-stroke px-4 py-1 bg-surface font-medium tracking-wide">
                    NovaSpeak Engine
                </div>
            </div>

            {/* Main Container */}
            <div className="flex flex-col items-center justify-center space-y-12 z-10 w-full max-w-4xl mx-auto">

                {/* Title Area */}
                <div className="text-center space-y-4">
                    <h1 className="text-4xl md:text-6xl font-display italic tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
                        NOVA SPEAK
                    </h1>
                    <p className="text-muted font-body tracking-wide text-sm md:text-base max-w-md mx-auto">
                        Improve Your Pronunciation with AI
                    </p>
                </div>

                {/* Orbit Rings Visual */}
                <OrbitRing />

                {/* Tagline */}
                <div className="text-sm text-muted text-center max-w-md mx-auto space-y-2 mt-8">
                    <p>Read aloud.</p>
                    <p>Get instant corrections.</p>
                    <p className="voice-gradient-text font-medium text-base">Speak confidently.</p>
                </div>
            </div>
        </section>
    );
};

export default Hero;
