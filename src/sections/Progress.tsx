import { Icon } from '@iconify/react';

const Progress = () => {
    return (
        <section id="progress" className="w-full py-32 px-6">
            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12">

                {/* Dashboard */}
                <div className="flex flex-col gap-6">
                    <div className="text-sm font-medium tracking-tight text-neutral-400 mb-2 uppercase font-sans">Dashboard</div>
                    <h3 className="text-3xl tracking-tight text-[#111] mb-6 font-normal font-dm-sans">Track your journey</h3>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white p-6 rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-neutral-100 flex flex-col gap-2">
                            <span className="text-sm text-neutral-500 font-medium flex items-center gap-2 font-sans">
                                <Icon icon="solar:target-linear" width="18" />
                                Pronunciation
                            </span>
                            <div className="flex items-end gap-2">
                                <span className="text-4xl tracking-tight text-[#111] font-normal font-dm-sans">92</span>
                                <span className="text-sm text-emerald-500 font-medium mb-1 font-sans">+4%</span>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-neutral-100 flex flex-col gap-2">
                            <span className="text-sm text-neutral-500 font-medium flex items-center gap-2 font-sans">
                                <Icon icon="solar:soundwave-linear" width="18" />
                                Fluency
                            </span>
                            <div className="flex items-end gap-2">
                                <span className="text-4xl tracking-tight text-[#111] font-normal font-dm-sans">88</span>
                                <span className="text-sm text-emerald-500 font-medium mb-1 font-sans">+2%</span>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-neutral-100 flex flex-col gap-2">
                            <span className="text-sm text-neutral-500 font-medium flex items-center gap-2 font-sans">
                                <Icon icon="solar:fire-linear" width="18" />
                                Daily Streak
                            </span>
                            <div className="flex items-end gap-2">
                                <span className="text-4xl tracking-tight text-[#111] font-normal font-dm-sans">14</span>
                                <span className="text-sm text-neutral-400 font-medium mb-1 font-sans">days</span>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-neutral-100 flex flex-col gap-2">
                            <span className="text-sm text-neutral-500 font-medium flex items-center gap-2 font-sans">
                                <Icon icon="solar:chat-round-line-linear" width="18" />
                                Words Practiced
                            </span>
                            <div className="flex items-end gap-2">
                                <span className="text-4xl tracking-tight text-[#111] font-normal font-dm-sans">1.2k</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Audio Book Practice */}
                <div className="flex flex-col gap-6 lg:pl-12">
                    <div className="text-sm font-medium tracking-tight text-neutral-400 mb-2 uppercase font-sans">Practice Mode</div>
                    <h3 className="text-3xl tracking-tight text-[#111] mb-6 font-normal font-dm-sans">Read along</h3>

                    <div className="bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-neutral-100 w-full">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-16 h-16 bg-neutral-100 rounded-xl flex items-center justify-center text-neutral-400">
                                <Icon icon="solar:book-linear" width="28" />
                            </div>
                            <div>
                                <h4 className="text-lg font-medium tracking-tight text-[#111] font-sans">The Great Gatsby</h4>
                                <p className="text-sm text-neutral-500 font-sans">Chapter 1 • Reading Exercise</p>
                            </div>
                        </div>

                        {/* Fake Waveform */}
                        <div className="w-full h-12 flex items-center justify-between gap-1 mb-4 opacity-70">
                            <div className="w-1 h-4 bg-indigo-500 rounded-full"></div>
                            <div className="w-1 h-8 bg-indigo-500 rounded-full"></div>
                            <div className="w-1 h-6 bg-indigo-500 rounded-full"></div>
                            <div className="w-1 h-10 bg-indigo-500 rounded-full"></div>
                            <div className="w-1 h-12 bg-indigo-500 rounded-full"></div>
                            <div className="w-1 h-7 bg-indigo-500 rounded-full"></div>
                            <div className="w-1 h-5 bg-indigo-500 rounded-full"></div>
                            <div className="w-1 h-9 bg-neutral-200 rounded-full"></div>
                            <div className="w-1 h-4 bg-neutral-200 rounded-full"></div>
                            <div className="w-1 h-6 bg-neutral-200 rounded-full"></div>
                            <div className="w-1 h-3 bg-neutral-200 rounded-full"></div>
                            <div className="w-1 h-8 bg-neutral-200 rounded-full"></div>
                            <div className="w-1 h-5 bg-neutral-200 rounded-full"></div>
                            <div className="w-1 h-10 bg-neutral-200 rounded-full"></div>
                            <div className="w-1 h-6 bg-neutral-200 rounded-full"></div>
                            <div className="w-1 h-4 bg-neutral-200 rounded-full"></div>
                        </div>

                        {/* Timeline */}
                        <div className="flex justify-between text-xs font-medium text-neutral-400 mb-8">
                            <span className="font-sans">0:45</span>
                            <span className="font-sans">2:10</span>
                        </div>

                        <p className="text-base text-neutral-600 leading-relaxed italic mb-8 border-l-2 border-indigo-100 pl-4 font-sans">
                            "In my younger and more vulnerable years my father gave me some advice that I've been turning over in my mind ever since."
                        </p>

                        <div className="flex justify-between items-center">
                            <button className="text-sm font-medium text-neutral-500 hover:text-[#111] transition-colors font-sans">Skip</button>
                            <button className="bg-[#111] text-white px-6 py-2.5 rounded-full text-sm font-medium flex items-center gap-2 hover:bg-neutral-800 transition-colors font-sans">
                                <Icon icon="solar:microphone-2-linear" width="18" />
                                Hold to speak
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        </section>
    );
};

export default Progress;
