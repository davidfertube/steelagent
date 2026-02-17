import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";
import { Toaster } from "sonner";
import { Analytics } from "@vercel/analytics/react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: 'SpecVault - ASTM & API Steel Spec Search for Oil & Gas Engineers',
    template: '%s | SpecVault',
  },
  description: 'AI-powered ASTM, API 5CT, and NACE steel specification search built for oil & gas materials engineers. Instant cited answers for duplex stainless steel grades, yield strengths, and compliance verification.',
  metadataBase: new URL('https://specvault.app'),
  keywords: ['ASTM steel specifications', 'API 5CT', 'NACE MR0175', 'duplex stainless steel', 'oil and gas materials compliance', 'steel grade lookup', 'A789 tubing', 'A790 pipe', 'materials engineer tool', 'specification search'],
  openGraph: {
    title: 'SpecVault - The Steel Spec Hub for Oil & Gas Engineers',
    description: 'Search ASTM, API & NACE specs in seconds. Cited answers, zero hallucinations. Built for materials engineers, QA/QC, and procurement teams in oil & gas.',
    url: 'https://specvault.app',
    siteName: 'SpecVault',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'SpecVault - ASTM & API Steel Specification Search for Oil & Gas' }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SpecVault - ASTM & API Steel Spec Search for Oil & Gas',
    description: 'Instant cited answers from ASTM, API 5CT, NACE standards. Built for materials engineers in oil & gas.',
    images: ['/og-image.png'],
  },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/icon.svg',
  },
  manifest: '/site.webmanifest',
  robots: { index: true, follow: true },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn(inter.className, "antialiased")}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <AuthProvider>
            {children}
            <Toaster position="top-right" richColors closeButton />
          </AuthProvider>
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}
