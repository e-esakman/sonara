type RoomWaveformProps = {
    samples: number[];
    active: boolean;
};

const TOTAL_BARS = 28;

const RoomWaveform = ({ samples, active }: RoomWaveformProps) => {
    const paddedSamples = [...samples];
    while (paddedSamples.length < TOTAL_BARS) {
        paddedSamples.unshift(0.08);
    }

    return (
        <div className="relative overflow-hidden rounded-[24px] border border-gray-200 bg-white px-4 py-4 shadow-sm">
            <div className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-white via-white/80 to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-white via-white/80 to-transparent" />
            <div className="flex h-20 items-end gap-1">
                {paddedSamples.slice(-TOTAL_BARS).map((sample, index) => {
                    const normalized = Math.max(0.08, Math.min(1, sample));
                    const height = 18 + normalized * 52;
                    return (
                        <div
                            key={`${index}-${sample}`}
                            className={`w-[calc((100%-27px)/28)] min-w-[3px] rounded-full transition-all duration-150 ${
                                active ? 'bg-gradient-to-t from-sky-400 via-blue-300 to-white' : 'bg-gray-200'
                            }`}
                            style={{ height }}
                        />
                    );
                })}
            </div>
        </div>
    );
};

export default RoomWaveform;
