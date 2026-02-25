"use client";

import Link from "next/link";

/**
 * HeroSection - Main landing hero with headline and CTAs
 */
export const HeroSection = () => {
  return (
    <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-8">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            Powered by Fully Homomorphic Encryption
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-base-content mb-6 leading-tight">
            Private
            <span className="text-primary"> Prediction</span>
            <br />
            Markets
          </h1>

          {/* Subheadline */}
          <p className="text-xl md:text-2xl text-base-content/70 max-w-2xl mx-auto mb-10">
            Bet on real-world outcomes without revealing your position or stake. Your predictions stay encrypted
            on-chain.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/markets" className="btn btn-cofhe btn-lg px-8">
              Browse Markets
              <svg className="w-5 h-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <a href="#how-it-works" className="btn btn-ghost btn-lg border border-base-300">
              Learn How It Works
            </a>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-3 gap-8 max-w-lg mx-auto">
            <div>
              <div className="text-3xl font-bold text-primary">100%</div>
              <div className="text-sm text-base-content/60">Privacy</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary">FHE</div>
              <div className="text-sm text-base-content/60">Encrypted</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary">Featuring </div>
              <div className="text-sm text-base-content/60">Chainlink Oracles</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
