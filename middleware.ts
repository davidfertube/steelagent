import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { checkRateLimit, getRateLimitHeaders, getClientIp } from './lib/rate-limit';
import { createServerClient } from '@supabase/ssr';

/**
 * Add security headers to all responses
 */
function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains'
  );
  return response;
}

// Allowed origins for CSRF protection
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://specvault.app',
  'https://www.specvault.app',
  'https://steelagent.app',
  'https://www.steelagent.app',
  'https://steelagent.io',
  'https://www.steelagent.io',
  'https://steelagent.com',
  'https://www.steelagent.com',
  process.env.NEXT_PUBLIC_APP_URL,
  process.env.PRODUCTION_URL,
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
].filter(Boolean).map(url => url.replace(/\/+$/, '')) as string[];

// API routes that require rate limiting
const RATE_LIMITED_ROUTES = [
  '/api/chat',
  '/api/documents/upload',
  '/api/documents/upload-url',
  '/api/documents/process',
  '/api/leads',
  '/api/feedback',
];

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/',
  '/auth/login',
  '/auth/signup',
  '/auth/callback',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/privacy',
  '/terms',
  '/api/health',
  '/api/leads', // Waitlist signup
  '/api/webhooks/stripe', // Stripe webhook (has its own signature verification)
];

// Routes that allow anonymous access (auth handled in route handlers)
const ANONYMOUS_ALLOWED_ROUTES = [
  '/api/chat',
  '/api/documents/upload-url',
  '/api/documents/upload',
  '/api/documents/process',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;

  // Skip health check
  if (pathname === '/api/health') {
    return addSecurityHeaders(NextResponse.next());
  }

  // Authentication check for protected routes
  const isProtectedRoute = !PUBLIC_ROUTES.some(route =>
    pathname === route || pathname.startsWith(route)
  );

  // Allow anonymous access to specific API routes (auth checked in route handlers)
  const isAnonymousAllowed = ANONYMOUS_ALLOWED_ROUTES.some(route =>
    pathname === route || pathname.startsWith(route + '/')
  );

  if (isProtectedRoute && !isAnonymousAllowed) {
    // Check for API key in header (for programmatic access)
    const apiKey = request.headers.get('x-api-key');

    if (!apiKey) {
      // Check for session cookie (for browser access)
      const response = NextResponse.next();

      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            get(name: string) {
              return request.cookies.get(name)?.value;
            },
            set(name: string, value: string, options: Record<string, unknown>) {
              response.cookies.set(name, value, options);
            },
            remove(name: string) {
              response.cookies.delete(name);
            },
          },
        }
      );

      const { data: { session } } = await supabase.auth.getSession();

      // If no session and trying to access protected page/API, redirect to login
      if (!session) {
        if (pathname.startsWith('/api/')) {
          return new NextResponse(
            JSON.stringify({ error: 'Unauthorized - Authentication required' }),
            {
              status: 401,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }

        // Redirect to login for protected pages
        const loginUrl = new URL('/auth/login', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(loginUrl);
      }

      return addSecurityHeaders(response);
    }
  }

  // Skip further middleware for non-API routes
  if (!pathname.startsWith('/api/')) {
    return addSecurityHeaders(NextResponse.next());
  }

  const startTime = Date.now();
  const clientIp = getClientIp(request);

  // Skip CSRF for webhook endpoints (they use their own signature verification)
  const isWebhookRoute = pathname.startsWith('/api/webhooks/');

  // CSRF Protection for state-changing methods
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method) && !isWebhookRoute) {
    const origin = request.headers.get('origin');
    const referer = request.headers.get('referer');

    // Check origin header
    if (origin) {
      const isAllowedOrigin = ALLOWED_ORIGINS.some(allowed => {
        if (!allowed) return false;
        return origin === allowed;
      });

      if (!isAllowedOrigin) {
        console.warn(`[Middleware] CSRF blocked - Origin: ${origin}, IP: ${clientIp}, Path: ${pathname}`);
        return new NextResponse(
          JSON.stringify({ error: 'Forbidden - Invalid origin' }),
          {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // If no origin, check referer (some browsers don't send origin)
    if (!origin && referer) {
      const refererUrl = new URL(referer);
      const isAllowedReferer = ALLOWED_ORIGINS.some(allowed => {
        if (!allowed) return false;
        try {
          const allowedUrl = new URL(allowed);
          return refererUrl.origin === allowedUrl.origin;
        } catch {
          return false;
        }
      });

      if (!isAllowedReferer) {
        console.warn(`[Middleware] CSRF blocked - Referer: ${referer}, IP: ${clientIp}, Path: ${pathname}`);
        return new NextResponse(
          JSON.stringify({ error: 'Forbidden - Invalid referer' }),
          {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // Reject requests with neither Origin nor Referer (CSRF protection)
    if (!origin && !referer) {
      console.warn(`[Middleware] CSRF blocked - No origin or referer, IP: ${clientIp}, Path: ${pathname}`);
      return new NextResponse(
        JSON.stringify({ error: 'Forbidden - Missing origin' }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  }

  // Rate limiting for API routes
  const shouldRateLimit = RATE_LIMITED_ROUTES.some(route => pathname.startsWith(route));

  if (shouldRateLimit) {
    const rateLimitResult = await checkRateLimit(clientIp, pathname);

    if (!rateLimitResult.success) {
      console.warn(`[Middleware] Rate limited - IP: ${clientIp}, Path: ${pathname}`);
      return new NextResponse(
        JSON.stringify({
          error: 'Too many requests. Please try again later.',
          retryAfter: rateLimitResult.retryAfter,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            ...getRateLimitHeaders(rateLimitResult),
          },
        }
      );
    }

    // Add rate limit headers to successful requests
    const response = NextResponse.next();
    const headers = getRateLimitHeaders(rateLimitResult);
    for (const [key, value] of Object.entries(headers)) {
      response.headers.set(key, value);
    }

    // Log request for monitoring
    const duration = Date.now() - startTime;
    console.log(`[Middleware] ${method} ${pathname} - IP: ${clientIp}, Duration: ${duration}ms, Remaining: ${rateLimitResult.remaining}`);

    return addSecurityHeaders(response);
  }

  return addSecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: [
    // Match all API routes
    '/api/:path*',
    // Match all protected app routes
    '/dashboard/:path*',
    '/account/:path*',
    '/workspace/:path*',
  ],
};
