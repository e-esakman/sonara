import FreeSpeakMode from '../sections/FreeSpeakMode';

export default function Practice() {
    return <div className="min-h-screen bg-[#f7f8f5] pt-32 pb-16 px-4 sm:px-8">
        <div className="mx-auto max-w-5xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Your space to speak</p>
            <h1 className="mt-3 text-4xl sm:text-5xl font-dm-sans tracking-tight text-neutral-900">Find your voice, one conversation at a time.</h1>
            <p className="mt-4 mb-8 max-w-xl text-neutral-600">Talk with your AI coach. Get a clear pronunciation tip, hear the sound, and try it again at your own pace.</p>
            <div className="rounded-3xl border border-neutral-200 bg-white p-4 sm:p-8 shadow-sm">
                <FreeSpeakMode initialMode="live" hideToggle titleMode="live-coach" />
            </div>
        </div>
    </div>;
}
