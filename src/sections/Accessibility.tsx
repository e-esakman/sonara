import { Icon } from '@iconify/react';

const Accessibility = () => {
    return (
        <section className="w-full py-24 bg-white px-6 border-t border-neutral-100">
            <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-start gap-12">
                <div className="md:w-1/3">
                    <div className="w-12 h-12 bg-neutral-100 rounded-2xl flex items-center justify-center text-neutral-600 mb-6">
                        <Icon icon="solar:accessibility-linear" width="24" />
                    </div>
                    <h3 className="text-2xl tracking-tight text-[#111] mb-4 font-normal font-dm-sans">Accessibility first.</h3>
                    <p className="text-sm text-neutral-500 leading-relaxed font-sans">
                        We believe language learning should be for everyone. Sonara is built with inclusive design principles at its core.
                    </p>
                </div>

                <div className="md:w-2/3 grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="flex items-center gap-3">
                        <Icon icon="solar:check-circle-linear" className="text-neutral-400" width="20" />
                        <span className="text-base text-[#111] font-medium font-sans">Voice-based interaction</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <Icon icon="solar:check-circle-linear" className="text-neutral-400" width="20" />
                        <span className="text-base text-[#111] font-medium font-sans">Screen reader support</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <Icon icon="solar:check-circle-linear" className="text-neutral-400" width="20" />
                        <span className="text-base text-[#111] font-medium font-sans">Color-blind safe UI</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <Icon icon="solar:check-circle-linear" className="text-neutral-400" width="20" />
                        <span className="text-base text-[#111] font-medium font-sans">Keyboard navigation</span>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Accessibility;
