"use client";

import { useState, useCallback, FormEvent, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Menu, X, Sun, Moon, CheckCircle, Shield, FileText, Microscope, ClipboardCheck, Package, Scale } from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { SearchForm } from "@/components/search-form";
import { RealtimeComparison } from "@/components/realtime-comparison";
import { DocumentUpload } from "@/components/document-upload";

import { Source, GenericLLMResponse, ConfidenceScore } from "@/lib/api";
import { Logo } from "@/components/ui/logo";

// Static product mockup for hero section
function HeroProductMockup() {
  return (
    <motion.div
      className="relative w-full max-w-[620px] mx-auto"
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
    >
      <motion.div
        className="absolute -inset-4 bg-green-500/10 dark:bg-green-500/5 rounded-3xl blur-2xl"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="relative bg-neutral-900 dark:bg-neutral-950 rounded-2xl shadow-2xl shadow-black/40 border border-neutral-800 overflow-hidden">
        {/* Terminal header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-neutral-800">
          <motion.div className="w-3 h-3 rounded-full bg-red-500/80" animate={{ scale: [1, 1.15, 1], opacity: [0.8, 1, 0.8] }} transition={{ duration: 3, repeat: Infinity, delay: 0 }} />
          <motion.div className="w-3 h-3 rounded-full bg-yellow-500/80" animate={{ scale: [1, 1.15, 1], opacity: [0.8, 1, 0.8] }} transition={{ duration: 3, repeat: Infinity, delay: 0.3 }} />
          <motion.div className="w-3 h-3 rounded-full bg-green-500/80" animate={{ scale: [1, 1.15, 1], opacity: [0.8, 1, 0.8] }} transition={{ duration: 3, repeat: Infinity, delay: 0.6 }} />
          <span className="ml-2 text-sm text-neutral-400 font-medium">SpecVault</span>
        </div>
        <div className="p-6 space-y-5">
          {/* Query */}
          <motion.div
            className="bg-neutral-800/60 rounded-lg px-4 py-3 border border-neutral-700/50"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.8 }}
          >
            <p className="text-neutral-300 text-sm font-mono">What is the yield strength of S32205 per ASTM A790?<span className="inline-block w-[2px] h-4 bg-green-400 ml-0.5 align-middle animate-cursor-blink" /></p>
          </motion.div>
          {/* Answer */}
          <motion.div
            className="space-y-1"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 1.1 }}
          >
            <div className="flex items-center gap-2">
              <motion.div
                className="w-2 h-2 rounded-full bg-green-500"
                animate={{ scale: [1, 1.4, 1], opacity: [1, 0.6, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <span className="text-green-400 text-xs font-bold tracking-wider uppercase">Answer</span>
            </div>
            <p className="text-neutral-200 text-[15px] leading-relaxed">
              The minimum yield strength for S32205 duplex stainless steel per ASTM A790 is{" "}
              <strong className="text-white">65 ksi (450 MPa)</strong>.
            </p>
          </motion.div>
          {/* Source */}
          <motion.div
            className="flex items-center gap-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 1.4 }}
          >
            <div className="px-3 py-1.5 bg-neutral-800 rounded-lg border border-neutral-700/50 flex items-center gap-2">
              <svg className="w-3.5 h-3.5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-neutral-300 text-xs font-medium">ASTM A790-14, Table 1, p.3</span>
            </div>
          </motion.div>
          {/* Confidence */}
          <motion.div
            className="space-y-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 1.7 }}
          >
            <div className="flex items-center justify-between text-xs">
              <span className="text-neutral-400 font-medium">Confidence</span>
              <motion.span
                className="text-green-400 font-bold"
                animate={{ opacity: [1, 0.6, 1] }}
                transition={{ duration: 3, repeat: Infinity }}
              >94%</motion.span>
            </div>
            <div className="w-full h-2 bg-neutral-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full relative overflow-hidden"
                initial={{ width: "0%" }}
                animate={{ width: "94%" }}
                transition={{ duration: 1.2, delay: 2.0, ease: "easeOut" }}
              >
                <div className="absolute inset-0 animate-shimmer">
                  <div className="h-full w-1/2 bg-gradient-to-r from-transparent via-white/25 to-transparent" />
                </div>
              </motion.div>
            </div>
          </motion.div>
          {/* Verification */}
          <motion.div
            className="flex items-center gap-2 text-xs text-neutral-500"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 2.2 }}
          >
            <motion.svg
              className="w-3.5 h-3.5 text-green-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ duration: 2.5, repeat: Infinity }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </motion.svg>
            3 numerical claims verified
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

// Lead Form Component
function LeadForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const data = {
      firstName: formData.get('firstName') as string,
      lastName: formData.get('lastName') as string,
      email: formData.get('email') as string,
      company: formData.get('company') as string || undefined,
      phone: formData.get('phone') as string || undefined,
    };

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!result.success) {
        setError(result.error || 'Failed to submit. Please try again.');
      } else {
        setIsSubmitted(true);
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <Card className="border border-black/10 dark:border-white/10 shadow-lg shadow-black/5 dark:shadow-white/5 bg-white dark:bg-neutral-900">
        <CardContent className="p-6 sm:p-8 text-center">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-black dark:text-white mb-2">You&apos;re on the list!</h3>
          <p className="text-black/70 dark:text-white/70">We&apos;ll contact you when SpecVault is ready.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-black/10 dark:border-white/10 shadow-lg shadow-black/5 dark:shadow-white/5 bg-white dark:bg-neutral-900">
      <CardContent className="p-6 sm:p-8">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="firstName" className="text-sm font-medium text-black dark:text-white">
                First Name
              </label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                required
                disabled={isSubmitting}
                className="w-full h-11 px-4 border border-black/20 dark:border-white/20 bg-white dark:bg-neutral-800 text-black dark:text-white rounded focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20 focus:border-black dark:focus:border-white transition-colors disabled:opacity-50"
                placeholder=""
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="lastName" className="text-sm font-medium text-black dark:text-white">
                Last Name
              </label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                required
                disabled={isSubmitting}
                className="w-full h-11 px-4 border border-black/20 dark:border-white/20 bg-white dark:bg-neutral-800 text-black dark:text-white rounded focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20 focus:border-black dark:focus:border-white transition-colors disabled:opacity-50"
                placeholder=""
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-black dark:text-white">
              Work Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              required
              disabled={isSubmitting}
              className="w-full h-11 px-4 border border-black/20 dark:border-white/20 bg-white dark:bg-neutral-800 text-black dark:text-white rounded focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20 focus:border-black dark:focus:border-white transition-colors disabled:opacity-50"
              placeholder=""
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="company" className="text-sm font-medium text-black dark:text-white">
              Company
            </label>
            <input
              type="text"
              id="company"
              name="company"
              disabled={isSubmitting}
              className="w-full h-11 px-4 border border-black/20 dark:border-white/20 bg-white dark:bg-neutral-800 text-black dark:text-white rounded focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20 focus:border-black dark:focus:border-white transition-colors disabled:opacity-50"
              placeholder=""
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="phone" className="text-sm font-medium text-black dark:text-white">
              Phone Number <span className="text-black/40 dark:text-white/40">(optional)</span>
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              disabled={isSubmitting}
              className="w-full h-11 px-4 border border-black/20 dark:border-white/20 bg-white dark:bg-neutral-800 text-black dark:text-white rounded focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20 focus:border-black dark:focus:border-white transition-colors disabled:opacity-50"
              placeholder=""
            />
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <Button
            type="submit"
            size="lg"
            disabled={isSubmitting}
            className="w-full bg-black dark:bg-white text-white dark:text-black hover:bg-black/90 dark:hover:bg-white/90 h-12 text-base font-medium disabled:opacity-50 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
          >
            {isSubmitting ? 'Submitting...' : 'Join Waitlist'}
            {!isSubmitting && <ArrowRight className="ml-2 h-4 w-4" />}
          </Button>
        </form>

        <p className="text-xs text-black/50 dark:text-white/50 text-center mt-4">
          We&apos;ll contact you when SpecVault is ready. No spam, ever.
        </p>
      </CardContent>
    </Card>
  );
}

export default function Home() {
  const [response, setResponse] = useState<string | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastQuery, setLastQuery] = useState<string>("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [uploadedDocumentId, setUploadedDocumentId] = useState<number | null>(null);
  const hasDocumentUploaded = !!uploadedDocumentId;

  // Generic LLM response for comparison display
  const [genericLLMResponse, setGenericLLMResponse] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<ConfidenceScore | null>(null);

  // Refs for auto-scrolling
  const step2Ref = useRef<HTMLDivElement>(null);
  const step3Ref = useRef<HTMLDivElement>(null);

  // Prevent hydration mismatch for theme toggle
  useEffect(() => { setMounted(true); }, []);

  // Auto-scroll to Step 2 when upload completes
  useEffect(() => {
    if (hasDocumentUploaded && step2Ref.current) {
      setTimeout(() => {
        step2Ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 300);
    }
  }, [hasDocumentUploaded]);

  // Auto-scroll to Step 3 when loading starts (user clicked Run Analysis)
  useEffect(() => {
    if (isLoading && step3Ref.current) {
      setTimeout(() => {
        step3Ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 200);
    }
  }, [isLoading]);

  const handleUploadComplete = useCallback((documentId: number | null) => {
    setUploadedDocumentId(documentId);
  }, []);

  const handleResult = useCallback((result: string, resultSources: Source[]) => {
    setError(null);
    setResponse(result);
    setSources(resultSources);
  }, []);

  const handleError = useCallback((errorMessage: string) => {
    setResponse(null);
    setError(errorMessage);
  }, []);

  const handleLoadingChange = useCallback((loading: boolean) => {
    setIsLoading(loading);
    if (loading) {
      setResponse(null);
      setSources([]);
      setError(null);
      setGenericLLMResponse(null);
      setConfidence(null);
    }
  }, []);

  const handleComparisonResult = useCallback(
    (steelAgent: { response: string; sources: Source[]; confidence?: ConfidenceScore }, genericLLM: GenericLLMResponse) => {
      setError(null);
      setResponse(steelAgent.response);
      setSources(steelAgent.sources);
      setGenericLLMResponse(genericLLM.response);
      setConfidence(steelAgent.confidence ?? null);
    },
    []
  );

  return (
    <div className="flex flex-col bg-white dark:bg-neutral-950 text-black dark:text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 dark:bg-neutral-950/90 backdrop-blur-md border-b border-black/5 dark:border-white/10">
        <div className="container-wide">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight text-black dark:text-white">
              <Logo size={28} />
              SpecVault
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-4 lg:gap-8">
              {["Why", "Who", "Demo", "Contact"].map((item) => (
                <a
                  key={item}
                  href={`#${item.toLowerCase()}`}
                  className="relative text-sm text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition-colors group"
                >
                  {item}
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-green-500 transition-all duration-300 group-hover:w-full" />
                </a>
              ))}

              {/* Dark/Light Mode Toggle */}
              {mounted && (
                <button
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                  aria-label="Toggle theme"
                >
                  {theme === "dark" ? (
                    <Sun className="h-4 w-4 text-white/60 hover:text-white transition-colors" />
                  ) : (
                    <Moon className="h-4 w-4 text-black/60 hover:text-black transition-colors" />
                  )}
                </button>
              )}
            </nav>

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2 touch-target rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5 text-black dark:text-white" />
              ) : (
                <Menu className="h-5 w-5 text-black dark:text-white" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Full-screen Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-white dark:bg-neutral-950 md:hidden"
          >
            <div className="flex flex-col items-center justify-center h-full gap-8">
              {["Why", "Who", "Demo", "Contact"].map((item, i) => (
                <motion.a
                  key={item}
                  href={`#${item.toLowerCase()}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="text-3xl font-semibold text-black/80 dark:text-white/80 hover:text-black dark:hover:text-white transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item}
                </motion.a>
              ))}

              {/* Theme toggle in mobile menu */}
              {mounted && (
                <motion.button
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="flex items-center gap-3 text-lg text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition-colors mt-4"
                >
                  {theme === "dark" ? (
                    <>
                      <Sun className="h-5 w-5" />
                      Light Mode
                    </>
                  ) : (
                    <>
                      <Moon className="h-5 w-5" />
                      Dark Mode
                    </>
                  )}
                </motion.button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 pt-16">
        {/* Hero Section */}
        <section className="relative min-h-[calc(100dvh-4rem)] flex flex-col justify-center py-6 sm:py-8 md:py-12">
          <div className="container-wide">
            <div className="flex flex-col lg:flex-row gap-8 lg:gap-6 items-center">
              {/* Left: Text content */}
              <div className="flex-1 text-left space-y-5">
                <div className="space-y-4">
                  <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                    className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05] text-black dark:text-white"
                  >
                    <span className="text-green-500">The Steel Hub</span>
                    {" "}for{" "}
                    <span className="relative inline-block">
                      Oil and Gas
                      <motion.span
                        className="absolute -bottom-1 left-0 right-0 h-[3px] bg-green-500"
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ duration: 0.6, delay: 0.6 }}
                        style={{ transformOrigin: "left" }}
                      />
                    </span>
                  </motion.h1>
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                    className="text-base sm:text-lg font-semibold text-black/60 dark:text-white/60 max-w-md leading-snug"
                  >
                    Instant answers. Cited sources. Verified claims.
                  </motion.p>
                </div>

                {/* Standards Badges */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.6 }}
                  className="flex flex-wrap gap-3"
                >
                  <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 dark:bg-blue-400/10 border border-blue-500/20 dark:border-blue-400/20">
                    <span className="w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_8px_2px_rgba(96,165,250,0.5)]" />
                    <span className="text-sm font-medium text-blue-600 dark:text-blue-400">ASTM</span>
                  </span>
                  <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 dark:bg-amber-400/10 border border-amber-500/20 dark:border-amber-400/20">
                    <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_2px_rgba(251,191,36,0.5)]" />
                    <span className="text-sm font-medium text-amber-600 dark:text-amber-400">API</span>
                  </span>
                  <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 dark:bg-cyan-400/10 border border-cyan-500/20 dark:border-cyan-400/20">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_2px_rgba(34,211,238,0.5)]" />
                    <span className="text-sm font-medium text-cyan-600 dark:text-cyan-400">NACE</span>
                  </span>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.8 }}
                  className="flex px-0"
                >
                  <Button size="lg" className="bg-black dark:bg-white text-white dark:text-black hover:bg-black/90 dark:hover:bg-white/90 h-11 sm:h-12 px-6 sm:px-8 text-sm sm:text-base touch-target transition-all duration-300 hover:scale-105 hover:shadow-lg" asChild>
                    <a href="#demo">
                      Try the Demo <ArrowRight className="ml-2 h-5 w-5" />
                    </a>
                  </Button>
                </motion.div>

                {/* Key Metrics */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 1.0 }}
                  className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 pt-2"
                >
                  <div>
                    <p className="text-lg sm:text-xl md:text-2xl font-semibold text-black dark:text-white">4+ hrs</p>
                    <p className="text-xs text-black/60 dark:text-white/60">Saved per day</p>
                  </div>
                  <div>
                    <p className="text-lg sm:text-xl md:text-2xl font-semibold text-black dark:text-white">100%</p>
                    <p className="text-xs text-black/60 dark:text-white/60">Cited sources</p>
                  </div>
                  <div>
                    <p className="text-lg sm:text-xl md:text-2xl font-semibold text-black dark:text-white">~0%</p>
                    <p className="text-xs text-black/60 dark:text-white/60">Hallucination rate</p>
                  </div>
                  <div>
                    <p className="text-lg sm:text-xl md:text-2xl font-semibold text-black dark:text-white">&lt;15s</p>
                    <p className="text-xs text-black/60 dark:text-white/60">Avg response time</p>
                  </div>
                </motion.div>
              </div>

              {/* Right: Product Mockup */}
              <div className="hidden lg:block flex-shrink-0 w-[620px]">
                <HeroProductMockup />
              </div>
            </div>
          </div>
        </section>

        {/* Why SpecVault vs Generic LLMs Section */}
        <section id="why" className="relative min-h-[calc(100dvh-4rem)] flex flex-col justify-center py-6 sm:py-8 md:py-10 scroll-mt-16">
          <div className="container-wide">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="space-y-6"
            >
              {/* Section Header */}
              <div className="text-center space-y-2">
                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-black dark:text-white"
                >
                  Why SpecVault?
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="text-lg text-black/60 dark:text-white/60 max-w-3xl mx-auto leading-snug"
                >
                  Same question, two very different answers. See what <span className="text-black dark:text-white font-semibold">your documents</span> make possible.
                </motion.p>
              </div>

              {/* Shared Query Bar */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.25 }}
                className="max-w-3xl mx-auto"
              >
                <div className="bg-neutral-900 dark:bg-neutral-800 rounded-xl px-5 py-3.5 border border-neutral-700 dark:border-neutral-600 flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                  <p className="text-sm text-neutral-300 font-mono">
                    What is the yield strength of S32205 per ASTM A790?
                  </p>
                </div>
              </motion.div>

              {/* Comparison Dashboard Grid */}
              <div className="grid md:grid-cols-2 gap-4 lg:gap-6">

                {/* SpecVault Dashboard */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  whileHover={{ y: -6, scale: 1.01 }}
                  className="group rounded-2xl border border-green-200 dark:border-green-800 bg-white dark:bg-neutral-900 p-4 sm:p-5 space-y-3 hover:shadow-xl hover:border-green-300 dark:hover:border-green-700 transition-all duration-300"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 flex items-center justify-center">
                      <Shield className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-green-700 dark:text-green-400">SpecVault</h3>
                      <p className="text-xs text-green-600/70 dark:text-green-400/70">Trustworthy &amp; Traceable</p>
                    </div>
                  </div>

                  {/* Response Panel */}
                  <div className="rounded-xl bg-green-50/50 dark:bg-green-950/20 border border-green-100 dark:border-green-800/50 p-3 space-y-2 overflow-hidden relative">
                    <motion.div
                      className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-green-500/30 to-transparent"
                      animate={{ top: ["0%", "100%", "0%"] }}
                      transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                    />
                    <div className="flex items-center gap-2 text-[10px] font-semibold text-green-600/60 dark:text-green-400/60 uppercase tracking-wider">
                      <motion.div
                        className="w-1.5 h-1.5 rounded-full bg-green-500"
                        animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                      Response
                    </div>
                    <p className="text-sm text-black/90 dark:text-white/90 leading-relaxed">
                      The minimum yield strength for S32205 duplex stainless steel per ASTM A790 is <strong className="text-green-700 dark:text-green-400">65 ksi (450 MPa)</strong>.
                    </p>
                  </div>

                  {/* Source Citation */}
                  <div className="rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-black/5 dark:border-white/5 p-3 space-y-2 overflow-hidden relative">
                    <div className="flex items-center gap-2 text-[10px] font-semibold text-black/40 dark:text-white/40 uppercase tracking-wider">
                      <motion.div
                        className="w-1.5 h-1.5 rounded-full bg-green-500"
                        animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                        transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                      />
                      Source &amp; Verification
                    </div>
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.5 }}
                      className="flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg"
                    >
                      <FileText className="w-3.5 h-3.5 text-green-600 dark:text-green-400 shrink-0" />
                      <span className="text-xs font-medium text-green-700 dark:text-green-400">ASTM A790-14, Table 1, Page 3</span>
                    </motion.div>

                    {/* Confidence Bar */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-black/40 dark:text-white/40 uppercase tracking-wider font-semibold">Confidence</span>
                        <motion.span
                          className="text-xs font-bold text-green-600 dark:text-green-400"
                          animate={{ opacity: [1, 0.6, 1] }}
                          transition={{ duration: 3, repeat: Infinity }}
                        >94%</motion.span>
                      </div>
                      <div className="h-2 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full relative overflow-hidden"
                          initial={{ width: "0%" }}
                          whileInView={{ width: "94%" }}
                          viewport={{ once: true }}
                          transition={{ duration: 1.2, delay: 0.6, ease: "easeOut" }}
                        >
                          <div className="absolute inset-0 animate-shimmer">
                            <div className="h-full w-1/2 bg-gradient-to-r from-transparent via-white/25 to-transparent" />
                          </div>
                        </motion.div>
                      </div>
                    </div>

                    {/* Claim Verification */}
                    <div className="space-y-1.5 pt-1">
                      {[
                        { claim: "Yield: 65 ksi", status: "Verified" },
                        { claim: "Tensile: 90 ksi", status: "Verified" },
                        { claim: "Spec: A790", status: "Verified" },
                      ].map((item, j) => (
                        <motion.div
                          key={j}
                          initial={{ opacity: 0, x: -10 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: 0.7 + j * 0.1 }}
                          className="flex items-center gap-2"
                        >
                          <motion.div
                            animate={{
                              scale: [1, 1.2, 1],
                              filter: ["drop-shadow(0 0 0px rgba(34,197,94,0))", "drop-shadow(0 0 4px rgba(34,197,94,0.5))", "drop-shadow(0 0 0px rgba(34,197,94,0))"]
                            }}
                            transition={{ duration: 2.5, repeat: Infinity, delay: j * 0.4 }}
                          >
                            <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                          </motion.div>
                          <span className="text-[11px] text-black/60 dark:text-white/60 flex-1">{item.claim}</span>
                          <motion.span
                            className="text-[10px] font-semibold text-green-600 dark:text-green-400"
                            animate={{ opacity: [1, 0.6, 1] }}
                            transition={{ duration: 2, repeat: Infinity, delay: j * 0.3 }}
                          >{item.status}</motion.span>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {/* Audit Trail */}
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 1.1 }}
                    className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800"
                  >
                    <div className="flex items-center gap-2">
                      <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 3, repeat: Infinity }}>
                        <Shield className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                      </motion.div>
                      <span className="text-xs font-semibold text-green-700 dark:text-green-400">Audit-ready</span>
                    </div>
                    <span className="text-[10px] text-green-600/60 dark:text-green-400/60">3 claims verified against source</span>
                  </motion.div>
                </motion.div>

                {/* Generic LLM Dashboard */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                  whileHover={{ y: -6, scale: 1.01 }}
                  className="group rounded-2xl border border-red-200 dark:border-red-800 bg-white dark:bg-neutral-900 p-4 sm:p-5 space-y-3 hover:shadow-xl hover:border-red-300 dark:hover:border-red-700 transition-all duration-300"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 flex items-center justify-center">
                      <svg className="w-5 h-5 text-red-500 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-red-600 dark:text-red-400">Generic LLM</h3>
                      <p className="text-xs text-red-500/70 dark:text-red-400/70">ChatGPT / Claude / Gemini</p>
                    </div>
                  </div>

                  {/* Response Panel */}
                  <div className="rounded-xl bg-red-50/30 dark:bg-red-950/10 border border-red-100 dark:border-red-800/50 p-3 space-y-2 overflow-hidden relative">
                    <div className="flex items-center gap-2 text-[10px] font-semibold text-red-500/60 dark:text-red-400/60 uppercase tracking-wider">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                      Response
                    </div>
                    <p className="text-sm text-black/60 dark:text-white/60 leading-relaxed italic">
                      S32205 duplex stainless steel typically has a yield strength of <span className="bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 px-1 rounded font-medium not-italic">around 60-80 ksi</span>, depending on the heat treatment and product form...
                    </p>
                  </div>

                  {/* No Source */}
                  <div className="rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-black/5 dark:border-white/5 p-3 space-y-2 overflow-hidden relative">
                    <div className="flex items-center gap-2 text-[10px] font-semibold text-black/40 dark:text-white/40 uppercase tracking-wider">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                      Source &amp; Verification
                    </div>
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.5 }}
                      className="flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg"
                    >
                      <svg className="w-3.5 h-3.5 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <span className="text-xs font-medium text-red-500 dark:text-red-400">No source document available</span>
                    </motion.div>

                    {/* No Confidence */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-black/40 dark:text-white/40 uppercase tracking-wider font-semibold">Confidence</span>
                        <span className="text-xs font-bold text-black/20 dark:text-white/20">N/A</span>
                      </div>
                      <div className="h-2 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-black/5 dark:bg-white/5 rounded-full" />
                      </div>
                    </div>

                    {/* Failed Verification */}
                    <div className="space-y-1.5 pt-1">
                      {[
                        { claim: "Yield: ~60-80 ksi", status: "Unverified" },
                        { claim: "Source: none", status: "Missing" },
                        { claim: "Spec version", status: "Unknown" },
                      ].map((item, j) => (
                        <motion.div
                          key={j}
                          initial={{ opacity: 0, x: 10 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: 0.7 + j * 0.1 }}
                          className="flex items-center gap-2"
                        >
                          <motion.svg
                            className="w-3.5 h-3.5 text-red-400 shrink-0"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            animate={{
                              x: [0, -1, 1, -0.5, 0],
                              rotate: [0, -1, 1, -0.5, 0]
                            }}
                            transition={{ duration: 0.4, repeat: Infinity, repeatDelay: 3 + j * 0.5 }}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </motion.svg>
                          <span className="text-[11px] text-black/40 dark:text-white/40 flex-1">{item.claim}</span>
                          <motion.span
                            className="text-[10px] font-semibold text-red-500 dark:text-red-400"
                            animate={{ opacity: [1, 0.5, 1] }}
                            transition={{ duration: 2, repeat: Infinity, delay: j * 0.4 }}
                          >{item.status}</motion.span>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {/* Warning Footer */}
                  <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                    <div className="flex items-center gap-2">
                      <svg className="w-3.5 h-3.5 text-red-500 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <span className="text-xs font-semibold text-red-600 dark:text-red-400">Not audit-ready</span>
                    </div>
                    <span className="text-[10px] text-red-500/60 dark:text-red-400/60">Training cutoff: months old</span>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Who This Is For - Persona Section */}
        <section id="who" className="relative min-h-[calc(100dvh-4rem)] flex flex-col justify-center py-6 sm:py-8 md:py-10 scroll-mt-16">
          <div className="container-wide">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="space-y-6"
            >
              <div className="text-center space-y-2">
                <span className="text-xs font-semibold tracking-widest text-black/40 dark:text-white/40 uppercase">Who it&apos;s for</span>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-black dark:text-white">
                  Your Role, Your Answers
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Materials Engineers */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0 }}
                  whileHover={{ scale: 1.02, y: -4 }}
                  className="group rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-neutral-900 p-4 space-y-3 hover:shadow-xl hover:border-green-200 dark:hover:border-green-800 transition-all duration-300"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 flex items-center justify-center shrink-0">
                      <Microscope className="w-4 h-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm text-black dark:text-white">Materials Engineers</h3>
                      <p className="text-[11px] text-black/50 dark:text-white/50 truncate">Find mechanical properties across specs</p>
                    </div>
                  </div>
                  {/* Mini Dashboard: Property Lookup */}
                  <div className="rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-black/5 dark:border-white/5 p-3 space-y-2 overflow-hidden">
                    <div className="flex items-center gap-2 text-[10px] font-semibold text-black/40 dark:text-white/40 uppercase tracking-wider">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      Property Lookup — S32205
                    </div>
                    <div className="space-y-2">
                      {[
                        { prop: "Yield Strength", val: "65 ksi", spec: "A790", pct: 72 },
                        { prop: "Tensile Strength", val: "90 ksi", spec: "A790", pct: 100 },
                        { prop: "Elongation", val: "25%", spec: "A790", pct: 55 },
                        { prop: "Hardness", val: "293 HBW", spec: "A790", pct: 65 },
                        { prop: "PREN", val: "≥ 35", spec: "A790", pct: 78 },
                        { prop: "Impact Energy", val: "45 J", spec: "A790", pct: 50 },
                        { prop: "Density", val: "7.8 g/cm³", spec: "A790", pct: 88 },
                      ].map((row, j) => (
                        <motion.div
                          key={j}
                          initial={{ opacity: 0, x: -20 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: 0.3 + j * 0.1 }}
                          className="flex items-center gap-2"
                        >
                          <span className="text-[11px] text-black/60 dark:text-white/60 w-16 lg:w-20 shrink-0 truncate">{row.prop}</span>
                          <div className="flex-1 h-4 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden relative">
                            <motion.div
                              className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full relative overflow-hidden animate-bar-pulse"
                              initial={{ width: "0%" }}
                              whileInView={{ width: `${row.pct}%` }}
                              viewport={{ once: true }}
                              transition={{ duration: 1, delay: 0.5 + j * 0.15, ease: "easeOut" }}
                            >
                              <div className="absolute inset-0 animate-shimmer">
                                <div className="h-full w-1/2 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                              </div>
                            </motion.div>
                          </div>
                          <span className="text-[11px] font-bold text-black dark:text-white w-14 text-right shrink-0">{row.val}</span>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </motion.div>

                {/* QA/QC Inspectors */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  whileHover={{ scale: 1.02, y: -4 }}
                  className="group rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-neutral-900 p-4 space-y-3 hover:shadow-xl hover:border-green-200 dark:hover:border-green-800 transition-all duration-300"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 flex items-center justify-center shrink-0">
                      <ClipboardCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm text-black dark:text-white">QA/QC Inspectors</h3>
                      <p className="text-[11px] text-black/50 dark:text-white/50 truncate">Verify MTR data against specs</p>
                    </div>
                  </div>
                  {/* Mini Dashboard: Verification Checklist */}
                  <div className="rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-black/5 dark:border-white/5 p-3 space-y-2 overflow-hidden">
                    <div className="flex items-center gap-2 text-[10px] font-semibold text-black/40 dark:text-white/40 uppercase tracking-wider">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      MTR Verification — Heat #2847A
                    </div>
                    <div className="space-y-1.5">
                      {[
                        { check: "Yield Strength ≥ 65 ksi", mtr: "71.2 ksi", pass: true },
                        { check: "Tensile Strength ≥ 90 ksi", mtr: "97.5 ksi", pass: true },
                        { check: "Elongation ≥ 25%", mtr: "32%", pass: true },
                        { check: "Hardness ≤ 293 HBW", mtr: "256 HBW", pass: true },
                        { check: "NACE MR0175 Compliant", mtr: "Yes", pass: true },
                      ].map((row, j) => (
                        <motion.div
                          key={j}
                          initial={{ opacity: 0, x: -15 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: 0.3 + j * 0.12 }}
                          whileHover={{ x: 3, backgroundColor: "rgba(0,0,0,0.02)" }}
                          className="flex items-center gap-1.5 py-1 px-1.5 rounded-lg"
                        >
                          <motion.div
                            initial={{ scale: 0 }}
                            whileInView={{ scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.6 + j * 0.15, type: "spring", stiffness: 500 }}
                          >
                            <motion.div
                              animate={{
                                scale: [1, 1.2, 1],
                                filter: ["drop-shadow(0 0 0px rgba(34,197,94,0))", "drop-shadow(0 0 3px rgba(34,197,94,0.4))", "drop-shadow(0 0 0px rgba(34,197,94,0))"]
                              }}
                              transition={{ duration: 2, repeat: Infinity, delay: 1.5 + j * 0.3 }}
                            >
                              <CheckCircle className={`w-3.5 h-3.5 shrink-0 ${row.pass ? 'text-green-500' : 'text-red-500'}`} />
                            </motion.div>
                          </motion.div>
                          <span className="text-[11px] text-black/70 dark:text-white/70 flex-1 truncate">{row.check}</span>
                          <span className="text-[11px] font-mono font-bold text-black/80 dark:text-white/80 shrink-0">{row.mtr}</span>
                        </motion.div>
                      ))}
                    </div>
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 1.2 }}
                      className="flex items-center justify-center gap-2 py-2 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800"
                    >
                      <Shield className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                      <span className="text-xs font-semibold text-green-700 dark:text-green-400">All 5 checks passed</span>
                    </motion.div>
                  </div>
                </motion.div>

                {/* Procurement Teams */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  whileHover={{ scale: 1.02, y: -4 }}
                  className="group rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-neutral-900 p-4 space-y-3 hover:shadow-xl hover:border-green-200 dark:hover:border-green-800 transition-all duration-300"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-center shrink-0">
                      <Package className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm text-black dark:text-white">Procurement Teams</h3>
                      <p className="text-[11px] text-black/50 dark:text-white/50 truncate">Compare grades across standards</p>
                    </div>
                  </div>
                  {/* Mini Dashboard: Grade Comparison Table */}
                  <div className="rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-black/5 dark:border-white/5 p-3 space-y-2 overflow-hidden">
                    <div className="flex items-center gap-2 text-[10px] font-semibold text-black/40 dark:text-white/40 uppercase tracking-wider">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      Grade Comparison — Duplex SS
                    </div>
                    {/* Table header */}
                    <div className="grid grid-cols-4 gap-2 text-[10px] font-semibold text-black/40 dark:text-white/40 uppercase pb-1 border-b border-black/5 dark:border-white/5">
                      <span>Grade</span>
                      <span>Yield</span>
                      <span>Tensile</span>
                      <span>Spec</span>
                    </div>
                    {/* Table rows */}
                    {[
                      { grade: "S32205", yield: "65 ksi", tensile: "90 ksi", spec: "A790", highlight: true },
                      { grade: "S32205", yield: "70 ksi", tensile: "90 ksi", spec: "A789", highlight: false },
                      { grade: "S31803", yield: "65 ksi", tensile: "90 ksi", spec: "A790", highlight: false },
                      { grade: "S32750", yield: "80 ksi", tensile: "116 ksi", spec: "A790", highlight: false },
                    ].map((row, j) => (
                      <motion.div
                        key={j}
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.3 + j * 0.1 }}
                        whileHover={{ x: row.highlight ? 0 : 3 }}
                        className={`grid grid-cols-4 gap-1 py-1 px-1.5 rounded-lg text-[11px] transition-all duration-200 ${row.highlight ? 'bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 animate-border-glow-amber' : 'hover:bg-black/[0.02] dark:hover:bg-white/[0.02]'}`}
                      >
                        <span className="font-mono font-bold text-black/80 dark:text-white/80 truncate">{row.grade}</span>
                        <span className="text-black/60 dark:text-white/60">{row.yield}</span>
                        <span className="text-black/60 dark:text-white/60">{row.tensile}</span>
                        <span className="text-amber-600 dark:text-amber-400 font-medium">{row.spec}</span>
                      </motion.div>
                    ))}
                    <motion.div
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 1 }}
                      className="text-[10px] text-black/40 dark:text-white/40 text-center pt-1"
                    >
                      A789 vs A790 yield differs for S32205 — 70 vs 65 ksi
                    </motion.div>
                  </div>
                </motion.div>

                {/* Compliance Officers */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  whileHover={{ scale: 1.02, y: -4 }}
                  className="group rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-neutral-900 p-4 space-y-3 hover:shadow-xl hover:border-green-200 dark:hover:border-green-800 transition-all duration-300"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 flex items-center justify-center shrink-0">
                      <Scale className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm text-black dark:text-white">Compliance Officers</h3>
                      <p className="text-[11px] text-black/50 dark:text-white/50 truncate">Audit-ready docs with citations</p>
                    </div>
                  </div>
                  {/* Mini Dashboard: Audit Pipeline */}
                  <div className="rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-black/5 dark:border-white/5 p-3 space-y-2 overflow-hidden">
                    <div className="flex items-center gap-2 text-[10px] font-semibold text-black/40 dark:text-white/40 uppercase tracking-wider">
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                      Audit Pipeline
                    </div>
                    {/* Pipeline stages */}
                    <div className="space-y-2">
                      {[
                        { stage: "Document Upload", status: "complete", icon: "doc" },
                        { stage: "Spec Extraction", status: "complete", icon: "search" },
                        { stage: "Claim Verification", status: "complete", icon: "check" },
                        { stage: "Citation Mapping", status: "active", icon: "link" },
                        { stage: "Report Generation", status: "pending", icon: "report" },
                      ].map((step, j) => (
                        <motion.div
                          key={j}
                          initial={{ opacity: 0, x: -10 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: 0.3 + j * 0.12 }}
                          className="flex items-center gap-3"
                        >
                          <div className="flex flex-col items-center w-5">
                            <motion.div
                              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] relative ${
                                step.status === 'complete' ? 'bg-green-500 text-white' :
                                step.status === 'active' ? 'bg-purple-500 text-white' :
                                'bg-black/10 dark:bg-white/10 text-black/40 dark:text-white/40'
                              }`}
                              animate={step.status === 'complete' ? { opacity: [1, 0.7, 1] } : {}}
                              transition={{ duration: 4, repeat: Infinity, delay: j * 0.8 }}
                            >
                              {step.status === 'complete' ? '✓' : step.status === 'active' ? (
                                <>
                                  <motion.span
                                    className="relative z-10"
                                    animate={{ opacity: [1, 0.3, 1] }}
                                    transition={{ duration: 1.5, repeat: Infinity }}
                                  >●</motion.span>
                                  <span className="absolute inset-0 rounded-full bg-purple-500/30 animate-expanding-ring" />
                                </>
                              ) : '○'}
                            </motion.div>
                            {j < 4 && (
                              <div className={`w-0.5 h-2 ${
                                step.status === 'complete' ? 'bg-green-300 dark:bg-green-700' :
                                'bg-black/10 dark:bg-white/10'
                              }`} />
                            )}
                          </div>
                          <span className={`text-xs flex-1 ${
                            step.status === 'complete' ? 'text-black/70 dark:text-white/70' :
                            step.status === 'active' ? 'text-purple-700 dark:text-purple-400 font-semibold' :
                            'text-black/30 dark:text-white/30'
                          }`}>{step.stage}</span>
                          {step.status === 'active' && (
                            <motion.span
                              className="text-[10px] px-2 py-0.5 bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 rounded-full font-medium"
                              animate={{ opacity: [1, 0.5, 1] }}
                              transition={{ duration: 2, repeat: Infinity }}
                            >
                              Processing...
                            </motion.span>
                          )}
                        </motion.div>
                      ))}
                    </div>
                    <motion.div
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 1.2 }}
                      className="flex items-center justify-between pt-2 border-t border-black/5 dark:border-white/5"
                    >
                      <span className="text-[10px] text-black/40 dark:text-white/40">3 of 5 stages complete</span>
                      <div className="h-1.5 w-20 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-purple-500 to-green-500 rounded-full relative overflow-hidden"
                          initial={{ width: "0%" }}
                          whileInView={{ width: "60%" }}
                          viewport={{ once: true }}
                          transition={{ duration: 1.2, delay: 0.8, ease: "easeOut" }}
                        >
                          <div className="absolute inset-0 animate-shimmer">
                            <div className="h-full w-1/2 bg-gradient-to-r from-transparent via-white/25 to-transparent" />
                          </div>
                        </motion.div>
                      </div>
                    </motion.div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Demo Section - Combined Upload & Query */}
        <section id="demo" className="relative z-10 min-h-[calc(100dvh-4rem)] flex flex-col justify-center py-6 sm:py-8 md:py-10 scroll-mt-16 bg-white dark:bg-neutral-950">
          <div className="container-wide">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="space-y-6"
            >
              {/* Section Header */}
              <div className="text-center space-y-2">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4 }}
                  className="inline-flex items-center gap-2 px-3 py-1 border border-black/10 dark:border-white/10 rounded-full text-xs font-medium text-black/70 dark:text-white/70"
                >
                  <motion.span
                    className="w-2 h-2 bg-green-500 rounded-full"
                    animate={{ scale: [1, 1.2, 1], opacity: [1, 0.7, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  />
                  TRY IT NOW
                </motion.div>
                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight text-black dark:text-white"
                >
                  Upload & Ask
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="text-base text-black/70 dark:text-white/70 max-w-2xl mx-auto"
                >
                  Upload your steel specification PDF, then ask any question. Get cited answers instantly.
                </motion.p>
              </div>

              {/* Combined Card with Upload + Search */}
              <Card className="border border-black/10 dark:border-white/10 shadow-lg shadow-black/5 dark:shadow-white/5 bg-white dark:bg-neutral-900">
                <CardContent className="p-4 sm:p-6 lg:p-8 space-y-6">
                  {/* Upload Area */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center justify-center w-7 h-7 rounded-full bg-black dark:bg-white text-white dark:text-black text-sm font-medium">1</span>
                      <h3 className="text-lg font-semibold text-black dark:text-white">Upload PDF</h3>
                    </div>
                    <DocumentUpload onUploadComplete={handleUploadComplete} />
                  </div>

                  <Separator className="bg-black/10 dark:bg-white/10" />

                  {/* Search Area - Animated when upload completes */}
                  <motion.div
                    ref={step2Ref}
                    className={`space-y-4 p-4 -m-4 rounded-xl transition-all duration-500 ${hasDocumentUploaded ? 'bg-green-50 dark:bg-green-950/30 ring-2 ring-green-500 ring-offset-2 dark:ring-offset-neutral-900' : ''
                      }`}
                    animate={hasDocumentUploaded ? {
                      scale: [1, 1.03, 1],
                      transition: { duration: 0.6, ease: "easeOut" }
                    } : {}}
                  >
                    <div className="flex items-center gap-3">
                      <motion.span
                        className={`flex items-center justify-center w-8 h-8 rounded-full text-white text-sm font-bold transition-colors duration-300 ${hasDocumentUploaded ? 'bg-green-500' : 'bg-black dark:bg-white dark:text-black'
                          }`}
                        animate={hasDocumentUploaded ? {
                          scale: [1, 1.3, 1],
                          transition: { duration: 0.5, repeat: 3 }
                        } : {}}
                      >
                        2
                      </motion.span>
                      <h3 className={`text-lg font-semibold transition-colors duration-300 ${hasDocumentUploaded ? 'text-green-700 dark:text-green-400' : 'text-black dark:text-white'
                        }`}>
                        {hasDocumentUploaded ? "Now Ask a Question!" : "Ask a Question"}
                      </h3>
                      {hasDocumentUploaded && (
                        <motion.span
                          initial={{ opacity: 0, scale: 0.5 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="px-3 py-1 bg-green-500 text-white text-sm font-bold rounded-full"
                        >
                          ✓ Ready
                        </motion.span>
                      )}
                    </div>
                    {hasDocumentUploaded && (
                      <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-sm text-green-600 dark:text-green-400 font-medium pl-11"
                      >
                        Click a quick prompt below or type your own question
                      </motion.p>
                    )}
                    <SearchForm
                      onResult={handleResult}
                      onError={handleError}
                      onLoadingChange={handleLoadingChange}
                      onComparisonResult={handleComparisonResult}
                      onQuerySubmit={setLastQuery}
                      documentId={uploadedDocumentId}
                    />
                  </motion.div>

                  {/* Response Display */}
                  {(response || error || isLoading) && (
                    <>
                      <Separator className="bg-black/10 dark:bg-white/10" />
                      <motion.div
                        ref={step3Ref}
                        className="space-y-4"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                      >
                        <div className="flex items-center gap-3">
                          {isLoading ? (
                            <motion.span className="flex items-center justify-center w-8 h-8">
                              <motion.span
                                className="w-3 h-3 rounded-full bg-green-500"
                                animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
                                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                              />
                            </motion.span>
                          ) : response ? (
                            <motion.span
                              initial={{ opacity: 0, scale: 0.5 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="flex items-center justify-center w-8 h-8 rounded-full bg-green-500 text-white"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </motion.span>
                          ) : (
                            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-black dark:bg-white text-white dark:text-black text-sm font-medium">3</span>
                          )}
                          <h3 className="text-lg font-semibold text-black dark:text-white">
                            {isLoading ? "Analyzing your query..." : "Cited Answer"}
                          </h3>
                        </div>
                        <RealtimeComparison
                          query={lastQuery}
                          steelAgentResponse={response}
                          steelAgentSources={sources}
                          genericLLMResponse={genericLLMResponse}
                          isLoading={isLoading}
                          error={error}
                          confidence={confidence}
                          onRetry={() => setError(null)}
                        />
                      </motion.div>
                    </>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </section>

        {/* Lead Collection Section */}
        <section id="contact" className="relative min-h-[calc(100dvh-4rem)] flex flex-col justify-center py-6 sm:py-8 md:py-10 scroll-mt-16 overflow-hidden">
          <div className="container-wide">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="max-w-2xl mx-auto w-full"
            >
              <div className="text-center space-y-3 mb-6">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4 }}
                  className="inline-flex items-center gap-2 px-3 py-1 border border-black/10 dark:border-white/10 rounded-full text-xs font-medium text-black/70 dark:text-white/70"
                >
                  <motion.span
                    className="w-2 h-2 bg-amber-500 rounded-full"
                    animate={{ scale: [1, 1.2, 1], opacity: [1, 0.7, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  />
                  EARLY ACCESS
                </motion.div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-black dark:text-white">
                  Get Priority Access
                </h2>
                <p className="text-base text-black/70 dark:text-white/70 leading-snug">
                  Be the first to automate your compliance reviews with AI.
                </p>
              </div>

              <LeadForm />
            </motion.div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-6 sm:py-8 bg-white dark:bg-neutral-950">
        <div className="container-wide">
          <p className="text-center text-xs text-black/40 dark:text-white/40 max-w-2xl mx-auto">
            <strong>Disclaimer:</strong> SpecVault provides AI-generated responses for reference only.
            Always verify specifications against original source documents. Not intended for safety-critical
            decisions without professional engineering review. Users are responsible for their own document licenses.
          </p>
          <div className="flex justify-center gap-4 mt-4 text-xs text-black/40 dark:text-white/40">
            <Link href="/terms" className="hover:text-black/60 dark:hover:text-white/60 transition-colors">Terms of Service</Link>
            <span>·</span>
            <Link href="/privacy" className="hover:text-black/60 dark:hover:text-white/60 transition-colors">Privacy Policy</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
