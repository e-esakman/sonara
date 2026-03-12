import { Link } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';
import { useStore } from '../store/useStore';

const Dashboard = () => {
    const { user, sessions, progressStats } = useStore();

    const lastSession = sessions.length > 0 ? sessions[0] : null;

    // Determine speaking level
    const getSpeakingLevel = () => {
        const avg = progressStats.avgPronunciation;
        if (avg >= 90) return { label: 'Advanced', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: '🌟' };
        if (avg >= 75) return { label: 'Intermediate', color: 'text-indigo-600', bg: 'bg-indigo-50', icon: '📈' };
        if (avg >= 50) return { label: 'Elementary', color: 'text-amber-600', bg: 'bg-amber-50', icon: '🔥' };
        if (avg > 0) return { label: 'Beginner', color: 'text-blue-600', bg: 'bg-blue-50', icon: '🌱' };
        return { label: 'Getting Started', color: 'text-neutral-500', bg: 'bg-neutral-50', icon: '👋' };
    };

    const level = getSpeakingLevel();

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

    return (
        <div className="pt-36 min-h-screen bg-neutral-50 pb-20">
            <div className="max-w-5xl mx-auto px-6">

                {/* Welcome */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35 }}
                >
                    <h1 className="text-3xl sm:text-4xl font-dm-sans text-[#111] tracking-tight mb-1">
                        Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''} 👋
                    </h1>
                    <p className="text-neutral-500 font-sans mb-10">Here's your speaking practice overview.</p>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">

                    {/* Speaking Level */}
                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.05, duration: 0.35 }}
                        className="bg-white rounded-3xl p-6 shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-neutral-100 flex flex-col gap-3"
                    >
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">{level.icon}</span>
                            <div>
                                <p className="text-xs text-neutral-400 font-bold uppercase tracking-wider font-sans">Speaking Level</p>
                                <p className={`text-xl font-dm-sans font-semibold ${level.color}`}>{level.label}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 mt-auto">
                            <div className="flex-1 h-2 bg-neutral-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-indigo-500 rounded-full transition-all duration-700"
                                    style={{ width: `${Math.max(progressStats.avgPronunciation, 5)}%` }}
                                />
                            </div>
                            <span className="text-sm font-semibold text-neutral-500 font-sans">{progressStats.avgPronunciation || 0}%</span>
                        </div>
                    </motion.div>

                    {/* Quick Stats */}
                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1, duration: 0.35 }}
                        className="bg-white rounded-3xl p-6 shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-neutral-100"
                    >
                        <p className="text-xs text-neutral-400 font-bold uppercase tracking-wider font-sans mb-4">Quick Stats</p>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <span className="text-2xl font-dm-sans text-[#111]">{progressStats.totalSessions}</span>
                                <p className="text-xs text-neutral-400 font-sans mt-0.5">Sessions</p>
                            </div>
                            <div>
                                <span className="text-2xl font-dm-sans text-[#111]">{progressStats.streak}</span>
                                <p className="text-xs text-neutral-400 font-sans mt-0.5">Day Streak</p>
                            </div>
                            <div>
                                <span className="text-2xl font-dm-sans text-[#111]">{progressStats.avgFluency || '—'}</span>
                                <p className="text-xs text-neutral-400 font-sans mt-0.5">Avg Fluency</p>
                            </div>
                            <div>
                                <span className="text-2xl font-dm-sans text-[#111]">{progressStats.wordsPracticed}</span>
                                <p className="text-xs text-neutral-400 font-sans mt-0.5">Words</p>
                            </div>
                        </div>
                    </motion.div>

                    {/* Quick Practice */}
                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15, duration: 0.35 }}
                        className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-3xl p-6 shadow-[0_8px_30px_rgba(99,102,241,0.2)] border border-indigo-400/30 flex flex-col justify-between text-white"
                    >
                        <div>
                            <p className="text-indigo-200 text-xs font-bold uppercase tracking-wider font-sans mb-2">Quick Practice</p>
                            <h3 className="text-xl font-dm-sans font-semibold mb-2">Start a session</h3>
                            <p className="text-indigo-100 text-sm font-sans leading-relaxed">
                                Jump into a practice session and improve your pronunciation.
                            </p>
                        </div>
                        <Link
                            to="/practice"
                            className="mt-5 inline-flex items-center gap-2 bg-white text-indigo-600 px-5 py-2.5 rounded-full text-sm font-semibold font-sans hover:bg-indigo-50 transition-colors w-fit shadow-sm"
                        >
                            <Icon icon="solar:microphone-2-bold" width="16" />
                            Start Practice
                        </Link>
                    </motion.div>
                </div>

                {/* Recent Session */}
                {lastSession && (
                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.35 }}
                    >
                        <h2 className="text-xl font-dm-sans text-[#111] mb-4 flex items-center gap-2">
                            <Icon icon="solar:history-linear" className="text-indigo-500" width="20" />
                            Recent Session
                        </h2>
                        <div className="bg-white rounded-2xl p-6 shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-neutral-100">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center">
                                        <Icon icon="solar:waveform-linear" width="24" className="text-indigo-500" />
                                    </div>
                                    <div>
                                        <p className="font-sans font-semibold text-[#111] text-[15px]">
                                            {lastSession.passageId === 'free-speak' ? 'Free Speak Session' :
                                                lastSession.passageId === 'live-coach' ? 'Live Coach Session' :
                                                    lastSession.passageId === 'speech-analysis' ? 'Speech Analysis' :
                                                        'Read Along Session'}
                                        </p>
                                        <p className="text-sm text-neutral-400 font-sans">{formatDate(lastSession.createdAt)}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6">
                                    <div className="text-center">
                                        <p className="text-2xl font-dm-sans text-[#111]">{lastSession.pronunciationScore}%</p>
                                        <p className="text-[11px] text-neutral-400 font-sans uppercase tracking-wider">Accuracy</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-2xl font-dm-sans text-[#111]">{lastSession.fluencyScore}%</p>
                                        <p className="text-[11px] text-neutral-400 font-sans uppercase tracking-wider">Fluency</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-2xl font-dm-sans text-[#111]">{lastSession.wordsPerMinute}</p>
                                        <p className="text-[11px] text-neutral-400 font-sans uppercase tracking-wider">WPM</p>
                                    </div>
                                </div>
                            </div>
                            {lastSession.incorrectWords?.length > 0 && (
                                <div className="mt-4 pt-4 border-t border-neutral-100">
                                    <p className="text-xs text-neutral-400 font-sans uppercase tracking-wider mb-2">Words to improve</p>
                                    <div className="flex flex-wrap gap-2">
                                        {lastSession.incorrectWords.map((w, i) => (
                                            <span key={i} className="text-sm text-rose-500 font-medium font-sans bg-rose-50 px-3 py-1 rounded-lg border border-rose-100">{w}</span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}

                {!lastSession && (
                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.35 }}
                        className="bg-white rounded-2xl p-10 shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-neutral-100 text-center"
                    >
                        <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Icon icon="solar:microphone-2-linear" width="32" className="text-indigo-400" />
                        </div>
                        <h3 className="font-dm-sans text-xl text-[#111] mb-2">No sessions yet</h3>
                        <p className="text-neutral-500 font-sans text-sm mb-5 max-w-sm mx-auto">
                            Start your first practice session to see your progress here.
                        </p>
                        <Link
                            to="/practice"
                            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-full text-sm font-semibold font-sans hover:bg-indigo-700 transition-colors shadow-sm"
                        >
                            <Icon icon="solar:microphone-2-bold" width="16" />
                            Start Practice
                        </Link>
                    </motion.div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;
