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

import { Source, GenericLLMResponse, ConfidenceScore, AnonymousQueryInfo } from "@/lib/api";
import { NetworkVisualization } from "@/components/network-visualization";
import { Logo } from "@/components/ui/logo";
import AnonymousQuotaBanner from "@/components/anonymous-quota-banner";

// Simulated product interface for hero section
function ProductPreview() {
  const responseText = 'The minimum yield strength for S32205 duplex stainless steel per ASTM A790 is 65 ksi (450 MPa).';
  const [displayedChars, setDisplayedChars] = useState(0);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (displayedChars < responseText.length) {
        setDisplayedChars(prev => prev + 1);
      } else if (!showDetails) {
        setTimeout(() => setShowDetails(true), 300);
      }
    }, 25);
    return () => clearTimeout(timeout);
  }, [displayedChars, showDetails]);

  const displayed = responseText.slice(0, displayedChars);
  // Bold the value portion once fully typed
  const boldStart = responseText.indexOf('65 ksi');
  const boldEnd = boldStart + '65 ksi (450 MPa)'.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.4 }}
      className="relative"
      style={{ perspective: '1200px' }}
    >
      <motion.div
        className="bg-neutral-900 dark:bg-neutral-800 rounded-xl border border-neutral-700 dark:border-neutral-600 shadow-2xl shadow-black/30 overflow-hidden"
        initial={{ rotateY: -5 }}
        whileHover={{ rotateY: 0 }}
        transition={{ duration: 0.4 }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Browser chrome */}
        <div className="flex items-center gap-2 px-4 py-3 bg-neutral-800 dark:bg-neutral-700 border-b border-neutral-700 dark:border-neutral-600">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-amber-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
          </div>
          <span className="text-xs text-neutral-400 ml-2 font-medium">SteelAgent</span>
        </div>

        <div className="p-5 space-y-4">
          {/* Query input */}
          <div className="bg-neutral-800 dark:bg-neutral-900 rounded-lg px-4 py-3 border border-neutral-700 dark:border-neutral-600">
            <p className="text-sm text-neutral-300 font-mono">
              What is the yield strength of S32205 per ASTM A790?
            </p>
          </div>

          {/* Response */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-xs font-semibold text-green-400 uppercase tracking-wider">Answer</span>
            </div>
            <p className="text-sm text-neutral-200 leading-relaxed min-h-[3rem]">
              {displayedChars <= boldStart
                ? displayed
                : (
                  <>
                    {responseText.slice(0, boldStart)}
                    <strong className="text-green-400">
                      {displayed.slice(boldStart, Math.min(displayedChars, boldEnd))}
                    </strong>
                    {displayedChars > boldEnd ? responseText.slice(boldEnd, displayedChars) : ''}
                  </>
                )
              }
              {displayedChars < responseText.length && (
                <motion.span
                  className="inline-block w-0.5 h-4 bg-green-400 ml-0.5 align-middle"
                  animate={{ opacity: [1, 0] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                />
              )}
            </p>

            {/* Source citation */}
            <AnimatePresence>
              {showDetails && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-3"
                >
                  <div className="flex items-center gap-2">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-500/10 border border-green-500/20 rounded-md">
                      <FileText className="w-3 h-3 text-green-400" />
                      <span className="text-xs font-medium text-green-400">ASTM A790-14, Table 1, p.3</span>
                    </div>
                  </div>

                  {/* Confidence bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-neutral-400">Confidence</span>
                      <span className="text-xs font-semibold text-green-400">94%</span>
                    </div>
                    <div className="h-1.5 bg-neutral-700 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full"
                        initial={{ width: '0%' }}
                        animate={{ width: '94%' }}
                        transition={{ duration: 1, delay: 0.2, ease: 'easeOut' }}
                      />
                    </div>
                  </div>

                  {/* Verification */}
                  <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                    <Shield className="w-3 h-3 text-green-400" />
                    <span>3 numerical claims verified against source</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
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
          <p className="text-black/70 dark:text-white/70">We&apos;ll contact you when SteelAgent is ready.</p>
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
          We&apos;ll contact you when SteelAgent is ready. No spam, ever.
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
  const [anonymousInfo, setAnonymousInfo] = useState<AnonymousQueryInfo | null>(null);

  // Refs for auto-scrolling
  const step2Ref = useRef<HTMLDivElement>(null);
  const step3Ref = useRef<HTMLDivElement>(null);

  // Prevent hydration mismatch for theme toggle
  // eslint-disable-next-line react-hooks/set-state-in-effect
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
    <div className="flex min-h-screen flex-col bg-white dark:bg-neutral-950 text-black dark:text-white overflow-x-hidden">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 dark:bg-neutral-950/90 backdrop-blur-md border-b border-black/5 dark:border-white/10">
        <div className="container-center">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight text-black dark:text-white">
              <Logo size={28} />
              SteelAgent
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-4 lg:gap-8">
              {["Why", "Demo", "Contact"].map((item) => (
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
              {["Why", "Demo", "Contact"].map((item, i) => (
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
        <section className="relative py-16 sm:py-24 md:py-32 overflow-hidden">
          <div className="container-wide">
            <div className="flex flex-col lg:flex-row gap-12 lg:gap-16 items-center">
              {/* Left: Text content */}
              <div className="flex-1 text-center lg:text-left space-y-8">
                {/* Badge */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="inline-flex items-center gap-2 px-3 py-1.5 border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30 rounded-full text-xs font-semibold text-green-700 dark:text-green-400"
                >
                  <motion.span
                    className="w-2 h-2 bg-green-500 rounded-full"
                    animate={{ scale: [1, 1.3, 1], opacity: [1, 0.6, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  />
                  Now in Beta
                </motion.div>

                {/* Headline */}
                <div className="space-y-5">
                  <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                    className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.08] text-black dark:text-white"
                  >
                    Specification Intelligence<br />
                    for{" "}
                    <span className="relative inline-block">
                      Steel & Materials
                      <motion.span
                        className="absolute -bottom-1.5 left-0 right-0 h-[3px] bg-green-500"
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ duration: 0.6, delay: 0.7 }}
                        style={{ transformOrigin: "left" }}
                      />
                    </span>
                  </motion.h1>
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    className="text-base sm:text-lg text-black/60 dark:text-white/60 max-w-xl leading-relaxed"
                  >
                    Search across ASTM, API, and NACE standards with natural language. Every answer includes source citations, confidence scoring, and numerical verification against the original document.
                  </motion.p>
                </div>

                {/* CTAs */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.5 }}
                  className="flex flex-wrap gap-3 sm:gap-4 justify-center lg:justify-start"
                >
                  <a href="#demo" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium bg-black dark:bg-white text-white dark:text-black hover:bg-black/90 dark:hover:bg-white/90 h-12 sm:h-14 px-6 sm:px-8 text-base sm:text-lg touch-target transition-all duration-300 hover:scale-105 hover:shadow-lg">
                    Try Demo
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </a>
                  <a href="#contact" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium border border-black/20 dark:border-white/20 bg-white dark:bg-transparent text-black dark:text-white hover:bg-black/5 dark:hover:bg-white/10 h-12 sm:h-14 px-5 sm:px-6 text-base sm:text-lg touch-target transition-all duration-300 hover:scale-105 hover:shadow-lg">
                    Get Access
                  </a>
                </motion.div>

                {/* 4-Metric Stats Row */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.7 }}
                  className="flex flex-wrap lg:flex-nowrap divide-x divide-black/10 dark:divide-white/10 pt-4"
                >
                  {[
                    { value: "91.3%", label: "Accuracy" },
                    { value: "~0%", label: "Hallucinations" },
                    { value: "96.3%", label: "Citation Rate" },
                    { value: "<15s", label: "Response Time" },
                  ].map((stat, i) => (
                    <div key={i} className="flex-1 text-center px-3 sm:px-4 py-2 first:pl-0 last:pr-0">
                      <p className="text-lg sm:text-xl md:text-2xl font-bold text-black dark:text-white">{stat.value}</p>
                      <p className="text-xs text-black/50 dark:text-white/50 mt-0.5">{stat.label}</p>
                    </div>
                  ))}
                </motion.div>

                {/* Standards Badges */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.9 }}
                  className="flex flex-wrap gap-2 justify-center lg:justify-start"
                >
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
                    ASTM
                  </span>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                    API
                  </span>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                    NACE
                  </span>
                </motion.div>
              </div>

              {/* Right: Product Preview */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="flex-1 w-full max-w-lg lg:max-w-none"
              >
                <ProductPreview />
              </motion.div>
            </div>
          </div>
        </section>

        {/* Who This Is For - Persona Section */}
        <section className="relative py-12 sm:py-16 md:py-20 border-t border-black/5 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02]">
          <div className="container-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="space-y-10"
            >
              <div className="text-center space-y-3">
                <span className="text-xs font-semibold tracking-widest text-black/40 dark:text-white/40 uppercase">Built for your team</span>
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-black dark:text-white">
                  Who Uses SteelAgent
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  {
                    icon: Microscope,
                    role: "Materials Engineers",
                    description: "Find mechanical properties across specs in seconds",
                  },
                  {
                    icon: ClipboardCheck,
                    role: "QA/QC Inspectors",
                    description: "Verify MTR data against specification requirements",
                  },
                  {
                    icon: Package,
                    role: "Procurement Teams",
                    description: "Compare material grades across standards",
                  },
                  {
                    icon: Scale,
                    role: "Compliance Officers",
                    description: "Generate audit-ready documentation with citations",
                  },
                ].map((persona, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 15 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.1 }}
                    className="group rounded-xl border border-black/5 dark:border-white/10 bg-white dark:bg-neutral-900 p-6 space-y-4 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
                  >
                    <div className="w-10 h-10 rounded-lg bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 flex items-center justify-center">
                      <persona.icon className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="space-y-1.5">
                      <h3 className="font-semibold text-black dark:text-white text-sm">{persona.role}</h3>
                      <p className="text-sm text-black/60 dark:text-white/60 leading-relaxed">{persona.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* Why SteelAgent vs Generic LLMs Section */}
        <section id="why" className="relative min-h-screen flex items-center py-12 sm:py-16 md:py-20 border-t border-black/5 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02]">
          <div className="container-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="space-y-16" // Increased spacing
            >
              {/* Section Header */}
              <div className="text-center space-y-6">
                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-black dark:text-white"
                >
                  Why SteelAgent?
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="text-xl text-black/60 dark:text-white/60 max-w-3xl mx-auto leading-relaxed"
                >
                  Generic LLMs (ChatGPT, Claude, Gemini) hallucinate specs. <br className="hidden sm:block" />
                  SteelAgent only answers from <span className="text-black dark:text-white font-semibold">your documents</span>.
                </motion.p>
              </div>

              {/* Comparison Grid */}
              <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto px-4">
                {/* SteelAgent Card */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  className="rounded-2xl border border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/30 p-8 space-y-8 hover:shadow-lg transition-shadow duration-300"
                >
                  <div className="flex flex-col items-center text-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center shadow-lg shadow-green-500/20">
                      <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-green-700 dark:text-green-400">SteelAgent</h3>
                      <p className="text-sm text-green-600/80 dark:text-green-400/80 font-medium mt-1">Trustworthy & Traceable</p>
                    </div>
                  </div>
                  <ul className="space-y-4">
                    {[
                      "Every answer traceable to page & document",
                      "Audit-ready for ISO/API/ASTM compliance",
                      "Quotes exact values from YOUR specs",
                      "Current as your latest upload",
                      "Searches YOUR documents only",
                      "Liability-safe with traceable sources",
                    ].map((item, i) => (
                      <motion.li
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.4 + i * 0.05 }}
                        className="flex items-start gap-3"
                      >
                        <div className="mt-1 flex-shrink-0 w-5 h-5 rounded-full bg-green-200 dark:bg-green-800 flex items-center justify-center">
                          <svg className="w-3.5 h-3.5 text-green-700 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <span className="text-base text-black/80 dark:text-white/80 font-medium">{item}</span>
                      </motion.li>
                    ))}
                  </ul>
                </motion.div>

                {/* Generic LLM Card */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                  className="rounded-2xl border border-red-200 dark:border-red-800 bg-red-50/30 dark:bg-red-950/30 p-8 space-y-8 hover:shadow-lg transition-shadow duration-300"
                >
                  <div className="flex flex-col items-center text-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-red-400 flex items-center justify-center shadow-lg shadow-red-400/20">
                      <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-red-600 dark:text-red-400">Generic LLM</h3>
                      <div className="mt-2 inline-block px-3 py-1 bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 text-xs font-semibold rounded-full">
                        ChatGPT / Claude / Gemini
                      </div>
                    </div>
                  </div>
                  <ul className="space-y-4">
                    {[
                      "No source citations",
                      "Not acceptable for audits",
                      "May hallucinate numbers",
                      "Training cutoff: months old",
                      "Generic internet knowledge",
                      "No accountability for errors",
                    ].map((item, i) => (
                      <motion.li
                        key={i}
                        initial={{ opacity: 0, x: 10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.5 + i * 0.05 }}
                        className="flex items-start gap-3"
                      >
                        <div className="mt-1 flex-shrink-0 w-5 h-5 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
                          <svg className="w-3.5 h-3.5 text-red-500 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </div>
                        <span className="text-base text-black/60 dark:text-white/60">{item}</span>
                      </motion.li>
                    ))}
                  </ul>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Live Comparison Section */}
        <section className="relative py-12 sm:py-16 md:py-20 bg-black/[0.02] dark:bg-white/[0.02]">
          <div className="container-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="bg-white dark:bg-neutral-900 rounded-2xl border border-black/5 dark:border-white/10 shadow-xl shadow-black/5 dark:shadow-white/5 p-8 md:p-10 max-w-4xl mx-auto"
            >
              <div className="text-center mb-8">
                <span className="text-xs font-semibold tracking-wider text-black/40 dark:text-white/40 uppercase">Live Comparison</span>
                <h4 className="text-2xl font-bold text-black dark:text-white mt-2">
                  &quot;What is the yield strength of 316L stainless steel?&quot;
                </h4>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                {/* SteelAgent Response */}
                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                      <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="font-bold text-green-700 dark:text-green-400">SteelAgent</span>
                  </div>
                  <div className="bg-green-50 dark:bg-green-950/30 rounded-xl p-5 border border-green-100 dark:border-green-800 relative">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-green-50 dark:bg-green-950/30 border-t border-l border-green-100 dark:border-green-800 rotate-45 transform"></div>
                    <p className="text-black/90 dark:text-white/90 text-lg">&quot;The minimum yield strength of 316L is <strong className="bg-green-200/50 dark:bg-green-800/50 px-1 rounded">170 MPa (25 ksi)</strong> [1]&quot;</p>
                    <div className="mt-3 flex items-center gap-2 text-xs font-medium text-green-700 dark:text-green-400 bg-white/50 dark:bg-black/20 p-2 rounded-lg border border-green-100 dark:border-green-800">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Source: ASTM_A240.pdf, Page 3
                    </div>
                  </div>
                </div>

                {/* Generic LLM Response */}
                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-red-400 flex items-center justify-center">
                      <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                    <span className="font-bold text-red-600 dark:text-red-400">Generic LLM</span>
                  </div>
                  <div className="bg-red-50/50 dark:bg-red-950/30 rounded-xl p-5 border border-red-100 dark:border-red-800 relative">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-red-50/50 dark:bg-red-950/30 border-t border-l border-red-100 dark:border-red-800 rotate-45 transform"></div>
                    <p className="text-black/60 dark:text-white/60 italic">&quot;316L stainless steel typically has a yield strength around 170-290 MPa...&quot;</p>
                    <div className="mt-3 flex items-center gap-2 text-xs font-medium text-red-500 dark:text-red-400 bg-white/50 dark:bg-black/20 p-2 rounded-lg border border-red-100 dark:border-red-800">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      No source • Cannot verify
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Demo Section - Combined Upload & Query */}
        <section id="demo" className="relative py-12 sm:py-16 md:py-20 border-t border-black/5 dark:border-white/10">
          <div className="container-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="space-y-12"
            >
              {/* Section Header */}
              <div className="text-center space-y-4">
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
                  className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-black dark:text-white"
                >
                  Upload & Ask
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="text-lg text-black/70 dark:text-white/70 max-w-2xl mx-auto"
                >
                  Upload your steel specification PDF, then ask any question. Get cited answers instantly.
                </motion.p>
              </div>

              {/* Combined Card with Upload + Search */}
              <Card className="border border-black/10 dark:border-white/10 shadow-lg shadow-black/5 dark:shadow-white/5 bg-white dark:bg-neutral-900">
                <CardContent className="p-6 sm:p-8 lg:p-10 space-y-8">
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
                    {anonymousInfo && (
                      <div className="mb-4">
                        <AnonymousQuotaBanner
                          used={anonymousInfo.used}
                          remaining={anonymousInfo.remaining}
                          limit={anonymousInfo.limit}
                        />
                      </div>
                    )}
                    {anonymousInfo && anonymousInfo.remaining <= 0 ? (
                      <div className="text-center py-6 space-y-4">
                        <p className="text-black/70 dark:text-white/70">
                          Sign up for a free account to continue querying your documents.
                        </p>
                        <a
                          href="/auth/signup"
                          className="inline-flex items-center justify-center px-6 py-3 bg-black dark:bg-white text-white dark:text-black font-semibold rounded-lg hover:opacity-90 transition-opacity"
                        >
                          Sign Up Free
                        </a>
                      </div>
                    ) : (
                      <SearchForm
                        onResult={handleResult}
                        onError={handleError}
                        onLoadingChange={handleLoadingChange}
                        onComparisonResult={handleComparisonResult}
                        onQuerySubmit={setLastQuery}
                        onAnonymousInfo={setAnonymousInfo}
                        documentId={uploadedDocumentId}
                      />
                    )}
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
        <section id="contact" className="relative py-12 sm:py-16 md:py-20 border-t border-black/5 dark:border-white/10 overflow-hidden">
          <div className="container-wide">
            <div className="flex flex-col lg:flex-row gap-12 lg:gap-16 items-center">
              {/* Left Column: Form & Content */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="flex-1 w-full max-w-2xl mx-auto lg:mx-0"
              >
                <div className="text-left space-y-6 mb-8">
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
                  <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-black dark:text-white">
                    Get Priority Access
                  </h2>
                  <p className="text-lg text-black/70 dark:text-white/70 leading-relaxed">
                    Be the first to automate your compliance reviews with AI.
                  </p>
                </div>

                {/* Lead Form */}
                <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-black/5 dark:border-white/10 shadow-xl shadow-black/5 dark:shadow-white/5 p-6 sm:p-8">
                  <LeadForm />
                </div>
              </motion.div>

              {/* Right Column: Visualization */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="flex-1 w-full hidden lg:flex items-center justify-center"
              >
                <div className="relative">
                  {/* Decorative background element */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-blue-50/50 dark:bg-blue-950/20 rounded-full blur-3xl -z-10" />
                  {/* Processing Pipeline Animation */}
                  <NetworkVisualization />
                </div>
              </motion.div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-black/5 dark:border-white/10 py-8 sm:py-12 bg-white dark:bg-neutral-950">
        <div className="container-center">
          <p className="text-center text-xs text-black/40 dark:text-white/40">&copy; {new Date().getFullYear()} SteelAgent. All rights reserved.</p>
          <Separator className="my-8 bg-black/5 dark:bg-white/10" />
          <p className="text-center text-xs text-black/40 dark:text-white/40 max-w-2xl mx-auto">
            <strong>Disclaimer:</strong> SteelAgent provides AI-generated responses for reference only.
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
