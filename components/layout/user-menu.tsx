'use client';

/**
 * User Menu Component
 * Dropdown menu with user profile and logout
 */

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import type { UserProfile } from '@/lib/auth';

interface UserMenuProps {
  profile: UserProfile;
}

export function UserMenu({ profile }: UserMenuProps) {
  const router = useRouter();
  const { signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/auth/login');
      router.refresh();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const initials = profile.full_name
    ? profile.full_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : profile.email[0].toUpperCase();

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-800/50 transition-colors"
      >
        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
          {initials}
        </div>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl py-2 z-50">
          {/* User Info */}
          <div className="px-4 py-3 border-b border-neutral-700">
            <p className="text-white font-medium">{profile.full_name || 'User'}</p>
            <p className="text-gray-400 text-sm">{profile.email}</p>
            {profile.company && (
              <p className="text-gray-400 text-xs mt-1">{profile.company}</p>
            )}
          </div>

          {/* Menu Items */}
          <div className="py-2">
            <button
              onClick={() => {
                router.push('/dashboard');
                setIsOpen(false);
              }}
              className="w-full text-left px-4 py-2 text-gray-300 hover:bg-gray-800/50 hover:text-white transition-colors"
            >
              Dashboard
            </button>
            <button
              onClick={() => {
                router.push('/account');
                setIsOpen(false);
              }}
              className="w-full text-left px-4 py-2 text-gray-300 hover:bg-gray-800/50 hover:text-white transition-colors"
            >
              Account Settings
            </button>
            {(profile.role === 'admin' || profile.role === 'enterprise') && (
              <button
                onClick={() => {
                  router.push('/workspace');
                  setIsOpen(false);
                }}
                className="w-full text-left px-4 py-2 text-gray-300 hover:bg-gray-800/50 hover:text-white transition-colors"
              >
                Workspace Settings
              </button>
            )}
          </div>

          {/* Sign Out */}
          <div className="border-t border-neutral-700 pt-2">
            <button
              onClick={handleSignOut}
              className="w-full text-left px-4 py-2 text-red-400 hover:bg-gray-800/50 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
