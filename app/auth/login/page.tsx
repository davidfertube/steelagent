/**
 * Login Page
 * User authentication entry point
 */

import { LoginForm } from '@/components/auth/login-form';
import { Logo } from '@/components/ui/logo';
import Link from 'next/link';

export const metadata = {
  title: 'Sign In | SpecVault',
  description: 'Sign in to your SpecVault account',
};

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <Logo size={32} />
            <h1 className="text-3xl font-bold text-black dark:text-white">SpecVault</h1>
          </Link>
          <p className="text-black/50 dark:text-white/50 mt-2">Sign in to your account</p>
        </div>

        {/* Login Form */}
        <div className="bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10 rounded-xl p-8 shadow-lg shadow-black/5 dark:shadow-white/5">
          <LoginForm />
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-black/40 dark:text-white/40">
          By signing in, you agree to our{' '}
          <Link href="/terms" className="text-green-600 dark:text-green-400 hover:underline">
            Terms
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="text-green-600 dark:text-green-400 hover:underline">
            Privacy Policy
          </Link>
        </div>
      </div>
    </div>
  );
}
