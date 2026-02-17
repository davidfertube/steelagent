'use client';

/**
 * Forgot Password Page
 * Request password reset email
 */

import { useState } from 'react';
import { auth } from '@/lib/auth';
import { Logo } from '@/components/ui/logo';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await auth.resetPassword(email);
      setSuccess(true);
    } catch (err) {
      console.error('Password reset error:', err);
      setError(err instanceof Error ? err.message : 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <Logo size={32} />
            <h1 className="text-3xl font-bold text-black dark:text-white">SpecVault</h1>
          </Link>
          <p className="text-black/50 dark:text-white/50 mt-2">Reset your password</p>
        </div>

        {/* Form */}
        <div className="bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10 rounded-xl p-8 shadow-lg shadow-black/5 dark:shadow-white/5">
          {success ? (
            <div className="p-6 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg text-center">
              <h3 className="text-lg font-semibold text-green-700 dark:text-green-400 mb-2">Email Sent!</h3>
              <p className="text-black/60 dark:text-white/60 mb-4">
                Check your inbox for a password reset link.
              </p>
              <Link
                href="/auth/login"
                className="inline-block text-green-600 dark:text-green-400 hover:underline"
              >
                Back to login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div>
                <p className="text-black/60 dark:text-white/60 text-sm mb-4">
                  Enter your email address and we&apos;ll send you a link to reset your password.
                </p>
                <label htmlFor="email" className="block text-sm font-medium text-black dark:text-white mb-2">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="w-full px-4 py-3 bg-white dark:bg-neutral-800 border border-black/10 dark:border-white/10 rounded-lg text-black dark:text-white placeholder-black/30 dark:placeholder-white/30 focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors"
                  placeholder="you@example.com"
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-3 bg-black dark:bg-white text-white dark:text-black hover:bg-black/90 dark:hover:bg-white/90 disabled:opacity-50 font-medium rounded-lg transition-colors"
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>

              <div className="text-center text-sm text-black/50 dark:text-white/50">
                Remember your password?{' '}
                <Link href="/auth/login" className="text-green-600 dark:text-green-400 hover:underline">
                  Sign in
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
