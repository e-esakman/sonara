import { Icon } from '@iconify/react';

const Footer = () => {
    return (
        <footer className="w-full bg-white px-6 pb-6 pt-4 sm:px-8 md:px-12">
            <div className="mx-auto max-w-[90rem] rounded-[24px] border border-[#EAE4DB] bg-[#F7F5F2] px-6 py-8 sm:px-8 sm:py-9 md:px-10">
                <div className="mb-8">
                    <h2 className="text-[1.8rem] sm:text-[2.45rem] lg:text-[3.25rem] leading-[0.98] tracking-[-0.05em] font-dm-sans font-semibold text-black">
                        LEARN.PRACTICE.SPEAK.
                    </h2>
                </div>

                <div className="flex flex-col gap-7 md:flex-row md:items-start md:justify-between">
                    <div className="max-w-sm">
                        <a href="/" className="mb-2 flex items-center gap-2 text-xl tracking-tight text-[#111] font-normal font-dm-sans">
                            <Icon icon="solar:soundwave-linear" width="24" />
                            Sonara
                        </a>
                        <p className="text-sm text-neutral-700 font-sans leading-relaxed">The AI pronunciation coach.</p>
                    </div>

                    <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm font-medium text-neutral-700">
                        <a
                            href="https://github.com/e-esakman/sonara"
                            target="_blank"
                            rel="noreferrer"
                            className="hover:text-[#111] transition-colors font-sans"
                        >
                            GitHub
                        </a>
                        <a href="#" className="hover:text-[#111] transition-colors font-sans">Documentation</a>
                        <a href="#" className="hover:text-[#111] transition-colors font-sans">Privacy</a>
                        <a href="#" className="hover:text-[#111] transition-colors font-sans">Contact</a>
                    </div>
                </div>

                <div className="mt-8 border-t border-black/15 pt-4">
                    <div className="flex flex-col items-start justify-between gap-3 text-xs text-neutral-700 sm:flex-row sm:items-center">
                        <span className="font-sans">© 2026 Sonara AI. All rights reserved.</span>
                        <span className="font-sans">Designed with love by Sakshee</span>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
