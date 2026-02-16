'use client';

import { useState } from 'react';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  variant: 'anonymous' | 'free' | 'quota';
  used?: number;
  limit?: number;
}

export default function UpgradeModal({ isOpen, onClose, variant, used, limit }: UpgradeModalProps) {
  const [closing, setClosing] = useState(false);

  if (!isOpen) return null;

  function handleClose() {
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      onClose();
    }, 150);
  }

  const content = {
    anonymous: {
      title: 'Free queries used',
      description: `You've used ${used || 3}/${limit || 3} free queries. Sign up to continue with 10 free queries per month.`,
      cta: 'Sign Up Free',
      ctaHref: '/auth/signup',
      secondary: null,
    },
    free: {
      title: 'Query limit reached',
      description: `You've used ${used || 10}/${limit || 10} queries this month. Upgrade to Pro for 500 queries/month.`,
      cta: 'Upgrade to Pro — $49/mo',
      ctaHref: '/pricing',
      secondary: 'View all plans',
    },
    quota: {
      title: 'Quota exceeded',
      description: `You've used all your queries for this billing period. Upgrade your plan for more capacity.`,
      cta: 'View Plans',
      ctaHref: '/pricing',
      secondary: null,
    },
  }[variant];

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity ${closing ? 'opacity-0' : 'opacity-100'}`}
      onClick={handleClose}
    >
      <div
        className={`bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-8 max-w-md w-full mx-4 transition-transform ${closing ? 'scale-95' : 'scale-100'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center">
          <div className="mx-auto w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            {content.title}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {content.description}
          </p>

          <a
            href={content.ctaHref}
            className="block w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors text-center"
          >
            {content.cta}
          </a>

          {content.secondary && (
            <a
              href="/pricing"
              className="block mt-3 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              {content.secondary}
            </a>
          )}

          <button
            onClick={handleClose}
            className="mt-4 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
