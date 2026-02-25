"use client";

import Link from "next/link";
import type { NextPage } from "next";
import { FeaturesSection, HeroSection, HowItWorks } from "~~/components/landing";

const Home: NextPage = () => {
  return (
    <div className="min-h-screen">
      <HeroSection />
      <FeaturesSection />
      <HowItWorks />

      {/* CTA Section */}
      <section className="py-24 bg-primary/5">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-base-content mb-4">Ready to Start?</h2>
          <p className="text-lg text-base-content/60 max-w-xl mx-auto mb-8">
            Connect your wallet and place your first private prediction.
          </p>
          <Link href="/markets" className="btn btn-cofhe btn-lg px-10">
            Browse Markets
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-base-300">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-primary">FHE</span>
              <span className="text-base-content/70">Prediction Markets</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-base-content/60">
              <Link href="/markets" className="hover:text-primary transition-colors">
                Markets
              </Link>
              <Link href="/portfolio" className="hover:text-primary transition-colors">
                Portfolio
              </Link>
              <Link href="/faucet" className="hover:text-primary transition-colors">
                Faucet
              </Link>
              <a
                href="https://cofhe-docs.fhenix.zone/"
                target="_blank"
                rel="noreferrer"
                className="hover:text-primary transition-colors"
              >
                Docs
              </a>
            </div>
            <div className="flex items-center gap-2 text-xs text-base-content/50">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
              Powered by Fhenix CoFHE
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
