import { Icon } from '@iconify/react';

const FAQSection = () => {
    return (
        <section className="w-full py-32 px-6">
            <div className="max-w-3xl mx-auto">
                <h3 className="text-3xl tracking-tight text-[#111] mb-12 text-center font-normal font-dm-sans">Frequently asked questions</h3>

                <div className="flex flex-col gap-4">
                    {/* FAQ Item 1 */}
                    <details className="group bg-white rounded-2xl border border-neutral-200 overflow-hidden">
                        <summary className="flex justify-between items-center cursor-pointer p-6 text-lg font-medium tracking-tight text-[#111] font-sans">
                            What is Sonara?
                            <Icon icon="solar:alt-arrow-down-linear" width="20" className="text-neutral-400 group-open:rotate-180 transition-transform duration-300" />
                        </summary>
                        <div className="px-6 pb-6 text-neutral-500 text-base leading-relaxed font-sans">
                            Sonara is an advanced AI pronunciation coach designed to help you sound natural and confident in multiple languages through real-time feedback and detailed speech analytics.
                        </div>
                    </details>

                    {/* FAQ Item 2 */}
                    <details className="group bg-white rounded-2xl border border-neutral-200 overflow-hidden">
                        <summary className="flex justify-between items-center cursor-pointer p-6 text-lg font-medium tracking-tight text-[#111] font-sans">
                            How does pronunciation analysis work?
                            <Icon icon="solar:alt-arrow-down-linear" width="20" className="text-neutral-400 group-open:rotate-180 transition-transform duration-300" />
                        </summary>
                        <div className="px-6 pb-6 text-neutral-500 text-base leading-relaxed font-sans">
                            We use state-of-the-art machine learning models to analyze your speech at the phoneme level. It compares your input against native speaker profiles to identify specific areas where intonation or pronunciation can be improved.
                        </div>
                    </details>

                    {/* FAQ Item 3 */}
                    <details className="group bg-white rounded-2xl border border-neutral-200 overflow-hidden">
                        <summary className="flex justify-between items-center cursor-pointer p-6 text-lg font-medium tracking-tight text-[#111] font-sans">
                            Which languages are supported?
                            <Icon icon="solar:alt-arrow-down-linear" width="20" className="text-neutral-400 group-open:rotate-180 transition-transform duration-300" />
                        </summary>
                        <div className="px-6 pb-6 text-neutral-500 text-base leading-relaxed font-sans">
                            Currently, Sonara supports English, Spanish, French, Korean, Mandarin, and Hindi. We are constantly training our models to support more languages in the future.
                        </div>
                    </details>

                    {/* FAQ Item 4 */}
                    <details className="group bg-white rounded-2xl border border-neutral-200 overflow-hidden">
                        <summary className="flex justify-between items-center cursor-pointer p-6 text-lg font-medium tracking-tight text-[#111] font-sans">
                            Do I need special equipment?
                            <Icon icon="solar:alt-arrow-down-linear" width="20" className="text-neutral-400 group-open:rotate-180 transition-transform duration-300" />
                        </summary>
                        <div className="px-6 pb-6 text-neutral-500 text-base leading-relaxed font-sans">
                            No special equipment is required. A standard built-in microphone on your laptop or smartphone works perfectly fine. For the best experience, we recommend using a headset in quiet environments.
                        </div>
                    </details>
                </div>
            </div>
        </section>
    );
};

export default FAQSection;
