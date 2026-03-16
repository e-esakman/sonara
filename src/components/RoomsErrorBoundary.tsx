import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = {
    children: ReactNode;
};

type State = {
    hasError: boolean;
};

class RoomsErrorBoundary extends Component<Props, State> {
    state: State = {
        hasError: false,
    };

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error('[RoomsErrorBoundary] Rooms crashed', error, info);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(194,230,222,0.28),_transparent_28%),linear-gradient(180deg,_#fbfbfa_0%,_#f3efe8_100%)] pt-36 pb-20">
                    <div className="mx-auto max-w-3xl px-6 md:px-10">
                        <div className="rounded-[28px] border border-rose-200 bg-white/90 p-8 text-center shadow-[0_18px_45px_rgba(0,0,0,0.06)]">
                            <h1 className="text-2xl font-dm-sans font-semibold tracking-tight text-[#111]">
                                Something went wrong.
                            </h1>
                            <p className="mt-3 text-sm leading-relaxed text-neutral-500">
                                Reconnect to the room.
                            </p>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default RoomsErrorBoundary;
