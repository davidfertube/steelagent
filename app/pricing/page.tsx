"use client";

import { motion } from "framer-motion";
import { Check, ArrowRight, Boxes } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

const tiers = [
  {
    name: "Starter",
    price: "$49",
    period: "/user/month",
    description: "For individual engineers and small teams getting started.",
    features: [
      "100 queries per month",
      "Up to 50 documents",
      "Source citations",
      "Email support",
      "Web interface",
    ],
    cta: "Start Free Trial",
    highlighted: false,
  },
  {
    name: "Professional",
    price: "$149",
    period: "/user/month",
    description: "For engineering teams who need unlimited access and integrations.",
    features: [
      "Unlimited queries",
      "Up to 500 documents",
      "Source citations with previews",
      "API access",
      "Priority support",
      "Custom document ingestion",
      "Team management",
    ],
    cta: "Start Free Trial",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For organizations requiring on-premise deployment and compliance.",
    features: [
      "Unlimited everything",
      "On-premise deployment",
      "SSO / SAML integration",
      "Custom SLA",
      "Dedicated support",
      "SOC 2 compliance",
      "Data residency options",
      "Custom integrations (SAP, Oracle)",
    ],
    cta: "Contact Sales",
    highlighted: false,
  },
];

export default function PricingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white text-black">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-black/5">
        <div className="container-center">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-black flex items-center justify-center">
                <Boxes className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-semibold tracking-tight text-black">Steel Agent</span>
            </Link>
            <nav className="flex items-center gap-6">
              <Link href="/#features" className="text-sm text-black/60 hover:text-black transition-colors">
                Features
              </Link>
              <Link href="/#demo" className="text-sm text-black/60 hover:text-black transition-colors">
                Demo
              </Link>
              <Link href="/pricing" className="text-sm text-black hover:text-black transition-colors font-medium">
                Pricing
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-1 pt-16">
        {/* Hero */}
        <section className="py-16 sm:py-20 md:py-24">
          <div className="container-center text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="space-y-4"
            >
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight">
                Simple, transparent pricing
              </h1>
              <p className="text-lg text-black/70 max-w-2xl mx-auto">
                Start free, upgrade when you need more. All plans include a 14-day free trial.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="pb-16 sm:pb-20 md:pb-24">
          <div className="container-center">
            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {tiers.map((tier, index) => (
                <motion.div
                  key={tier.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <Card
                    className={`h-full ${
                      tier.highlighted
                        ? "border-2 border-black shadow-lg"
                        : "border border-black/10"
                    }`}
                  >
                    <CardHeader className="pb-4">
                      {tier.highlighted && (
                        <span className="text-xs font-medium bg-black text-white px-2 py-1 rounded-sm w-fit mb-2">
                          Most Popular
                        </span>
                      )}
                      <h3 className="text-xl font-semibold">{tier.name}</h3>
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-bold">{tier.price}</span>
                        <span className="text-black/60">{tier.period}</span>
                      </div>
                      <p className="text-sm text-black/60">{tier.description}</p>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <ul className="space-y-3">
                        {tier.features.map((feature) => (
                          <li key={feature} className="flex items-start gap-2">
                            <Check className="h-5 w-5 text-black shrink-0 mt-0.5" />
                            <span className="text-sm">{feature}</span>
                          </li>
                        ))}
                      </ul>
                      <Button
                        className={`w-full ${
                          tier.highlighted
                            ? "bg-black text-white hover:bg-black/90"
                            : "bg-white text-black border border-black/20 hover:bg-black/5"
                        }`}
                      >
                        {tier.cta}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ROI Section */}
        <section className="py-16 sm:py-20 border-t border-black/5 bg-black/[0.02]">
          <div className="container-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="max-w-3xl mx-auto text-center space-y-8"
            >
              <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">
                The ROI is clear
              </h2>
              <div className="grid sm:grid-cols-3 gap-8">
                <div>
                  <p className="text-4xl font-bold">2+ hrs</p>
                  <p className="text-sm text-black/60">Saved per week per engineer</p>
                </div>
                <div>
                  <p className="text-4xl font-bold">$1,200</p>
                  <p className="text-sm text-black/60">Monthly value (at $150/hr)</p>
                </div>
                <div>
                  <p className="text-4xl font-bold">10x</p>
                  <p className="text-sm text-black/60">Return on investment</p>
                </div>
              </div>
              <p className="text-black/70">
                Engineering time costs $150-300/hour. Steel Agent pays for itself
                if it saves just 1 hour per month.
              </p>
            </motion.div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16 sm:py-20 border-t border-black/5">
          <div className="container-narrow">
            <h2 className="text-3xl font-semibold tracking-tight text-center mb-12">
              Frequently asked questions
            </h2>
            <div className="space-y-6">
              {[
                {
                  q: "Do I need to provide my own documents?",
                  a: "Yes. Steel Agent is a BYOD (Bring Your Own Documents) platform. You upload your licensed PDFs and specifications. We do not provide copyrighted standards like ASTM or ASME.",
                },
                {
                  q: "How accurate are the AI responses?",
                  a: "Steel Agent uses RAG (Retrieval-Augmented Generation) to ground responses in your actual documents. Every response includes source citations so you can verify. We recommend treating responses as a starting point and always verifying against original sources for safety-critical decisions.",
                },
                {
                  q: "Is my data secure?",
                  a: "Your documents are encrypted at rest and in transit. We do not train AI models on your data. Enterprise customers can deploy on-premise for maximum security.",
                },
                {
                  q: "Can I cancel anytime?",
                  a: "Yes. Monthly plans can be canceled at any time. Annual plans are billed upfront with a 20% discount.",
                },
                {
                  q: "Do you offer discounts for startups or academia?",
                  a: "Yes! Contact us for special pricing for startups, students, and academic researchers.",
                },
              ].map((faq, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="border-b border-black/10 pb-6"
                >
                  <h3 className="font-medium mb-2">{faq.q}</h3>
                  <p className="text-sm text-black/70">{faq.a}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 sm:py-20 border-t border-black/5">
          <div className="container-center text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="space-y-6"
            >
              <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">
                Ready to get started?
              </h2>
              <p className="text-black/70 max-w-xl mx-auto">
                Start your 14-day free trial today. No credit card required.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" className="bg-black text-white hover:bg-black/90 h-12 px-8">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button size="lg" variant="outline" className="border-black/20 bg-white text-black hover:bg-black/5 h-12 px-8">
                  Contact Sales
                </Button>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-black/5 py-8 bg-white">
        <div className="container-center text-center">
          <p className="text-xs text-black/40 max-w-2xl mx-auto">
            <strong>Disclaimer:</strong> Steel Agent provides AI-generated responses for reference only.
            Always verify specifications against original source documents.
          </p>
          <div className="flex justify-center gap-4 mt-4 text-xs text-black/40">
            <Link href="/terms" className="hover:text-black/60 transition-colors">Terms of Service</Link>
            <span>·</span>
            <Link href="/privacy" className="hover:text-black/60 transition-colors">Privacy Policy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
