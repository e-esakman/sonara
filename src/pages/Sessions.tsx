import { useState, useRef } from 'react';
import { Icon } from '@iconify/react';
import { useStore } from '../store/useStore';
import { getPassageById } from '../data/passages';

const Sessions = () => {
    const { sessions } = useStore();
    const [playingId, setPlayingId] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const handlePlay = (sessionId: string, audioUrl?: string) => {
        if (playingId === sessionId) {
            // Stop
            audioRef.current?.pause();
            setPlayingId(null);
            return;
        }

        if (audioUrl) {
            if (audioRef.current) audioRef.current.pause();
            const audio = new Audio(audioUrl);
            audio.onended = () => setPlayingId(null);
            audio.play().catch(console.error);
            audioRef.current = audio;
            setPlayingId(sessionId);
        }
    };

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric',
            hour: 'numeric', minute: '2-digit', hour12: true
        });
    };

    return (
        <div className="pt-36 min-h-screen bg-neutral-50 pb-20">
            <div className="max-w-4xl mx-auto px-6">
                <h1 className="text-4xl font-dm-sans text-[#111] mb-2 tracking-tight">Session History</h1>
                <p className="text-neutral-500 font-sans mb-12">Review your past speaking attempts and listen to your recordings.</p>

                {sessions.length === 0 ? (
                    <div className="bg-white rounded-3xl p-12 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-neutral-100 text-center">
                        <Icon icon="solar:clipboard-text-linear" width="48" className="text-neutral-200 mx-auto mb-4" />
                        <h3 className="text-xl font-dm-sans text-[#111] mb-2">No sessions yet</h3>
                        <p className="text-neutral-500 font-sans text-sm">Complete a practice session to see your history here.</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-6">
                        {sessions.map((session) => {
                            const passage = getPassageById(session.passageId);
                            return (
                                <div key={session.sessionId} className="bg-white p-6 md:p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-neutral-100 flex flex-col md:flex-row gap-6 md:items-center">

                                    <div className="flex-1 flex flex-col gap-3">
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                                                {formatDate(session.createdAt)}
                                            </span>
                                            {passage && (
                                                <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-sans font-medium">
                                                    {passage.title}
                                                </span>
                                            )}
                                        </div>

                                        <div>
                                            <h4 className="text-xs text-neutral-500 mb-1">Expected:</h4>
                                            <p className="text-sm text-neutral-700 font-sans line-clamp-2">{session.expectedText.slice(0, 150)}...</p>
                                        </div>

                                        <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-100 relative">
                                            <h4 className="text-xs text-neutral-500 mb-1 block">You said:</h4>
                                            <p className="text-base font-dm-sans text-[#111] italic">"{session.spokenTranscript}"</p>
                                            <Icon icon="solar:quote-right-bold" className="absolute top-4 right-4 text-neutral-200 opacity-50" width="32" />
                                        </div>

                                        {/* Score pills */}
                                        <div className="flex flex-wrap gap-2 mt-1">
                                            <span className="text-xs font-sans bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full">
                                                Accuracy: {session.pronunciationScore}%
                                            </span>
                                            <span className="text-xs font-sans bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full">
                                                Fluency: {session.fluencyScore}%
                                            </span>
                                            <span className="text-xs font-sans bg-amber-50 text-amber-600 px-3 py-1 rounded-full">
                                                Confidence: {session.confidenceScore}%
                                            </span>
                                            <span className="text-xs font-sans bg-neutral-100 text-neutral-600 px-3 py-1 rounded-full">
                                                {session.wordsPerMinute} wpm
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex md:flex-col items-center justify-between md:justify-center gap-6 md:px-6 md:border-l border-neutral-100">
                                        <div className="flex flex-col items-center">
                                            <span className="text-3xl font-dm-sans font-medium text-[#111]">{session.pronunciationScore}</span>
                                            <span className="text-xs text-neutral-500 uppercase tracking-wide">Score</span>
                                        </div>

                                        {session.audioUrl && (
                                            <button
                                                onClick={() => handlePlay(session.sessionId, session.audioUrl)}
                                                className={`w-12 h-12 flex items-center justify-center rounded-full transition-colors ${playingId === session.sessionId
                                                    ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-200'
                                                    : 'bg-neutral-100 text-[#111] hover:bg-neutral-200'
                                                    }`}
                                            >
                                                <Icon icon={playingId === session.sessionId ? "solar:pause-linear" : "solar:play-linear"} width="20" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Sessions;
