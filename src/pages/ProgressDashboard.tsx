import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { Icon } from '@iconify/react';
import { useStore } from '../store/useStore';

const ProgressDashboard = () => {
    const { sessions, progressStats } = useStore();

    // Build chart data from real sessions (last 10 reverse-chronological)
    const chartData = useMemo(() => {
        const recent = [...sessions].reverse().slice(-10);
        if (recent.length === 0) {
            return [{ name: 'No data', score: 0, fluency: 0, confidence: 0 }];
        }
        return recent.map((s, idx) => ({
            name: `#${idx + 1}`,
            score: s.pronunciationScore,
            fluency: s.fluencyScore,
            confidence: s.confidenceScore,
        }));
    }, [sessions]);

    const skillsData = useMemo(() => [
        { subject: 'Pronunciation', A: progressStats.avgPronunciation, fullMark: 100 },
        { subject: 'Fluency', A: progressStats.avgFluency, fullMark: 100 },
        { subject: 'Confidence', A: progressStats.avgConfidence, fullMark: 100 },
        { subject: 'Consistency', A: sessions.length > 0 ? Math.min(100, Math.round((progressStats.streak / 7) * 100)) : 0, fullMark: 100 },
        { subject: 'Vocabulary', A: sessions.length > 0 ? Math.min(100, Math.round((progressStats.wordsPracticed / 500) * 100)) : 0, fullMark: 100 },
        { subject: 'Sessions', A: sessions.length > 0 ? Math.min(100, sessions.length * 10) : 0, fullMark: 100 },
    ], [sessions, progressStats]);

    return (
        <div className="pt-24 min-h-screen bg-neutral-50 pb-20">
            <div className="max-w-6xl mx-auto px-6">
                <h1 className="text-4xl font-dm-sans text-[#111] mb-2 tracking-tight">Your Progress</h1>
                <p className="text-neutral-500 font-sans mb-12">Track your improvement over time.</p>

                {/* Summary Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
                    <div className="bg-white p-6 rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-neutral-100 flex flex-col gap-2">
                        <span className="text-sm text-neutral-500 font-medium flex items-center gap-2 font-sans">
                            <Icon icon="solar:target-linear" width="18" /> Avg Pronunciation
                        </span>
                        <span className="text-4xl tracking-tight text-[#111] font-normal font-dm-sans">{progressStats.avgPronunciation || '—'}</span>
                    </div>
                    <div className="bg-white p-6 rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-neutral-100 flex flex-col gap-2">
                        <span className="text-sm text-neutral-500 font-medium flex items-center gap-2 font-sans">
                            <Icon icon="solar:soundwave-linear" width="18" /> Avg Fluency
                        </span>
                        <span className="text-4xl tracking-tight text-[#111] font-normal font-dm-sans">{progressStats.avgFluency || '—'}</span>
                    </div>
                    <div className="bg-white p-6 rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-neutral-100 flex flex-col gap-2">
                        <span className="text-sm text-neutral-500 font-medium flex items-center gap-2 font-sans">
                            <Icon icon="solar:fire-linear" width="18" /> Daily Streak
                        </span>
                        <div className="flex items-end gap-2">
                            <span className="text-4xl tracking-tight text-[#111] font-normal font-dm-sans">{progressStats.streak}</span>
                            <span className="text-sm text-neutral-400 font-medium mb-1 font-sans">days</span>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-neutral-100 flex flex-col gap-2">
                        <span className="text-sm text-neutral-500 font-medium flex items-center gap-2 font-sans">
                            <Icon icon="solar:chat-round-line-linear" width="18" /> Sessions
                        </span>
                        <span className="text-4xl tracking-tight text-[#111] font-normal font-dm-sans">{progressStats.totalSessions}</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
                    {/* Line Chart */}
                    <div className="bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-neutral-100">
                        <h3 className="text-xl font-dm-sans text-[#111] mb-6 flex items-center gap-2">
                            <Icon icon="solar:graph-up-linear" className="text-indigo-500" />
                            Improvement Over Sessions
                        </h3>
                        <div className="h-72">
                            {sessions.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center gap-3">
                                    <Icon icon="solar:graph-up-linear" width="40" className="text-neutral-200" />
                                    <p className="text-neutral-400 font-sans text-sm">Complete practice sessions to see your progress chart.</p>
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#888', fontSize: 12 }} dy={10} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#888', fontSize: 12 }} dx={-10} domain={[0, 100]} />
                                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }} />
                                        <Line type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} name="Pronunciation" />
                                        <Line type="monotone" dataKey="fluency" stroke="#34d399" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} name="Fluency" />
                                        <Line type="monotone" dataKey="confidence" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} name="Confidence" />
                                    </LineChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>

                    {/* Radar Chart */}
                    <div className="bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-neutral-100 flex flex-col">
                        <h3 className="text-xl font-dm-sans text-[#111] mb-2 flex items-center gap-2">
                            <Icon icon="solar:pie-chart-2-linear" className="text-indigo-500" />
                            Speaking Skill Breakdown
                        </h3>
                        <div className="h-72 flex-1 relative -ml-4">
                            {sessions.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center gap-3 ml-4">
                                    <Icon icon="solar:pie-chart-2-linear" width="40" className="text-neutral-200" />
                                    <p className="text-neutral-400 font-sans text-sm">Practice to build your skills profile.</p>
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadarChart outerRadius="70%" data={skillsData}>
                                        <PolarGrid stroke="#f0f0f0" />
                                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#666', fontSize: 12 }} />
                                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                        <Radar name="Skills" dataKey="A" stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} />
                                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }} />
                                    </RadarChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProgressDashboard;
