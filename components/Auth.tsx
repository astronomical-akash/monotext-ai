import React, { useState } from 'react';
import { supabase } from '../src/lib/supabase';
import { Mail, Lock, Loader2, ArrowRight } from 'lucide-react';

export const Auth = () => {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [mode, setMode] = useState<'signin' | 'signup'>('signin');
    const [errorMsg, setErrorMsg] = useState('');

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg('');

        try {
            if (mode === 'signin') {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                // App.tsx handles redirect on session change
            } else {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                });
                if (error) throw error;
                // If successful signup but no session (e.g. email confirmation required), alert user
                const { data } = await supabase.auth.getSession();
                if (!data.session) {
                    alert('Account created! Please check your email to confirm if required.');
                    setMode('signin');
                }
            }
        } catch (error) {
            setErrorMsg((error as Error).message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-white p-4">
            <div className="w-full max-w-sm">
                <div className="text-center mb-8">
                    <div className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">M</div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2">MonoText</h1>
                    <p className="text-gray-500">
                        {mode === 'signin' ? 'Welcome back' : 'Create an account'}
                    </p>
                </div>

                <form onSubmit={handleAuth} className="space-y-4">
                    {/* Email Field */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <div className="relative">
                            <Mail size={16} className="absolute left-3 top-3 text-gray-400" />
                            <input
                                type="email"
                                required
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Password Field */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                        <div className="relative">
                            <Lock size={16} className="absolute left-3 top-3 text-gray-400" />
                            <input
                                type="password"
                                required
                                minLength={6}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Error Message */}
                    {errorMsg && (
                        <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
                            {errorMsg}
                        </div>
                    )}

                    {/* Submit Button */}
                    <button
                        disabled={loading}
                        className="w-full bg-black text-white py-2 rounded-lg font-medium hover:bg-gray-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {loading && <Loader2 className="animate-spin" size={18} />}
                        {!loading && (mode === 'signin' ? 'Sign In' : 'Create Account')}
                        {!loading && <ArrowRight size={16} />}
                    </button>
                </form>

                {/* Toggle Mode */}
                <div className="mt-6 text-center text-sm">
                    <span className="text-gray-500">
                        {mode === 'signin' ? "Don't have an account? " : "Already have an account? "}
                    </span>
                    <button
                        onClick={() => {
                            setMode(mode === 'signin' ? 'signup' : 'signin');
                            setErrorMsg('');
                        }}
                        className="font-medium text-black hover:underline"
                    >
                        {mode === 'signin' ? 'Sign up' : 'Sign in'}
                    </button>
                </div>
            </div>
        </div>
    );
};
