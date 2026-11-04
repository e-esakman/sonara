import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { useStore } from '../store/useStore';

const Login = () => {
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [isSignup, setIsSignup] = useState(false);
    const [error, setError] = useState('');
    const { login, signup } = useStore();
    const navigate = useNavigate();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!email.trim()) {
            setError('Please enter your email.');
            return;
        }

        if (isSignup && !name.trim()) {
            setError('Please enter your name.');
            return;
        }

        try {
            if (isSignup) {
                signup(email.trim(), name.trim());
            } else {
                login(email.trim(), name.trim() || 'User');
            }
            navigate('/practice');
        } catch {
            setError('Something went wrong. Please try again.');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-6">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-10">
                    <Link to="/" className="inline-flex items-center gap-2 text-2xl tracking-tight text-[#111] font-dm-sans">
                        <Icon icon="solar:soundwave-linear" width="28" />
                        Sonara
                    </Link>
                    <p className="text-neutral-500 font-sans mt-2">
                        {isSignup ? 'Create your account to start practicing.' : 'Sign in to continue your practice.'}
                    </p>
                </div>

                {/* Form Card */}
                <div className="bg-white rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-neutral-100">
                    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                        {isSignup && (
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-1.5 font-sans">Name</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="Your name"
                                    className="w-full px-4 py-3 rounded-xl border border-neutral-200 bg-neutral-50 text-[#111] font-sans text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition-all"
                                />
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1.5 font-sans">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                className="w-full px-4 py-3 rounded-xl border border-neutral-200 bg-neutral-50 text-[#111] font-sans text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition-all"
                            />
                        </div>

                        {!isSignup && (
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-1.5 font-sans">Name</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="Your name"
                                    className="w-full px-4 py-3 rounded-xl border border-neutral-200 bg-neutral-50 text-[#111] font-sans text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition-all"
                                />
                            </div>
                        )}

                        {error && (
                            <p className="text-rose-500 text-sm font-sans">{error}</p>
                        )}

                        <button
                            type="submit"
                            className="w-full bg-[#111] text-white py-3 rounded-full font-sans font-medium hover:bg-neutral-800 transition-colors tracking-tight"
                        >
                            {isSignup ? 'Create Account' : 'Sign In'}
                        </button>
                    </form>

                    <div className="text-center mt-6">
                        <button
                            onClick={() => { setIsSignup(!isSignup); setError(''); }}
                            className="text-sm text-neutral-500 font-sans hover:text-[#111] transition-colors"
                        >
                            {isSignup ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
