import { Link } from 'react-router-dom';
import { Mic, Users, ArrowUpRight, AudioLines } from 'lucide-react';

export default function Home() {
    return <div className="bg-[#f7f8f5] min-h-screen pt-36 pb-20 px-6 sm:px-12">
        <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-2 text-sm text-emerald-800"><AudioLines size={18} /> A calmer way to practice English</div>
            <h1 className="mt-7 max-w-3xl text-5xl sm:text-7xl leading-[1.08] tracking-tight font-dm-sans text-neutral-900">More conversation.<br /><span className="text-emerald-700">More confidence.</span></h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-neutral-600">Struggling with a sound or stumbling over a word? Say it here. Get personal pronunciation feedback and build confidence through real conversations.</p>
            <div className="mt-10 grid md:grid-cols-2 gap-5">
                <Link to="/practice" className="group rounded-[28px] bg-[#163c34] p-8 sm:p-10 text-white focus-visible:outline-4 focus-visible:outline-emerald-500">
                    <div className="flex justify-between"><Mic size={30} /><ArrowUpRight className="group-hover:translate-x-1 transition-transform" /></div>
                    <p className="mt-10 text-xs uppercase tracking-widest text-emerald-200">01 / Just you and your coach</p>
                    <h2 className="mt-3 text-3xl tracking-tight">Talk to AI</h2>
                    <p className="mt-3 text-emerald-100/80 leading-relaxed">Speak freely, listen to your coach, and work on the sounds you find difficult.</p>
                    <span className="mt-7 inline-block rounded-full bg-white px-5 py-3 text-sm font-semibold text-[#163c34]">Start a conversation</span>
                </Link>
                <Link to="/rooms" className="group rounded-[28px] bg-[#e5ece3] border border-[#d2dfcf] p-8 sm:p-10 text-neutral-900 focus-visible:outline-4 focus-visible:outline-emerald-500">
                    <div className="flex justify-between"><Users size={30} /><ArrowUpRight className="group-hover:translate-x-1 transition-transform" /></div>
                    <p className="mt-10 text-xs uppercase tracking-widest text-emerald-800">02 / Better with a friend</p>
                    <h2 className="mt-3 text-3xl tracking-tight">Practice together</h2>
                    <p className="mt-3 text-neutral-600 leading-relaxed">Invite a friend to a voice call. Each of you gets private AI feedback as you talk.</p>
                    <span className="mt-7 inline-block rounded-full bg-white px-5 py-3 text-sm font-semibold text-[#163c34]">Create a practice room</span>
                </Link>
            </div>
            <p className="mt-8 text-sm text-neutral-500">Speak naturally. Pause for feedback. Try again. There is no rush.</p>
        </div>
    </div>;
}
