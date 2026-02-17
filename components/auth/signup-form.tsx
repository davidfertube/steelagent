'use client';

/**
 * Signup Form Component
 * User registration with profile data + OAuth options
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/auth';
import Link from 'next/link';

type OAuthProvider = 'google' | 'github' | 'azure';

function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path fill="#F25022" d="M1 1h10v10H1z" />
      <path fill="#00A4EF" d="M1 13h10v10H1z" />
      <path fill="#7FBA00" d="M13 1h10v10H13z" />
      <path fill="#FFB900" d="M13 13h10v10H13z" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

const inputClassName = "w-full px-4 py-3 bg-white dark:bg-neutral-800 border border-black/10 dark:border-white/10 rounded-lg text-black dark:text-white placeholder-black/30 dark:placeholder-white/30 focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors";

export function SignupForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [company, setCompany] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<OAuthProvider | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Basic validation
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      setLoading(false);
      return;
    }

    try {
      await auth.signUp(email, password, {
        full_name: fullName || undefined,
        company: company || undefined,
      });

      setSuccess(true);
      setTimeout(() => {
        router.push('/auth/login');
      }, 2000);
    } catch (err) {
      console.error('Signup error:', err);
      setError(err instanceof Error ? err.message : 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthSignIn = async (provider: OAuthProvider) => {
    setError(null);
    setOauthLoading(provider);

    try {
      await auth.signInWithOAuth(provider);
    } catch (err) {
      console.error('OAuth signup error:', err);
      setError(err instanceof Error ? err.message : 'Failed to sign up with provider');
      setOauthLoading(null);
    }
  };

  const isDisabled = loading || oauthLoading !== null;

  if (success) {
    return (
      <div className="p-6 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg text-center">
        <h3 className="text-lg font-semibold text-green-700 dark:text-green-400 mb-2">Account Created!</h3>
        <p className="text-black/60 dark:text-white/60">
          Check your email to verify your account. Redirecting to login...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* OAuth Buttons */}
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => handleOAuthSignIn('google')}
          disabled={isDisabled}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white dark:bg-neutral-800 border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-50 text-black dark:text-white font-medium rounded-lg transition-colors"
        >
          <GoogleIcon />
          {oauthLoading === 'google' ? 'Redirecting...' : 'Continue with Google'}
        </button>

        <button
          type="button"
          onClick={() => handleOAuthSignIn('azure')}
          disabled={isDisabled}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white dark:bg-neutral-800 border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-50 text-black dark:text-white font-medium rounded-lg transition-colors"
        >
          <MicrosoftIcon />
          {oauthLoading === 'azure' ? 'Redirecting...' : 'Continue with Microsoft'}
        </button>

        <button
          type="button"
          onClick={() => handleOAuthSignIn('github')}
          disabled={isDisabled}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white dark:bg-neutral-800 border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-50 text-black dark:text-white font-medium rounded-lg transition-colors"
        >
          <GitHubIcon />
          {oauthLoading === 'github' ? 'Redirecting...' : 'Continue with GitHub'}
        </button>
      </div>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-black/10 dark:border-white/10" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-white dark:bg-neutral-900 px-4 text-black/40 dark:text-white/40">or sign up with email</span>
        </div>
      </div>

      {/* Email/Password Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="fullName" className="block text-sm font-medium text-black dark:text-white mb-2">
            Full Name
          </label>
          <input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            autoComplete="name"
            className={inputClassName}
            placeholder="John Doe"
            disabled={isDisabled}
          />
        </div>

        <div>
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
            className={inputClassName}
            placeholder="you@example.com"
            disabled={isDisabled}
          />
        </div>

        <div>
          <label htmlFor="company" className="block text-sm font-medium text-black dark:text-white mb-2">
            Company (Optional)
          </label>
          <input
            id="company"
            type="text"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            autoComplete="organization"
            className={inputClassName}
            placeholder="Acme Corp"
            disabled={isDisabled}
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-black dark:text-white mb-2">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            minLength={8}
            className={inputClassName}
            placeholder="Minimum 8 characters"
            disabled={isDisabled}
          />
          <p className="text-xs text-black/40 dark:text-white/40 mt-1">Must be at least 8 characters</p>
        </div>

        <button
          type="submit"
          disabled={isDisabled}
          className="w-full px-4 py-3 bg-black dark:bg-white text-white dark:text-black hover:bg-black/90 dark:hover:bg-white/90 disabled:opacity-50 font-medium rounded-lg transition-colors"
        >
          {loading ? 'Creating account...' : 'Create Account'}
        </button>

        <div className="text-center text-sm text-black/50 dark:text-white/50">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-green-600 dark:text-green-400 hover:underline">
            Sign in
          </Link>
        </div>
      </form>
    </div>
  );
}
