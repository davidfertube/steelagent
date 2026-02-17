/**
 * Login Page
 * User authentication entry point
 */

import { LoginForm } from '@/components/auth/login-form';
import Link from 'next/link';

export const metadata = {
  title: 'Sign In | SpecVault',
  description: 'Sign in to your SpecVault account',
};

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f0f1e] via-[#1a1a2e] to-[#0f0f1e] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <h1 className="text-3xl font-bold text-white">SpecVault</h1>
          </Link>
          <p className="text-gray-400 mt-2">Sign in to your account</p>
        </div>

        {/* Login Form */}
        <div className="bg-[#16213e]/50 backdrop-blur-sm border border-gray-800 rounded-lg p-8">
          <LoginForm />
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-gray-400">
          By signing in, you agree to our{' '}
          <Link href="/terms" className="text-blue-400 hover:text-blue-300">
            Terms
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="text-blue-400 hover:text-blue-300">
            Privacy Policy
          </Link>
        </div>
      </div>
    </div>
  );
}
