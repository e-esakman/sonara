import { Icon } from '@iconify/react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useStore } from '../store/useStore';

const Navigation = () => {
    const [isOpen, setIsOpen] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout, autismMode, toggleAutismMode, focusMode, toggleFocusMode, gentleFeedback, toggleGentleFeedback } = useStore();

    const navLinks = [
        { to: '/', label: 'Home' },
        { to: '/practice', label: 'Practice' },
        { to: '/library', label: 'Library' },
        { to: '/progress', label: 'Progress' },
        { to: '/analytics', label: 'Analytics' },
        { to: '/sessions', label: 'Sessions' },
    ];

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <nav className="fixed top-0 left-0 w-full z-50 px-4 sm:px-6 py-4 flex justify-between items-center bg-white/40 backdrop-blur-md border-b border-neutral-200/50 transition-all">
            <Link to="/" className="text-xl tracking-tight text-[#111] flex items-center gap-2 font-normal font-dm-sans shrink-0">
                <Icon icon="solar:soundwave-linear" width="24" />
                Sonara
            </Link>

            <div className="hidden md:flex gap-6 lg:gap-8 text-sm font-normal text-neutral-600">
                {navLinks.map(link => (
                    <Link
                        key={link.to}
                        to={link.to}
                        className={`transition-colors font-sans whitespace-nowrap ${location.pathname === link.to ? 'text-[#111] font-medium' : 'hover:text-[#111]'
                            }`}
                    >
                        {link.label}
                    </Link>
                ))}
            </div>

            <div className="flex items-center gap-3 text-sm font-medium shrink-0">
                {/* Autism Mode Toggle */}
                {user && (
                    <>
                        <button
                            onClick={toggleAutismMode}
                            className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-sans transition-all duration-200 ${autismMode
                                ? 'bg-violet-100 text-violet-700 border border-violet-200'
                                : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'
                                }`}
                            title="Comfort Mode — slower analysis, clearer feedback, encouraging style"
                        >
                            <Icon icon="solar:accessibility-linear" width="14" />
                            {autismMode ? 'Comfort On' : 'Comfort'}
                        </button>
                        <button
                            onClick={toggleFocusMode}
                            className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-sans transition-all duration-200 ${focusMode
                                ? 'bg-blue-100 text-blue-700 border border-blue-200'
                                : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'
                                }`}
                            title="Focus Reading Mode — larger text, reduced distractions"
                        >
                            <Icon icon="solar:eye-linear" width="14" />
                            {focusMode ? 'Focus On' : 'Focus'}
                        </button>
                    </>
                )}

                {user ? (
                    <div className="hidden md:flex items-center gap-3">
                        <span className="text-neutral-500 font-sans text-xs">{user.name}</span>
                        <button
                            onClick={handleLogout}
                            className="text-neutral-500 hover:text-[#111] transition-colors font-sans text-xs"
                        >
                            Sign out
                        </button>
                    </div>
                ) : (
                    <Link to="/login" className="hidden md:block text-neutral-600 hover:text-[#111] transition-colors font-sans">
                        Sign in
                    </Link>
                )}
                <Link to={user ? "/library" : "/login"} className="hidden md:block bg-[#111] text-white px-5 py-2.5 rounded-full hover:bg-neutral-800 transition-colors tracking-tight font-sans text-sm">
                    Get Started
                </Link>

                {/* Mobile Menu Button */}
                <button className="md:hidden text-[#111]" onClick={() => setIsOpen(!isOpen)}>
                    <Icon icon={isOpen ? "solar:close-circle-linear" : "solar:hamburger-menu-linear"} width="28" />
                </button>
            </div>

            {/* Mobile Menu Dropdown */}
            {isOpen && (
                <div className="absolute top-full left-0 w-full bg-white/95 backdrop-blur-md border-b border-neutral-200 shadow-lg md:hidden flex flex-col p-6 gap-5">
                    {navLinks.map(link => (
                        <Link key={link.to} to={link.to} onClick={() => setIsOpen(false)} className="text-lg font-dm-sans text-[#111]">
                            {link.label}
                        </Link>
                    ))}
                    <div className="border-t border-neutral-200 pt-4 flex flex-col gap-3">
                        {/* Autism toggle in mobile */}
                        {user && (
                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={toggleAutismMode}
                                    className={`flex items-center gap-2 text-sm font-sans ${autismMode ? 'text-violet-600' : 'text-neutral-500'}`}
                                >
                                    <Icon icon="solar:accessibility-linear" width="18" />
                                    {autismMode ? 'Comfort Mode: On' : 'Comfort Mode: Off'}
                                </button>
                                <button
                                    onClick={toggleFocusMode}
                                    className={`flex items-center gap-2 text-sm font-sans ${focusMode ? 'text-blue-600' : 'text-neutral-500'}`}
                                >
                                    <Icon icon="solar:eye-linear" width="18" />
                                    {focusMode ? 'Focus Mode: On' : 'Focus Mode: Off'}
                                </button>
                                <button
                                    onClick={toggleGentleFeedback}
                                    className={`flex items-center gap-2 text-sm font-sans ${gentleFeedback ? 'text-emerald-600' : 'text-neutral-500'}`}
                                >
                                    <Icon icon="solar:heart-linear" width="18" />
                                    {gentleFeedback ? 'Gentle Feedback: On' : 'Gentle Feedback: Off'}
                                </button>
                            </div>
                        )}
                        {user ? (
                            <>
                                <p className="text-sm text-neutral-500 font-sans">{user.name}</p>
                                <button onClick={() => { handleLogout(); setIsOpen(false); }} className="text-rose-500 font-sans font-medium text-left">
                                    Sign out
                                </button>
                            </>
                        ) : (
                            <Link to="/login" onClick={() => setIsOpen(false)} className="text-lg font-dm-sans text-indigo-600">
                                Sign in
                            </Link>
                        )}
                    </div>
                </div>
            )}
        </nav>
    );
};

export default Navigation;
