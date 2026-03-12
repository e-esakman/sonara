import { Link } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';
import { useStore } from '../store/useStore';

const Dashboard = () => {
    const { user, sessions, progressStats } = useStore();
    const lastSession = sessions.length > 0 ? sessions[0] : null;

    const getSpeakingLevel = () => {
        const avg = progressStats.avgPronunciation;
        if (avg >= 90) return { label: 'Advanced', color: 'text-emerald-700', bg: 'bg-emerald-50', icon: 'solar:medal-star-linear' };
        if (avg >= 75) return { label: 'Intermediate', color: 'text-indigo-700', bg: 'bg-indigo-50', icon: 'solar:chart-square-linear' };
        if (avg >= 50) return { label: 'Elementary', color: 'text-amber-700', bg: 'bg-amber-50', icon: 'solar:flame-linear' };
        if (avg > 0) return { label: 'Beginner', color: 'text-sky-700', bg: 'bg-sky-50', icon: 'solar:leaf-linear' };
        return { label: 'Getting Started', color: 'text-neutral-600', bg: 'bg-neutral-100', icon: 'solar:play-circle-linear' };
    };

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - d.getTime();
        const hours = Math.floor(diff / 3600000);
        if (hours < 1) return 'Just now';
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        if (days === 1) return 'Yesterday';
        if (days < 7) return `${days} days ago`;
        return d.toLocaleDateString();
    };

    const level = getSpeakingLevel();
    const statCards = [
        { label: 'Sessions', value: progressStats.totalSessions, icon: 'solar:chart-square-linear' },
        { label: 'Day Streak', value: progressStats.streak, icon: 'solar:fire-linear' },
        { label: 'Avg Fluency', value: progressStats.avgFluency || '—', icon: 'solar:soundwave-linear' },
        { label: 'Words Practiced', value: progressStats.wordsPracticed, icon: 'solar:document-text-linear' },
    ];

    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(212,235,248,0.35),_transparent_26%),linear-gradient(180deg,_#fbfbfa_0%,_#f6f2ec_100%)] pt-36 pb-20">
            <div className="mx-auto max-w-[90rem] px-6 md:px-12">
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35 }}
                    className="mb-10"
                >
                    <div className="flex items-center gap-3 mb-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 shadow-sm">
                            <Icon icon="solar:home-angle-linear" width="22" />
                        </div>
                        <h1 className="text-4xl font-dm-sans font-semibold tracking-tight text-[#111]">
                            Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
                        </h1>
                    </div>
                    <p className="max-w-2xl text-lg leading-relaxed text-neutral-500 font-sans">
                        Your speaking dashboard brings together progress, practice momentum, and the most recent feedback in one place.
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 gap-8 xl:grid-cols-[1.1fr_0.9fr]">
                    <div className="space-y-8">
                        <motion.div
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.05, duration: 0.35 }}
                            className="overflow-hidden rounded-[34px] border border-[#e6e0d8] bg-[linear-gradient(180deg,rgba(255,255,255,0.82)_0%,rgba(247,245,242,0.98)_100%)] shadow-[0_12px_36px_rgba(0,0,0,0.05)]"
                        >
                            <div className="border-b border-[#e6e0d8] px-6 py-5 sm:px-8">
                                <p className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-400 mb-3">Speaking Status</p>
                                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className={`flex h-14 w-14 items-center justify-center rounded-3xl ${level.bg} ${level.color}`}>
                                            <Icon icon={level.icon} width="26" />
                                        </div>
                                        <div>
                                            <h2 className="text-3xl font-dm-sans font-semibold tracking-tight text-[#111]">{level.label}</h2>
                                            <p className="text-sm text-neutral-500 font-sans">Based on your current pronunciation average.</p>
                                        </div>
                                    </div>
                                    <div className="min-w-[220px]">
                                        <div className="mb-2 flex items-center justify-between">
                                            <span className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-400">Pronunciation Score</span>
                                            <span className="text-sm font-semibold text-neutral-600 font-sans">{progressStats.avgPronunciation || 0}%</span>
                                        </div>
                                        <div className="h-3 overflow-hidden rounded-full bg-neutral-100">
                                            <div
                                                className="h-full rounded-full bg-[linear-gradient(90deg,#6366f1_0%,#8b5cf6_100%)] transition-all duration-700"
                                                style={{ width: `${Math.max(progressStats.avgPronunciation, 5)}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-4 sm:p-6">
                                {statCards.map((card) => (
                                    <div key={card.label} className="rounded-[24px] border border-neutral-200 bg-white p-4 shadow-sm">
                                        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-600">
                                            <Icon icon={card.icon} width="18" />
                                        </div>
                                        <p className="text-2xl font-dm-sans font-semibold tracking-tight text-[#111]">{card.value}</p>
                                        <p className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-neutral-400">{card.label}</p>
                                    </div>
                                ))}
                            </div>
                        </motion.div>

                        {lastSession ? (
                            <motion.div
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1, duration: 0.35 }}
                                className="overflow-hidden rounded-[34px] border border-[#e6e0d8] bg-[linear-gradient(180deg,rgba(255,255,255,0.82)_0%,rgba(247,245,242,0.98)_100%)] shadow-[0_12px_36px_rgba(0,0,0,0.05)]"
                            >
                                <div className="border-b border-[#e6e0d8] px-6 py-5 sm:px-8">
                                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-400 mb-3">Latest Session</p>
                                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                                                <Icon icon="solar:waveform-linear" width="24" />
                                            </div>
                                            <div>
                                                <h2 className="text-xl font-dm-sans font-semibold tracking-tight text-[#111]">
                                                    {lastSession.passageId === 'live-coach' ? 'Live Coach Session' : 'Practice Session'}
                                                </h2>
                                                <p className="text-sm text-neutral-500 font-sans">{formatDate(lastSession.createdAt)}</p>
                                            </div>
                                        </div>
                                        <Link
                                            to="/practice"
                                            className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#111] transition-colors hover:bg-neutral-50 font-sans"
                                        >
                                            Practice Again
                                            <Icon icon="solar:arrow-right-linear" width="16" />
                                        </Link>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-3 p-5 sm:p-6">
                                    {[
                                        { label: 'Accuracy', value: `${lastSession.pronunciationScore}%` },
                                        { label: 'Fluency', value: `${lastSession.fluencyScore}%` },
                                        { label: 'WPM', value: lastSession.wordsPerMinute },
                                    ].map((item) => (
                                        <div key={item.label} className="rounded-[22px] border border-neutral-200 bg-white p-4 text-center shadow-sm">
                                            <p className="text-2xl font-dm-sans font-semibold text-[#111]">{item.value}</p>
                                            <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.16em] text-neutral-400">{item.label}</p>
                                        </div>
                                    ))}
                                </div>

                                {lastSession.incorrectWords?.length > 0 && (
                                    <div className="border-t border-[#e6e0d8] px-5 py-5 sm:px-6">
                                        <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-neutral-400">Words To Review</p>
                                        <div className="flex flex-wrap gap-2">
                                            {lastSession.incorrectWords.map((word, index) => (
                                                <span key={index} className="rounded-full border border-rose-100 bg-rose-50 px-3 py-1.5 text-sm font-medium text-rose-600 font-sans">
                                                    {word}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1, duration: 0.35 }}
                                className="overflow-hidden rounded-[34px] border border-[#e6e0d8] bg-[linear-gradient(180deg,rgba(255,255,255,0.82)_0%,rgba(247,245,242,0.98)_100%)] shadow-[0_12px_36px_rgba(0,0,0,0.05)]"
                            >
                                <div className="flex min-h-[320px] flex-col items-center justify-center px-8 py-10 text-center">
                                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100/75 text-indigo-600">
                                        <Icon icon="solar:microphone-2-linear" width="30" />
                                    </div>
                                    <h2 className="text-2xl font-dm-sans font-semibold tracking-tight text-[#111]">No Sessions Yet</h2>
                                    <p className="mt-2 max-w-sm text-neutral-500 font-sans leading-relaxed">
                                        Start your first practice session to fill this dashboard with real speaking feedback.
                                    </p>
                                    <Link
                                        to="/practice"
                                        className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#111] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 font-sans"
                                    >
                                        Start Practice
                                        <Icon icon="solar:arrow-right-linear" width="16" />
                                    </Link>
                                </div>
                            </motion.div>
                        )}
                    </div>

                    <div className="space-y-8">
                        <motion.div
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.15, duration: 0.35 }}
                            className="overflow-hidden rounded-[34px] border border-[#e6e0d8] bg-[linear-gradient(180deg,rgba(255,255,255,0.82)_0%,rgba(247,245,242,0.98)_100%)] shadow-[0_12px_36px_rgba(0,0,0,0.05)]"
                        >
                            <div className="border-b border-[#e6e0d8] px-6 py-5 sm:px-8">
                                <p className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-400 mb-3">Quick Actions</p>
                                <h2 className="text-2xl font-dm-sans font-semibold tracking-tight text-[#111]">Keep momentum going</h2>
                            </div>
                            <div className="grid grid-cols-1 gap-3 p-5 sm:p-6">
                                {[
                                    { to: '/practice', label: 'Start a live coach session', icon: 'solar:stars-line-duotone' },
                                    { to: '/library', label: 'Open the reading library', icon: 'solar:library-linear' },
                                    { to: '/progress', label: 'Review your analytics', icon: 'solar:graph-up-linear' },
                                ].map((item) => (
                                    <Link
                                        key={item.label}
                                        to={item.to}
                                        className="flex items-center justify-between rounded-[24px] border border-neutral-200 bg-white px-4 py-4 text-[#111] shadow-sm transition-colors hover:bg-neutral-50"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-600">
                                                <Icon icon={item.icon} width="18" />
                                            </div>
                                            <span className="text-sm font-semibold font-sans">{item.label}</span>
                                        </div>
                                        <Icon icon="solar:arrow-right-linear" width="18" className="text-neutral-400" />
                                    </Link>
                                ))}
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2, duration: 0.35 }}
                            className="overflow-hidden rounded-[34px] border border-[#e6e0d8] bg-[linear-gradient(180deg,rgba(255,255,255,0.82)_0%,rgba(247,245,242,0.98)_100%)] shadow-[0_12px_36px_rgba(0,0,0,0.05)]"
                        >
                            <div className="border-b border-[#e6e0d8] px-6 py-5 sm:px-8">
                                <p className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-400 mb-3">Practice Snapshot</p>
                                <h2 className="text-2xl font-dm-sans font-semibold tracking-tight text-[#111]">What to focus on next</h2>
                            </div>
                            <div className="space-y-4 p-5 sm:p-6">
                                <div className="rounded-[24px] border border-emerald-100 bg-emerald-50/85 p-4">
                                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700 mb-2">Strongest Area</p>
                                    <p className="text-sm leading-relaxed text-emerald-900 font-sans">
                                        {progressStats.avgPronunciation >= progressStats.avgFluency
                                            ? 'Your pronunciation is leading right now. Keep repeating short sentences to make the clarity more automatic.'
                                            : 'Your fluency is carrying well. Keep speaking in longer phrases to preserve that smooth delivery.'}
                                    </p>
                                </div>
                                <div className="rounded-[24px] border border-amber-100 bg-amber-50/85 p-4">
                                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-700 mb-2">Focus Next</p>
                                    <p className="text-sm leading-relaxed text-amber-900 font-sans">
                                        {progressStats.streak > 2
                                            ? 'You already have momentum. Use Read Along for precision and Live Coach for natural sentence practice.'
                                            : 'Build a stronger habit by doing one short practice session each day before trying longer passages.'}
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
