
import React, { useState } from 'react';
import { supabase } from '../src/lib/supabase';
import { Sparkles, Mail, Lock, Loader2 } from 'lucide-react';

export const Auth = () => {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [sent, setSent] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { error } = await supabase.auth.signInWithOtp({
                email,
                options: {
                    emailRedirectTo: window.location.origin,
                },
            });
            if (error) throw error;
            setSent(true);
        } catch (error) {
            alert((error as Error).message);
        } finally {
            setLoading(false);
        }
    };

    if (sent) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-white p-4">
                <div className="text-center max-w-md">
                    <Sparkles size={48} className="mx-auto mb-4 text-black" />
                    <h1 className="text-2xl font-bold mb-2">Check your email!</h1>
                    <p className="text-gray-600 mb-6">We've sent a magic link to <strong>{email}</strong>.</p>
                    <button onClick={() => setSent(false)} className="text-sm underline text-gray-400">Try different email</button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-white p-4">
            <div className="w-full max-w-sm">
                <div className="text-center mb-10">
                    <div className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">M</div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2">MonoText</h1>
                    <p className="text-gray-500">Sign in to sync your notes</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
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

                    <button
                        disabled={loading}
                        className="w-full bg-black text-white py-2 rounded-lg font-medium hover:bg-gray-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="animate-spin" size={18} /> : <Lock size={18} />}
                        {loading ? 'Sending link...' : 'Send Magic Link'}
                    </button>
                </form>
                <p className="text-center text-xs text-gray-400 mt-8">No password required. Secure by default.</p>
            </div>
        </div>
    );
};
