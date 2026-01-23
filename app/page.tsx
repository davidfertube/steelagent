import { Button } from "@/components/ui/button";
import { ArrowRight, Database, Search } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 max-w-screen-2xl items-center px-4">
          <div className="mr-4 flex items-center space-x-2 font-bold">
            <Database className="h-5 w-5" />
            <span>SteelIntel</span>
          </div>
          <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
            <nav className="flex items-center space-x-6 text-sm font-medium">
              <Link
                href="/docs"
                className="transition-colors hover:text-foreground/80 text-foreground/60"
              >
                Docs
              </Link>
              <Link
                href="/specs"
                className="transition-colors hover:text-foreground/80 text-foreground/60"
              >
                Specs
              </Link>
            </nav>
            <div className="ml-4 flex items-center space-x-2">
              <Button variant="outline" className="h-9">
                Sign In
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="space-y-6 pb-8 pt-6 md:pb-12 md:pt-10 lg:py-32">
          <div className="container flex max-w-[64rem] flex-col items-center gap-4 text-center">
            <div className="rounded-2xl bg-muted px-4 py-1.5 text-sm font-medium">
              Knowledge Management for Oil & Gas Steel
            </div>
            <h1 className="font-heading text-3xl sm:text-5xl md:text-6xl lg:text-7xl">
              The intelligent engine for{" "}
              <span className="text-primary">steel specifications</span>
            </h1>
            <p className="max-w-[42rem] leading-normal text-muted-foreground sm:text-xl sm:leading-8">
              Instant answers from your technical documents. Powered by advanced semantic search and AI agents.
            </p>
            <div className="space-x-4">
              <Button size="lg" className="h-11 px-8">
                Get Started
              </Button>
              <Button size="lg" variant="outline" className="h-11 px-8">
                View Demo
              </Button>
            </div>
          </div>
        </section>

        {/* Search / Interface Placeholder */}
        <section className="container space-y-6 py-8 md:py-12 lg:py-24 max-w-[64rem]">
          <div className="mx-auto flex w-full max-w-[50rem] flex-col space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="flex flex-col space-y-2">
              <h3 className="text-xl font-semibold">Query your knowledge base</h3>
              <p className="text-sm text-muted-foreground">Ask questions about ASTM standards, material properties, or compliance.</p>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
              <input
                type="text"
                className="w-full rounded-md border border-input bg-transparent px-10 py-2.5 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="e.g. What is the yield strength requirement for A106 Grade B?"
              />
            </div>
            <div className="flex justify-end">
              <Button>
                Run Analysis <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-6 md:px-8 md:py-0">
        <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row">
          <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
            Built by{" "}
            <a
              href="#"
              target="_blank"
              rel="noreferrer"
              className="font-medium underline underline-offset-4"
            >
              Antigravity
            </a>
            .
          </p>
        </div>
      </footer>
    </div>
  );
}
