import { Icon } from '@iconify/react';

const Features = () => {
    return (
        <section id="features" className="w-full py-32 bg-white px-6">
            <div className="max-w-6xl mx-auto">
                <div className="text-sm font-medium tracking-tight text-neutral-400 mb-16 uppercase font-sans">
                    Features
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-16 gap-x-12">
                    {/* Feature 1 */}
                    <div className="flex flex-col gap-4 group">
                        <div className="w-12 h-12 rounded-2xl bg-[#F7F5F2] flex items-center justify-center text-neutral-600 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors duration-300">
                            <Icon icon="solar:soundwave-circle-linear" width="28" />
                        </div>
                        <h4 className="text-xl tracking-tight text-[#111] font-normal font-dm-sans">Real-time feedback</h4>
                        <p className="text-base text-neutral-500 leading-relaxed font-sans">
                            Get instant corrections on your pronunciation as you speak, highlighting specific areas for improvement.
                        </p>
                    </div>

                    {/* Feature 2 */}
                    <div className="flex flex-col gap-4 group">
                        <div className="w-12 h-12 rounded-2xl bg-[#F7F5F2] flex items-center justify-center text-neutral-600 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors duration-300">
                            <Icon icon="solar:global-linear" width="28" />
                        </div>
                        <h4 className="text-xl tracking-tight text-[#111] font-normal font-dm-sans">Accent detection</h4>
                        <p className="text-base text-neutral-500 leading-relaxed font-sans">
                            Advanced AI models recognize subtle regional accent variations to provide highly tailored coaching.
                        </p>
                    </div>

                    {/* Feature 3 */}
                    <div className="flex flex-col gap-4 group">
                        <div className="w-12 h-12 rounded-2xl bg-[#F7F5F2] flex items-center justify-center text-neutral-600 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors duration-300">
                            <Icon icon="solar:chart-square-linear" width="28" />
                        </div>
                        <h4 className="text-xl tracking-tight text-[#111] font-normal font-dm-sans">Progress tracking</h4>
                        <p className="text-base text-neutral-500 leading-relaxed font-sans">
                            Visualize your improvement over time with detailed charts mapping your fluency and accuracy scores.
                        </p>
                    </div>

                    {/* Feature 4 */}
                    <div className="flex flex-col gap-4 group">
                        <div className="w-12 h-12 rounded-2xl bg-[#F7F5F2] flex items-center justify-center text-neutral-600 group-hover:bg-amber-50 group-hover:text-amber-600 transition-colors duration-300">
                            <Icon icon="solar:pie-chart-linear" width="28" />
                        </div>
                        <h4 className="text-xl tracking-tight text-[#111] font-normal font-dm-sans">Speech analytics</h4>
                        <p className="text-base text-neutral-500 leading-relaxed font-sans">
                            Deep dive into metrics like speaking rate, pauses, and pitch variations to sound more natural.
                        </p>
                    </div>

                    {/* Feature 5 */}
                    <div className="flex flex-col gap-4 group">
                        <div className="w-12 h-12 rounded-2xl bg-[#F7F5F2] flex items-center justify-center text-neutral-600 group-hover:bg-purple-50 group-hover:text-purple-600 transition-colors duration-300">
                            <Icon icon="solar:history-linear" width="28" />
                        </div>
                        <h4 className="text-xl tracking-tight text-[#111] font-normal font-dm-sans">Voice replay</h4>
                        <p className="text-base text-neutral-500 leading-relaxed font-sans">
                            Listen to your own recordings side-by-side with native speakers to spot the differences instantly.
                        </p>
                    </div>

                    {/* Feature 6 */}
                    <div className="flex flex-col gap-4 group">
                        <div className="w-12 h-12 rounded-2xl bg-[#F7F5F2] flex items-center justify-center text-neutral-600 group-hover:bg-rose-50 group-hover:text-rose-600 transition-colors duration-300">
                            <Icon icon="solar:star-linear" width="28" />
                        </div>
                        <h4 className="text-xl tracking-tight text-[#111] font-normal font-dm-sans">Confidence scoring</h4>
                        <p className="text-base text-neutral-500 leading-relaxed font-sans">
                            We measure not just correctness, but the confidence in your delivery to help you sound authoritative.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Features;
