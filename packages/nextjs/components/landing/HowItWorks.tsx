"use client";

const steps = [
  {
    number: "01",
    title: "Browse Markets",
    description:
      "Explore available prediction markets. Each market has a question, close time, and outcome based on real-world data.",
  },
  {
    number: "02",
    title: "Place Encrypted Bet",
    description: "Choose Yes or No, enter your stake. Your bet is encrypted using FHE before being sent on-chain.",
  },
  {
    number: "03",
    title: "Market Resolves",
    description:
      "When the market closes, Chainlink oracles provide the real-world price data to determine the outcome.",
  },
  {
    number: "04",
    title: "Claim Winnings",
    description:
      "If you predicted correctly, claim your proportional share of the losing pool. All on-chain and trustless.",
  },
];

/**
 * HowItWorks - Step-by-step process explanation
 */
export const HowItWorks = () => {
  return (
    <section id="how-it-works" className="py-24">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-base-content mb-4">How It Works</h2>
          <p className="text-lg text-base-content/60 max-w-2xl mx-auto">Private betting in four simple steps</p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="relative flex gap-4 p-6 bg-base-100 border border-base-300 rounded-xl">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-primary text-primary-content rounded-xl flex items-center justify-center font-bold text-lg">
                    {step.number}
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-base-content mb-2">{step.title}</h3>
                  <p className="text-sm text-base-content/60 leading-relaxed">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
