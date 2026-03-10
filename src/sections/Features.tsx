import { Icon } from '@iconify/react';

const features = [
    {
        icon: 'solar:soundwave-circle-linear',
        title: 'Real-time Pronunciation Feedback',
        description: 'Get instant corrections on your pronunciation as you speak. Words are highlighted green for correct and red for mispronounced.',
        hoverBg: 'group-hover:bg-indigo-50',
        hoverText: 'group-hover:text-indigo-600',
    },
    {
        icon: 'solar:chat-round-dots-linear',
        title: 'AI Live Coach Interaction',
        description: 'An AI coach analyzes your speech in real-time, providing scores, accent detection, phonetic breakdowns, and tailored coaching tips.',
        hoverBg: 'group-hover:bg-blue-50',
        hoverText: 'group-hover:text-blue-600',
    },
    {
        icon: 'solar:book-2-linear',
        title: 'Reading Practice with Books',
        description: 'Browse a library of 27 curated reading passages and tongue twisters across 5 difficulty levels and 8 categories.',
        hoverBg: 'group-hover:bg-emerald-50',
        hoverText: 'group-hover:text-emerald-600',
    },
    {
        icon: 'solar:chart-square-linear',
        title: 'Speech Analytics & Tracking',
        description: 'Visualize your improvement with real charts mapping pronunciation accuracy, fluency scores, speaking speed, and confidence over time.',
        hoverBg: 'group-hover:bg-amber-50',
        hoverText: 'group-hover:text-amber-600',
    },
    {
        icon: 'solar:history-linear',
        title: 'Session Replay & History',
        description: 'Review every practice session with audio replay, detailed score breakdowns, and compare your performance across attempts.',
        hoverBg: 'group-hover:bg-purple-50',
        hoverText: 'group-hover:text-purple-600',
    },
    {
        icon: 'solar:chat-round-like-linear',
        title: 'Tongue Twister Training',
        description: 'Improve articulation and speaking speed with classic tongue twisters designed to challenge your pronunciation and build muscle memory.',
        hoverBg: 'group-hover:bg-rose-50',
        hoverText: 'group-hover:text-rose-600',
    },
];

const Features = () => {
    return (
        <section id="features" className="w-full py-32 bg-white px-6">
            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-20">
                    <div className="text-sm font-medium tracking-tight text-neutral-400 mb-4 uppercase font-sans">
                        Features
                    </div>
                    <h2 className="text-4xl md:text-5xl font-dm-sans text-[#111] tracking-tight leading-tight max-w-2xl mx-auto">
                        Everything you need to speak with confidence
                    </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {features.map((feature, i) => (
                        <div key={i} className="group bg-neutral-50 hover:bg-white rounded-3xl p-8 border border-neutral-100 hover:border-neutral-200 hover:shadow-[0_20px_60px_rgba(0,0,0,0.06)] transition-all duration-300 cursor-default">
                            <div className={`w-14 h-14 rounded-2xl bg-[#F7F5F2] flex items-center justify-center text-neutral-500 ${feature.hoverBg} ${feature.hoverText} transition-colors duration-300 mb-6`}>
                                <Icon icon={feature.icon} width="28" />
                            </div>
                            <h4 className="text-xl tracking-tight text-[#111] font-medium font-dm-sans mb-3">{feature.title}</h4>
                            <p className="text-base text-neutral-500 leading-relaxed font-sans">
                                {feature.description}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Features;
