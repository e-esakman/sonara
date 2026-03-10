import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Icon } from '@iconify/react';
import { useStore } from '../store/useStore';

const Analytics = () => {
    const { sessions } = useStore();

    const metrics = useMemo(() => {
        if (sessions.length === 0) {
            return { avgWpm: 0, avgPauses: 0, avgAccuracy: 0, avgConfidence: 0, accent: 'N/A' };
        }
        const avgWpm = Math.round(sessions.reduce((a, s) => a + s.wordsPerMinute, 0) / sessions.length);
        const avgPauses = Math.round(sessions.reduce((a, s) => a + s.pauseCount, 0) / sessions.length * 10) / 10;
        const avgAccuracy = Math.round(sessions.reduce((a, s) => a + s.pronunciationScore, 0) / sessions.length);
        const avgConfidence = Math.round(sessions.reduce((a, s) => a + s.confidenceScore, 0) / sessions.length);
        // Find most common accent
        const accents = sessions.filter(s => s.accentInfluence).map(s => s.accentInfluence!);
        const accent = accents.length > 0 ? accents[accents.length - 1] : 'N/A';
        return { avgWpm, avgPauses, avgAccuracy, avgConfidence, accent };
    }, [sessions]);

    const pauseChartData = useMemo(() => {
        return [...sessions].reverse().slice(-10).map((s, idx) => ({
            name: `#${idx + 1}`,
            pauses: s.pauseCount,
            wpm: s.wordsPerMinute,
        }));
    }, [sessions]);

    const accuracyTrendData = useMemo(() => {
        return [...sessions].reverse().slice(-10).map((s, idx) => ({
            name: `#${idx + 1}`,
            accuracy: s.pronunciationScore,
            confidence: s.confidenceScore,
        }));
    }, [sessions]);

    // Calculate delta from earlier sessions
    const wpmDelta = useMemo(() => {
        if (sessions.length < 2) return null;
        const recent = sessions.slice(0, Math.ceil(sessions.length / 2));
        const older = sessions.slice(Math.ceil(sessions.length / 2));
        const recentAvg = recent.reduce((a, s) => a + s.wordsPerMinute, 0) / recent.length;
        const olderAvg = older.reduce((a, s) => a + s.wordsPerMinute, 0) / older.length;
        return Math.round(recentAvg - olderAvg);
    }, [sessions]);

    return (
        <div className="pt-24 min-h-screen bg-neutral-50 pb-20">
            <div className="max-w-6xl mx-auto px-6">
                <h1 className="text-4xl font-dm-sans text-[#111] mb-2 tracking-tight">Speech Analytics</h1>
                <p className="text-neutral-500 font-sans mb-12">Detailed insights into your speaking habits.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-neutral-100">
                        <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center mb-4">
                            <Icon icon="solar:clock-circle-linear" width="20" />
                        </div>
                        <p className="text-xs text-neutral-500 font-medium uppercase tracking-wider mb-1">Words Per Minute</p>
                        <div className="flex items-end gap-2">
                            <span className="text-3xl font-dm-sans font-medium text-[#111]">{metrics.avgWpm || '—'}</span>
                            {wpmDelta !== null && (
                                <span className={`text-sm mb-1 ${wpmDelta >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                    {wpmDelta >= 0 ? '+' : ''}{wpmDelta} wpm
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-neutral-100">
                        <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mb-4">
                            <Icon icon="solar:pause-circle-linear" width="20" />
                        </div>
                        <p className="text-xs text-neutral-500 font-medium uppercase tracking-wider mb-1">Avg Pauses / Session</p>
                        <div className="flex items-end gap-2">
                            <span className="text-3xl font-dm-sans font-medium text-[#111]">{metrics.avgPauses || '—'}</span>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-neutral-100">
                        <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center mb-4">
                            <Icon icon="solar:target-linear" width="20" />
                        </div>
                        <p className="text-xs text-neutral-500 font-medium uppercase tracking-wider mb-1">Avg Accuracy</p>
                        <div className="flex items-end gap-2">
                            <span className="text-3xl font-dm-sans font-medium text-[#111]">{metrics.avgAccuracy || '—'}<span className="text-xl">%</span></span>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-neutral-100">
                        <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mb-4">
                            <Icon icon="solar:map-point-linear" width="20" />
                        </div>
                        <p className="text-xs text-neutral-500 font-medium uppercase tracking-wider mb-1">Detected Accent</p>
                        <div className="flex items-end gap-2">
                            <span className="text-2xl font-dm-sans font-medium text-[#111]">{metrics.accent}</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* WPM / Pause Chart */}
                    <div className="bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-neutral-100">
                        <h3 className="text-xl font-dm-sans text-[#111] mb-6 flex items-center gap-2">
                            <Icon icon="solar:chart-square-linear" className="text-indigo-500" />
                            Pauses &amp; Speed per Session
                        </h3>
                        <div className="h-72">
                            {sessions.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center gap-3">
                                    <Icon icon="solar:chart-square-linear" width="40" className="text-neutral-200" />
                                    <p className="text-neutral-400 font-sans text-sm">Complete sessions to see analytics.</p>
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={pauseChartData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#888', fontSize: 12 }} dy={10} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#888', fontSize: 12 }} dx={-10} />
                                        <Tooltip cursor={{ fill: '#f9fafb' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }} />
                                        <Bar dataKey="pauses" fill="#818cf8" radius={[6, 6, 0, 0]} name="Pauses" />
                                        <Bar dataKey="wpm" fill="#34d399" radius={[6, 6, 0, 0]} name="WPM" />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>

                    {/* Accuracy Trend */}
                    <div className="bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-neutral-100">
                        <h3 className="text-xl font-dm-sans text-[#111] mb-6 flex items-center gap-2">
                            <Icon icon="solar:graph-up-linear" className="text-emerald-500" />
                            Accuracy &amp; Confidence Trend
                        </h3>
                        <div className="h-72">
                            {sessions.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center gap-3">
                                    <Icon icon="solar:graph-up-linear" width="40" className="text-neutral-200" />
                                    <p className="text-neutral-400 font-sans text-sm">Start practicing to track trends.</p>
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={accuracyTrendData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#888', fontSize: 12 }} dy={10} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#888', fontSize: 12 }} dx={-10} domain={[0, 100]} />
                                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }} />
                                        <Line type="monotone" dataKey="accuracy" stroke="#6366f1" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} name="Accuracy" />
                                        <Line type="monotone" dataKey="confidence" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} name="Confidence" />
                                    </LineChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Analytics;
