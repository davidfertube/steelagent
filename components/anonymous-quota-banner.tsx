'use client';

interface AnonymousQuotaBannerProps {
  used: number;
  limit: number;
  remaining: number;
}

export default function AnonymousQuotaBanner({ used, limit, remaining }: AnonymousQuotaBannerProps) {
  if (remaining <= 0) {
    return (
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 text-center">
        <p className="text-amber-800 dark:text-amber-200 font-medium">
          You&apos;ve used all {limit} free queries.
        </p>
        <a
          href="/auth/signup"
          className="inline-block mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          Sign up free for 10 queries/month
        </a>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-4 py-2 flex items-center justify-between">
      <span className="text-sm text-blue-700 dark:text-blue-300">
        {remaining} of {limit} free {remaining === 1 ? 'query' : 'queries'} remaining
      </span>
      <a
        href="/auth/signup"
        className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 font-medium"
      >
        Sign up for more
      </a>
    </div>
  );
}
