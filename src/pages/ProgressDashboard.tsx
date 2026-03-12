import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, BarChart, Bar } from 'recharts';
import { Icon } from '@iconify/react';
import { useStore } from '../store/useStore';

const EmptyChart = ({ icon, text }: { icon: string; text: string }) => (
    <div className="h-full flex flex-col items-center justify-center text-center gap-3">
        <Icon icon={icon} width="40" className="text-neutral-200" />
        <p className="text-neutral-400 font-sans text-sm">{text}</p>
    </div>
);

const ProgressDashboard = () => {
    const { sessions, progressStats } = useStore();

    const chartData = useMemo(() => {
        const recent = [...sessions].reverse().slice(-8);
        return recent.map((session, index) => ({
            name: `S${index + 1}`,
            score: session.pronunciationScore,
            fluency: session.fluencyScore,
            confidence: session.confidenceScore,
        }));
    }, [sessions]);

    const skillsData = useMemo(() => [
        { subject: 'Pronunciation', value: progressStats.avgPronunciation, fullMark: 100 },
        { subject: 'Fluency', value: progressStats.avgFluency, fullMark: 100 },
        { subject: 'Confidence', value: progressStats.avgConfidence, fullMark: 100 },
        { subject: 'Consistency', value: sessions.length > 0 ? Math.min(100, Math.round((progressStats.streak / 7) * 100)) : 0, fullMark: 100 },
        { subject: 'Vocabulary', value: sessions.length > 0 ? Math.min(100, Math.round((progressStats.wordsPracticed / 500) * 100)) : 0, fullMark: 100 },
    ], [progressStats, sessions]);

    const analyticsMetrics = useMemo(() => {
        if (sessions.length === 0) {
            return { avgWpm: 0, avgPauses: 0, avgAccuracy: 0, avgConfidence: 0, accent: 'N/A' };
        }

        const avgWpm = Math.round(sessions.reduce((sum, session) => sum + session.wordsPerMinute, 0) / sessions.length);
        const avgPauses = Math.round((sessions.reduce((sum, session) => sum + session.pauseCount, 0) / sessions.length) * 10) / 10;
        const avgAccuracy = Math.round(sessions.reduce((sum, session) => sum + session.pronunciationScore, 0) / sessions.length);
        const avgConfidence = Math.round(sessions.reduce((sum, session) => sum + session.confidenceScore, 0) / sessions.length);
        const accents = sessions.filter((session) => session.accentInfluence).map((session) => session.accentInfluence!);

        return {
            avgWpm,
            avgPauses,
            avgAccuracy,
            avgConfidence,
            accent: accents.length > 0 ? accents[accents.length - 1] : 'N/A',
        };
    }, [sessions]);

    const pauseChartData = useMemo(() => {
        return [...sessions].reverse().slice(-8).map((session, index) => ({
            name: `S${index + 1}`,
            pauses: session.pauseCount,
            wpm: session.wordsPerMinute,
        }));
    }, [sessions]);

    const summaryCards = [
        {
            label: 'Avg Pronunciation',
            value: progressStats.avgPronunciation || '—',
            suffix: '%',
            icon: 'solar:target-linear',
            color: 'text-indigo-600 bg-indigo-50',
        },
        {
            label: 'Avg Fluency',
            value: progressStats.avgFluency || '—',
            suffix: '%',
            icon: 'solar:soundwave-linear',
            color: 'text-emerald-600 bg-emerald-50',
        },
        {
            label: 'Current Streak',
            value: progressStats.streak,
            suffix: 'days',
            icon: 'solar:fire-linear',
            color: 'text-amber-600 bg-amber-50',
        },
        {
            label: 'Practice Sessions',
            value: progressStats.totalSessions,
            suffix: 'total',
            icon: 'solar:chart-square-linear',
            color: 'text-violet-600 bg-violet-50',
        },
    ];

    return (
        <div className="bg-[#FAFAFA] min-h-screen pt-36 pb-20">
            <div className="max-w-[90rem] mx-auto px-6 md:px-12">
                <div className="mb-10 border-b border-gray-200 pb-6">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-white shadow-sm border border-gray-100 flex items-center justify-center">
                            <Icon icon="solar:graph-up-linear" width="24" className="text-indigo-600" />
                        </div>
                        <h1 className="text-4xl font-dm-sans font-semibold tracking-tight text-gray-900">Progress & Analytics</h1>
                    </div>
                    <p className="text-lg text-gray-500 md:ml-[64px] max-w-2xl">
                        Track your speaking growth with one balanced view of scores, trends, and session analytics.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-10">
                    {summaryCards.map((card) => (
                        <div key={card.label} className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6">
                            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center mb-4 ${card.color}`}>
                                <Icon icon={card.icon} width="22" />
                            </div>
                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-400 mb-2">{card.label}</p>
                            <div className="flex items-end gap-2">
                                <span className="text-4xl font-dm-sans font-semibold tracking-tight text-[#111]">{card.value}</span>
                                <span className="text-sm text-neutral-400 mb-1 font-semibold">{card.suffix}</span>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-[1.35fr_0.95fr] gap-8 mb-10">
                    <div className="bg-white rounded-[32px] border border-gray-200 shadow-sm p-8">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-2xl font-dm-sans font-semibold text-[#111] tracking-tight">Session Trend</h2>
                                <p className="text-sm text-neutral-500 font-sans mt-1">Pronunciation, fluency, and confidence across recent sessions.</p>
                            </div>
                            <div className="hidden sm:flex items-center gap-3 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-indigo-500" /> Pronunciation</span>
                                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Fluency</span>
                                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Confidence</span>
                            </div>
                        </div>
                        <div className="h-80">
                            {chartData.length === 0 ? (
                                <EmptyChart icon="solar:graph-up-linear" text="Complete practice sessions to see your progress trend." />
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#888', fontSize: 12 }} dy={10} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#888', fontSize: 12 }} dx={-10} domain={[0, 100]} />
                                        <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 12px 30px rgba(0,0,0,0.08)' }} />
                                        <Line type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={3} dot={{ r: 4 }} name="Pronunciation" />
                                        <Line type="monotone" dataKey="fluency" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} name="Fluency" />
                                        <Line type="monotone" dataKey="confidence" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} name="Confidence" />
                                    </LineChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>

                    <div className="bg-white rounded-[32px] border border-gray-200 shadow-sm p-8">
                        <div className="mb-6">
                            <h2 className="text-2xl font-dm-sans font-semibold text-[#111] tracking-tight">Skill Shape</h2>
                            <p className="text-sm text-neutral-500 font-sans mt-1">A quick snapshot of how your speaking profile is balancing out.</p>
                        </div>
                        <div className="h-80">
                            {sessions.length === 0 ? (
                                <EmptyChart icon="solar:pie-chart-2-linear" text="Practice more to build a skill profile." />
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadarChart outerRadius="72%" data={skillsData}>
                                        <PolarGrid stroke="#ececec" />
                                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#666', fontSize: 12 }} />
                                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                        <Radar name="Skills" dataKey="value" stroke="#6366f1" fill="#6366f1" fillOpacity={0.24} />
                                        <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 12px 30px rgba(0,0,0,0.08)' }} />
                                    </RadarChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-[32px] border border-gray-200 shadow-sm p-8 mb-10">
                    <div className="flex items-center justify-between gap-6 flex-wrap mb-6">
                        <div>
                            <h2 className="text-2xl font-dm-sans font-semibold text-[#111] tracking-tight">Session Analytics</h2>
                            <p className="text-sm text-neutral-500 font-sans mt-1">All your numeric insights are grouped together here for a cleaner read.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                        <div className="rounded-2xl border border-neutral-100 bg-neutral-50 p-5">
                            <p className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-400 mb-2">Words Per Minute</p>
                            <p className="text-3xl font-dm-sans font-semibold text-[#111]">{analyticsMetrics.avgWpm || '—'}</p>
                        </div>
                        <div className="rounded-2xl border border-neutral-100 bg-neutral-50 p-5">
                            <p className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-400 mb-2">Pauses Per Session</p>
                            <p className="text-3xl font-dm-sans font-semibold text-[#111]">{analyticsMetrics.avgPauses || '—'}</p>
                        </div>
                        <div className="rounded-2xl border border-neutral-100 bg-neutral-50 p-5">
                            <p className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-400 mb-2">Average Accuracy</p>
                            <p className="text-3xl font-dm-sans font-semibold text-[#111]">{analyticsMetrics.avgAccuracy || '—'}<span className="text-lg">%</span></p>
                        </div>
                        <div className="rounded-2xl border border-neutral-100 bg-neutral-50 p-5">
                            <p className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-400 mb-2">Detected Accent</p>
                            <p className="text-2xl font-dm-sans font-semibold text-[#111]">{analyticsMetrics.accent}</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                    <div className="bg-white rounded-[32px] border border-gray-200 shadow-sm p-8">
                        <div className="mb-6">
                            <h2 className="text-2xl font-dm-sans font-semibold text-[#111] tracking-tight">Pace & Pauses</h2>
                            <p className="text-sm text-neutral-500 font-sans mt-1">Compare speaking speed with pause count over recent sessions.</p>
                        </div>
                        <div className="h-80">
                            {pauseChartData.length === 0 ? (
                                <EmptyChart icon="solar:chart-square-linear" text="Record sessions to populate speed and pause analytics." />
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={pauseChartData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#888', fontSize: 12 }} dy={10} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#888', fontSize: 12 }} dx={-10} />
                                        <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 12px 30px rgba(0,0,0,0.08)' }} />
                                        <Bar dataKey="pauses" fill="#818cf8" radius={[8, 8, 0, 0]} name="Pauses" />
                                        <Bar dataKey="wpm" fill="#34d399" radius={[8, 8, 0, 0]} name="WPM" />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>

                    <div className="bg-white rounded-[32px] border border-gray-200 shadow-sm p-8">
                        <div className="mb-6">
                            <h2 className="text-2xl font-dm-sans font-semibold text-[#111] tracking-tight">Progress Notes</h2>
                            <p className="text-sm text-neutral-500 font-sans mt-1">A simple read of where you are doing well and what to keep practicing.</p>
                        </div>
                        <div className="space-y-4">
                            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-4">
                                <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-600 mb-2">Strong Area</p>
                                <p className="text-[15px] text-emerald-900 font-sans leading-relaxed">
                                    {progressStats.avgPronunciation >= progressStats.avgFluency
                                        ? 'Your pronunciation scores are leading right now. Keep repeating full sentences to lock in that consistency.'
                                        : 'Your fluency is moving well. Keep speaking in longer phrases so smooth delivery stays natural.'}
                                </p>
                            </div>
                            <div className="rounded-2xl border border-amber-100 bg-amber-50 px-5 py-4">
                                <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-600 mb-2">Focus Next</p>
                                <p className="text-[15px] text-amber-900 font-sans leading-relaxed">
                                    {analyticsMetrics.avgPauses > 3
                                        ? 'Work on reducing pauses by reading short lines in one breath and repeating them at a steady pace.'
                                        : 'Keep improving confidence by repeating the same sentence two or three times until the rhythm feels settled.'}
                                </p>
                            </div>
                            <div className="rounded-2xl border border-indigo-100 bg-indigo-50 px-5 py-4">
                                <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600 mb-2">Practice Volume</p>
                                <p className="text-[15px] text-indigo-900 font-sans leading-relaxed">
                                    {sessions.length > 0
                                        ? `You have completed ${sessions.length} practice sessions and worked through about ${progressStats.wordsPracticed} spoken words so far.`
                                        : 'Complete your first session to unlock session-based progress tracking here.'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProgressDashboard;
