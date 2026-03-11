import { Icon } from '@iconify/react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useStore } from '../store/useStore';

const Navigation = () => {
    const [isOpen, setIsOpen] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout, autismMode, toggleAutismMode, focusMode, toggleFocusMode, gentleFeedback, toggleGentleFeedback, accentStyle, setAccentStyle } = useStore();

    const navLinks = [
        { to: '/', label: 'Home' },
        { to: '/practice', label: 'Practice' },
        { to: '/grammar', label: 'Grammar' },
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
        <div className="fixed top-0 left-0 w-full z-50 flex flex-col pointer-events-none transition-all">
            {/* Main Floating Nav Pill */}
            <div className="w-full px-4 pt-4 sm:px-6 flex justify-center">
                <nav className="w-full max-w-7xl flex justify-between items-center bg-white/90 backdrop-blur-md shadow-sm border border-neutral-200/50 rounded-full px-5 py-3 pointer-events-auto relative">

                    {/* Logo */}
                    <Link to="/" className="text-xl tracking-tight text-[#111] flex items-center gap-2 font-normal font-dm-sans shrink-0 ml-1">
                        <Icon icon="solar:soundwave-linear" width="24" />
                        Sonara
                    </Link>

                    {/* Desktop Menu - Floating Inner Pill */}
                    <div className="hidden lg:flex items-center gap-1 bg-neutral-100/50 rounded-full p-1 border border-neutral-200/50 shadow-inner">
                        {navLinks.map(link => (
                            <Link
                                key={link.to}
                                to={link.to}
                                className={`transition-all text-sm font-medium px-4 py-2 rounded-full ${location.pathname === link.to
                                        ? 'bg-white text-[#111] shadow-sm border border-neutral-100'
                                        : 'text-neutral-500 hover:text-[#111] hover:bg-neutral-50/80'
                                    }`}
                            >
                                {link.label}
                            </Link>
                        ))}

                        {/* Accessibility Dropdown Inside Navigation */}
                        {user && (
                            <div className="relative group/access flex items-center">
                                <button className="flex items-center gap-1.5 transition-all text-sm font-medium px-4 py-2 rounded-full text-neutral-500 hover:text-[#111] hover:bg-neutral-50/80 outline-none">
                                    Accessibility
                                    <Icon icon="solar:alt-arrow-down-linear" width="14" className="group-hover/access:rotate-180 transition-transform" />
                                </button>

                                {/* Dropdown Menu */}
                                <div className="absolute top-[110%] left-1/2 -translate-x-1/2 mt-2 w-56 bg-white/95 backdrop-blur-xl border border-neutral-200/80 rounded-2xl p-2.5 shadow-[0_8px_30px_rgb(0,0,0,0.12)] opacity-0 invisible group-hover/access:opacity-100 group-hover/access:visible transition-all duration-200 z-50">
                                    <button
                                        onClick={toggleAutismMode}
                                        className={`w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-xl transition-colors ${autismMode ? 'bg-violet-50 text-violet-700' : 'text-neutral-500 hover:text-[#111] hover:bg-neutral-50'
                                            }`}
                                    >
                                        <span className="flex items-center gap-2"><Icon icon="solar:accessibility-linear" width="16" /> Comfort</span>
                                        {autismMode && <Icon icon="solar:check-circle-bold" className="text-violet-500" />}
                                    </button>
                                    <button
                                        onClick={toggleFocusMode}
                                        className={`w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-xl transition-colors mt-1 ${focusMode ? 'bg-blue-50 text-blue-700' : 'text-neutral-500 hover:text-[#111] hover:bg-neutral-50'
                                            }`}
                                    >
                                        <span className="flex items-center gap-2"><Icon icon="solar:eye-linear" width="16" /> Focus</span>
                                        {focusMode && <Icon icon="solar:check-circle-bold" className="text-blue-500" />}
                                    </button>
                                    <button
                                        onClick={toggleGentleFeedback}
                                        className={`w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-xl transition-colors mt-1 ${gentleFeedback ? 'bg-emerald-50 text-emerald-700' : 'text-neutral-500 hover:text-[#111] hover:bg-neutral-50'
                                            }`}
                                    >
                                        <span className="flex items-center gap-2"><Icon icon="solar:heart-linear" width="16" /> Gentle Feedback</span>
                                        {gentleFeedback && <Icon icon="solar:check-circle-bold" className="text-emerald-500" />}
                                    </button>
                                    <div className="px-3 pt-3 pb-1 mt-2 border-t border-neutral-100">
                                        <label className="text-[10px] uppercase text-neutral-400 font-bold tracking-wider mb-2 block">AI Coach Accent</label>
                                        <select
                                            value={accentStyle}
                                            onChange={(e) => setAccentStyle(e.target.value as 'American' | 'British' | 'Indian')}
                                            className="w-full appearance-none bg-neutral-50 hover:bg-neutral-100 text-[#111] text-xs font-sans px-3 py-2.5 rounded-lg outline-none cursor-pointer transition-colors border border-neutral-200"
                                        >
                                            <option value="American">🇺🇸 US English</option>
                                            <option value="British">🇬🇧 UK English</option>
                                            <option value="Indian">🇮🇳 Indian English</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Side Tools */}
                    <div className="flex items-center gap-3 text-sm font-medium shrink-0">
                        {user ? (
                            <div className="hidden lg:flex items-center relative group/user">
                                <button className="flex items-center gap-2 text-sm font-medium text-neutral-600 px-3 py-2 rounded-full hover:bg-neutral-50 transition-all">
                                    {user.name}
                                    <Icon icon="solar:alt-arrow-down-linear" width="14" />
                                </button>
                                <div className="absolute top-full right-0 mt-2 w-32 bg-white rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.12)] border border-neutral-200/60 p-1 opacity-0 invisible group-hover/user:opacity-100 group-hover/user:visible transition-all z-50">
                                    <button
                                        onClick={handleLogout}
                                        className="w-full text-left px-4 py-2 text-sm text-rose-500 hover:bg-rose-50 rounded-lg transition-colors font-medium"
                                    >
                                        Sign out
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <Link to="/login" className="hidden lg:block text-neutral-600 hover:text-[#111] transition-colors font-sans mr-2">
                                Sign in
                            </Link>
                        )}
                        <Link to={user ? "/library" : "/login"} className="hidden lg:block bg-[#111] text-white px-5 py-2.5 rounded-full hover:bg-neutral-800 transition-colors tracking-tight font-sans text-sm shadow-sm">
                            Get Started
                        </Link>

                        {/* Mobile Menu Button */}
                        <button className="lg:hidden text-[#111] p-1.5" onClick={() => setIsOpen(!isOpen)}>
                            <Icon icon={isOpen ? "solar:close-circle-linear" : "solar:hamburger-menu-linear"} width="28" />
                        </button>
                    </div>
                </nav>
            </div>

            {/* Mobile Menu Dropdown Wrapper */}
            {isOpen && (
                <div className="w-full bg-white/95 backdrop-blur-xl border-b border-neutral-200 shadow-xl lg:hidden flex flex-col p-6 gap-5 pointer-events-auto absolute top-[70px] left-0">
                    {navLinks.map(link => (
                        <Link key={link.to} to={link.to} onClick={() => setIsOpen(false)} className={`text-lg font-dm-sans ${location.pathname === link.to ? 'text-indigo-600 font-medium' : 'text-[#111]'}`}>
                            {link.label}
                        </Link>
                    ))}
                    <div className="border-t border-neutral-200 pt-5 flex flex-col gap-4">
                        <p className="text-xs uppercase font-bold text-neutral-400 tracking-wider">Accessibility Options</p>
                        {user && (
                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={toggleAutismMode}
                                    className={`flex items-center justify-between p-3 rounded-xl border text-sm font-sans transition-all ${autismMode ? 'bg-violet-50 text-violet-700 border-violet-200' : 'bg-neutral-50 text-neutral-600 border-neutral-200 hover:bg-neutral-100'}`}
                                >
                                    <span className="flex items-center gap-2"><Icon icon="solar:accessibility-linear" width="18" /> Comfort Mode</span>
                                    {autismMode && <Icon icon="solar:check-circle-bold" className="text-violet-600" width="18" />}
                                </button>
                                <button
                                    onClick={toggleFocusMode}
                                    className={`flex items-center justify-between p-3 rounded-xl border text-sm font-sans transition-all ${focusMode ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-neutral-50 text-neutral-600 border-neutral-200 hover:bg-neutral-100'}`}
                                >
                                    <span className="flex items-center gap-2"><Icon icon="solar:eye-linear" width="18" /> Focus Mode</span>
                                    {focusMode && <Icon icon="solar:check-circle-bold" className="text-blue-600" width="18" />}
                                </button>
                                <button
                                    onClick={toggleGentleFeedback}
                                    className={`flex items-center justify-between p-3 rounded-xl border text-sm font-sans transition-all ${gentleFeedback ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-neutral-50 text-neutral-600 border-neutral-200 hover:bg-neutral-100'}`}
                                >
                                    <span className="flex items-center gap-2"><Icon icon="solar:heart-linear" width="18" /> Gentle Feedback</span>
                                    {gentleFeedback && <Icon icon="solar:check-circle-bold" className="text-emerald-600" width="18" />}
                                </button>

                                <div className="mt-2 text-left">
                                    <select
                                        value={accentStyle}
                                        onChange={(e) => setAccentStyle(e.target.value as 'American' | 'British' | 'Indian')}
                                        className="w-full bg-neutral-50 border border-neutral-200 text-neutral-700 text-sm font-sans px-4 py-3 rounded-xl outline-none"
                                    >
                                        <option value="American">🇺🇸 American English Coach</option>
                                        <option value="British">🇬🇧 British English Coach</option>
                                        <option value="Indian">🇮🇳 Indian English Coach</option>
                                    </select>
                                </div>
                            </div>
                        )}
                        {user ? (
                            <>
                                <p className="text-sm text-neutral-500 font-sans mt-2">{user.name}</p>
                                <button onClick={() => { handleLogout(); setIsOpen(false); }} className="text-rose-500 font-sans font-medium text-left">
                                    Sign out
                                </button>
                            </>
                        ) : (
                            <Link to="/login" onClick={() => setIsOpen(false)} className="text-lg font-dm-sans text-indigo-600 mt-2">
                                Sign in
                            </Link>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Navigation;
