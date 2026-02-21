import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: 'SpecVault - ASTM & API Steel Spec Search for Oil & Gas Engineers',
    template: '%s | SpecVault',
  },
  description: 'AI-powered ASTM, API 5CT, and NACE steel specification search built for oil & gas materials engineers. Instant cited answers for duplex stainless steel grades, yield strengths, and compliance verification.',
  keywords: ['ASTM steel specifications', 'API 5CT', 'NACE MR0175', 'duplex stainless steel', 'oil and gas materials compliance', 'steel grade lookup', 'A789 tubing', 'A790 pipe', 'materials engineer tool', 'specification search'],
  openGraph: {
    title: 'SpecVault - The Steel Spec Hub for Oil & Gas Engineers',
    description: 'Search ASTM, API & NACE specs in seconds. Cited answers, zero hallucinations. Built for materials engineers, QA/QC, and procurement teams in oil & gas.',
    siteName: 'SpecVault',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SpecVault - ASTM & API Steel Spec Search for Oil & Gas',
    description: 'Instant cited answers from ASTM, API 5CT, NACE standards. Built for materials engineers in oil & gas.',
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
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
