import { Icon } from '@iconify/react';

const Footer = () => {
    return (
        <footer className="w-full bg-white border-t border-neutral-100 pt-16 pb-8 px-6">
            <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center mb-16 gap-8">
                <div>
                    <a href="#" className="text-2xl tracking-tight text-[#111] flex items-center gap-2 mb-2 font-normal font-dm-sans">
                        <Icon icon="solar:soundwave-linear" width="28" />
                        Sonara
                    </a>
                    <p className="text-sm text-neutral-500 font-sans">The AI pronunciation coach.</p>
                </div>

                <div className="flex gap-8 text-sm font-medium text-neutral-600">
                    <a href="#" className="hover:text-[#111] transition-colors font-sans">GitHub</a>
                    <a href="#" className="hover:text-[#111] transition-colors font-sans">Documentation</a>
                    <a href="#" className="hover:text-[#111] transition-colors font-sans">Privacy</a>
                    <a href="#" className="hover:text-[#111] transition-colors font-sans">Contact</a>
                </div>
            </div>

            <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center text-xs text-neutral-400">
                <span className="font-sans">© 2024 Sonara AI. All rights reserved.</span>
                <span className="mt-4 sm:mt-0 font-sans">Designed with precision.</span>
            </div>
        </footer>
    );
};

export default Footer;
