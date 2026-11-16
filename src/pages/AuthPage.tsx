import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Lock, Mail, User } from 'lucide-react';
import { PublicHeader } from '@/src/components/PublicHeader';
import { useAuth } from '@/src/context/AuthContext';

export const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const { signIn, signUp, isSupabaseReady, user } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  if (user) {
    return (
      <div className="min-h-screen bg-[#F7F6F0] flex flex-col">
        <PublicHeader />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl border border-[#26312D]/12 p-6 text-center space-y-4">
            <h1 className="text-xl font-bold text-[#173F35] font-display">You are signed in</h1>
            <p className="text-sm text-[#26312D]/80">
              Signed in as <strong>{user.email}</strong>.
            </p>
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="w-full min-h-[44px] rounded-lg bg-[#173F35] text-white text-sm font-semibold"
            >
              Go to Farm Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);
    setSubmitting(true);

    try {
      if (mode === 'signin') {
        const { error } = await signIn(email.trim(), password);
        if (error) {
          setErrorMsg(error);
        } else {
          navigate('/dashboard');
        }
      } else {
        const { error, needsConfirmation } = await signUp(email.trim(), password, fullName.trim());
        if (error) {
          setErrorMsg(error);
        } else if (needsConfirmation) {
          setInfoMsg(
            'Account created! Check your email inbox to confirm your address before signing in.'
          );
          setMode('signin');
        } else {
          navigate('/dashboard');
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F6F0] flex flex-col">
      <PublicHeader />

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md bg-white rounded-2xl border border-[#26312D]/12 p-6 sm:p-8 space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-[#173F35] font-display">
              {mode === 'signin' ? 'Sign in to sync your farm' : 'Create your farm account'}
            </h1>
            <p className="mt-1 text-sm text-[#26312D]/75">
              {mode === 'signin'
                ? 'Access your saved broiler & layer budgets and daily logs across devices.'
                : 'Any plans already saved on this device can be migrated into your account right after sign-in.'}
            </p>
          </div>

          {!isSupabaseReady && (
            <div className="rounded-xl border border-[#E6B84A] bg-[#E6B84A]/15 p-3.5 text-xs text-[#26312D] space-y-1">
              <p className="font-semibold">Local Device Mode Active</p>
              <p>
                Cloud sync environment variables (<code>VITE_SUPABASE_URL</code>,{' '}
                <code>VITE_SUPABASE_ANON_KEY</code>) are not configured yet. You can continue using the complete app offline in Guest Mode.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 p-1 rounded-lg bg-[#F7F6F0] border border-[#26312D]/10">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setErrorMsg(null);
              }}
              className={`min-h-[40px] rounded-md text-sm font-semibold transition-colors ${
                mode === 'signin' ? 'bg-white text-[#173F35] shadow-xs' : 'text-[#26312D]/70'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setErrorMsg(null);
              }}
              className={`min-h-[40px] rounded-md text-sm font-semibold transition-colors ${
                mode === 'signup' ? 'bg-white text-[#173F35] shadow-xs' : 'text-[#26312D]/70'
              }`}
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-medium text-[#26312D] mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#26312D]/50 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Amina Bello"
                    className="w-full min-h-[44px] pl-10 pr-3.5 rounded-lg border border-[#26312D]/20 text-sm focus:outline-none focus:ring-2 focus:ring-[#173F35]"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-[#26312D] mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#26312D]/50 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="farmer@example.com"
                  className="w-full min-h-[44px] pl-10 pr-3.5 rounded-lg border border-[#26312D]/20 text-sm focus:outline-none focus:ring-2 focus:ring-[#173F35]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#26312D] mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#26312D]/50 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full min-h-[44px] pl-10 pr-3.5 rounded-lg border border-[#26312D]/20 text-sm focus:outline-none focus:ring-2 focus:ring-[#173F35]"
                />
              </div>
            </div>

            {errorMsg && (
              <p className="text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
                {errorMsg}
              </p>
            )}
            {infoMsg && (
              <p className="text-xs font-medium text-[#173F35] bg-[#4F8A5B]/15 border border-[#4F8A5B]/30 rounded-lg p-3">
                {infoMsg}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting || !isSupabaseReady}
              className="w-full min-h-[46px] rounded-lg bg-[#173F35] text-white text-sm font-semibold hover:bg-[#173F35]/90 disabled:opacity-50 transition-colors"
            >
              {submitting
                ? 'Please wait...'
                : mode === 'signin'
                ? 'Sign In'
                : 'Create Account'}
            </button>
          </form>

          <div className="pt-4 border-t border-[#26312D]/10 flex items-center justify-between text-xs">
            <span className="text-[#26312D]/70">Want to calculate offline first?</span>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-1 font-semibold text-[#173F35] hover:underline"
            >
              <span>Continue as Guest</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};
