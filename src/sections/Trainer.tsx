import { Icon } from '@iconify/react';

const Trainer = () => {
    return (
        <section className="w-full pr-6 pb-32 pl-6">
            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">

                {/* Trainer Card */}
                <div className="lg:col-span-7 bg-white rounded-3xl p-8 md:p-12 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-neutral-100 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

                    <div className="text-center mb-16 relative z-10">
                        <div className="text-3xl md:text-4xl font-medium tracking-tight text-[#111] flex flex-wrap justify-center gap-x-3 gap-y-4 mb-6">
                            <div className="flex flex-col items-center gap-2">
                                <span className="font-normal font-dm-sans">She</span>
                                <Icon icon="solar:check-circle-linear" className="text-emerald-500 text-base" />
                            </div>
                            <div className="flex flex-col items-center gap-2">
                                <span className="font-normal font-dm-sans">sells</span>
                                <Icon icon="solar:check-circle-linear" className="text-emerald-500 text-base" />
                            </div>
                            <div className="flex flex-col items-center gap-2">
                                <span className="text-rose-500 border-b-2 border-rose-500/30 pb-1 font-normal font-dm-sans">seashells</span>
                                <Icon icon="solar:close-circle-linear" className="text-rose-500 text-base" />
                            </div>
                            <div className="flex flex-col items-center gap-2">
                                <span className="font-normal font-dm-sans">by</span>
                                <Icon icon="solar:check-circle-linear" className="text-emerald-500 text-base" />
                            </div>
                            <div className="flex flex-col items-center gap-2">
                                <span className="font-normal font-dm-sans">the</span>
                                <Icon icon="solar:check-circle-linear" className="text-emerald-500 text-base" />
                            </div>
                            <div className="flex flex-col items-center gap-2 relative">
                                <span className="text-amber-500 border-b-2 border-amber-500/30 pb-1 font-normal font-dm-sans">seashore.</span>
                                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1"></div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-center items-center gap-6 relative z-10">
                        <button className="w-12 h-12 flex items-center justify-center rounded-full bg-neutral-100 text-neutral-600 hover:bg-neutral-200 transition-colors">
                            <Icon icon="solar:volume-loud-linear" width="24" />
                        </button>
                        <button className="w-16 h-16 flex items-center justify-center rounded-full bg-[#111] text-white shadow-lg hover:scale-105 transition-transform">
                            <Icon icon="solar:microphone-2-linear" width="28" />
                        </button>
                        <button className="w-12 h-12 flex items-center justify-center rounded-full bg-neutral-100 text-neutral-600 hover:bg-neutral-200 transition-colors">
                            <Icon icon="solar:play-linear" width="24" />
                        </button>
                    </div>
                    <div className="text-center mt-6 text-sm text-neutral-500 font-medium font-sans">
                        Tap to start recording
                    </div>
                </div>

                {/* Word Explanation Card */}
                <div className="lg:col-span-5 relative">
                    <div className="bg-white rounded-3xl p-8 shadow-[0_20px_40px_rgb(0,0,0,0.06)] border border-neutral-100 rotate-2 hover:rotate-0 transition-transform duration-500 max-w-sm mx-auto">
                        <div className="flex justify-between items-start mb-6 border-b border-neutral-100 pb-4">
                            <span className="text-sm font-medium text-neutral-400 uppercase tracking-tight font-sans">Analysis</span>
                            <Icon icon="solar:info-circle-linear" className="text-neutral-400" width="20" />
                        </div>

                        <div className="mb-6">
                            <h4 className="text-neutral-500 text-xs uppercase tracking-tight mb-1 font-sans">Word</h4>
                            <p className="text-2xl tracking-tight text-[#111] font-normal font-dm-sans">seashore</p>
                        </div>

                        <div className="grid grid-cols-2 gap-6 mb-6">
                            <div>
                                <h4 className="text-neutral-500 text-xs uppercase tracking-tight mb-1 font-sans">Syllables</h4>
                                <p className="text-base font-medium text-[#111] font-sans">sea • shore</p>
                            </div>
                            <div>
                                <h4 className="text-neutral-500 text-xs uppercase tracking-tight mb-1 font-sans">Phonetic</h4>
                                <p className="text-base font-medium text-indigo-600 bg-indigo-50 inline-block px-2 py-0.5 rounded font-sans">/ˈsiːʃɔːr/</p>
                            </div>
                        </div>

                        <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100/50">
                            <h4 className="text-amber-700 text-xs font-medium uppercase tracking-tight mb-2 flex items-center gap-1.5 font-sans">
                                <Icon icon="solar:lightbulb-linear" width="16" />
                                Tip
                            </h4>
                            <p className="text-sm text-amber-900 leading-relaxed font-sans">Stress the first syllable. Ensure the "sh" sound is distinct from the "s".</p>
                        </div>
                    </div>
                </div>

            </div>
        </section>
    );
};

export default Trainer;
