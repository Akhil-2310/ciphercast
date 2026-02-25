"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

// Standard library for formatting, but I can use standard JS for now if not available

// Common Chainlink price feed addresses (Sepolia)
const PRICE_FEEDS = {
  "ETH/USD": "0x694AA1769357215DE4FAC081bf1f309aDC325306",
  "BTC/USD": "0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43",
  "LINK/USD": "0xc59E3633BAAC79493d908e63626716e204A45EdF",
};

export default function CreateMarketPage() {
  const router = useRouter();
  const { address } = useAccount();

  const [question, setQuestion] = useState("");
  const [closeTime, setCloseTime] = useState("");
  const [fee, setFee] = useState("100"); // 1% = 100 basis points
  const [currency, setCurrency] = useState<0 | 1>(0); // 0 = ETH, 1 = FUSD
  const [priceFeed, setPriceFeed] = useState("ETH/USD"); // Store key instead of address directly for UI
  const [priceThreshold, setPriceThreshold] = useState("");

  // Read contract owner
  const { data: owner } = useScaffoldReadContract({
    contractName: "FHEPredictionMarket",
    functionName: "owner",
  });

  const { isPending, writeContractAsync } = useScaffoldWriteContract({
    contractName: "FHEPredictionMarket",
  });

  const isOwner = address && owner && address.toLowerCase() === owner.toLowerCase();

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!question || !closeTime || !priceThreshold) {
        alert("Please fill in all fields");
        return;
      }

      try {
        const closeTimestamp = BigInt(Math.floor(new Date(closeTime).getTime() / 1000));
        const thresholdInt = BigInt(Math.floor(parseFloat(priceThreshold) * 1e8)); // Chainlink uses 8 decimals
        const feedAddress = PRICE_FEEDS[priceFeed as keyof typeof PRICE_FEEDS];

        await writeContractAsync({
          functionName: "createPriceMarket",
          args: [question, closeTimestamp, Number(fee), currency, feedAddress, thresholdInt],
        });

        router.push("/markets");
      } catch (error) {
        console.error("Failed to create market:", error);
      }
    },
    [question, closeTime, fee, currency, priceFeed, priceThreshold, writeContractAsync, router],
  );

  // Redirect non-owners
  if (!isOwner) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-base-content mb-2">Owner Only</h1>
          <p className="text-base-content/60 mb-6">Only the contract owner can create markets.</p>
          <button onClick={() => router.push("/markets")} className="btn btn-primary">
            Browse Markets
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-12">
      {/* Header */}
      <div className="border-b border-base-300 bg-base-100 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-base-content">Create Market</h1>
            <p className="text-base-content/60 text-sm mt-1">Deploy a new price prediction market</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Main Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Card: Market Basics */}
              <div className="bg-base-100 border border-base-300 rounded-2xl p-6 shadow-sm">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Market Details
                </h3>

                <div className="space-y-6">
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">Question</span>
                    </label>
                    <textarea
                      className="textarea textarea-bordered h-32 text-lg leading-snug placeholder:text-base-content/30 focus:outline-none focus:border-primary"
                      placeholder="e.g. Will ETH be above $4,000 by end of January 2026?"
                      value={question}
                      onChange={e => setQuestion(e.target.value)}
                      required
                    />
                    <label className="label">
                      <span className="label-text-alt text-base-content/60">
                        Be specific about the condition. Resolution will check the price feed automatically.
                      </span>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-medium">Resolution Date</span>
                      </label>
                      <input
                        type="datetime-local"
                        className="input input-bordered w-full"
                        value={closeTime}
                        onChange={e => setCloseTime(e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-medium">Currency</span>
                      </label>
                      <div className="join w-full">
                        <button
                          type="button"
                          className={`join-item btn flex-1 ${currency === 0 ? "btn-primary" : "btn-outline"}`}
                          onClick={() => setCurrency(0)}
                        >
                          ETH
                        </button>
                        <button
                          type="button"
                          className={`join-item btn flex-1 ${currency === 1 ? "btn-primary" : "btn-outline"}`}
                          onClick={() => setCurrency(1)}
                        >
                          FUSD
                          <span className="badge badge-sm badge-secondary">Shielded</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card: Configuration */}
              <div className="bg-base-100 border border-base-300 rounded-2xl p-6 shadow-sm">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  Resolution Logic
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">Data Source</span>
                    </label>
                    <select
                      className="select select-bordered w-full"
                      value={priceFeed}
                      onChange={e => setPriceFeed(e.target.value)}
                    >
                      {Object.keys(PRICE_FEEDS).map(name => (
                        <option key={name} value={name}>
                          Chainlink {name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">Target Price</span>
                    </label>
                    <label className="input input-bordered flex items-center gap-2">
                      $
                      <input
                        type="number"
                        className="grow"
                        placeholder="0.00"
                        value={priceThreshold}
                        onChange={e => setPriceThreshold(e.target.value)}
                        required
                      />
                    </label>
                  </div>

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">Protocol Fee</span>
                    </label>
                    <label className="input input-bordered flex items-center gap-2">
                      <input
                        type="number"
                        className="grow"
                        value={fee}
                        onChange={e => setFee(e.target.value)}
                        min="0"
                        max="1000"
                      />
                      <span className="badge badge-sm">bps</span>
                    </label>
                    <label className="label">
                      <span className="label-text-alt">{parseInt(fee || "0") / 100}% of winning pool</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Preview/Summary */}
            <div className="space-y-6">
              <div className="bg-base-200 border border-base-300 rounded-2xl p-6 sticky top-28">
                <h3 className="text-lg font-bold mb-4">Summary</h3>

                <div className="space-y-4 text-sm">
                  <div className="flex justify-between items-center py-2 border-b border-base-content/10">
                    <span className="text-base-content/60">Currency</span>
                    <span className="font-semibold flex items-center gap-1">
                      {currency === 0 ? "ETH" : "FUSD"}
                      {currency === 1 && <span className="text-xs text-secondary">(Shielded)</span>}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-base-content/10">
                    <span className="text-base-content/60">Feed</span>
                    <span className="font-mono">{priceFeed}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-base-content/10">
                    <span className="text-base-content/60">Threshold</span>
                    <span className="font-semibold">${priceThreshold || "0.00"}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-base-content/10">
                    <span className="text-base-content/60">Date</span>
                    <span className="font-semibold text-right">
                      {closeTime ? new Date(closeTime).toLocaleString() : "-"}
                    </span>
                  </div>
                </div>

                <div className="mt-8">
                  <div className="alert bg-base-100 shadow-sm border-l-4 border-l-primary p-3 mb-6 block">
                    <div className="text-xs font-semibold uppercase tracking-wider text-base-content/50 mb-1">
                      Logic
                    </div>
                    <div className="text-sm">
                      Market resolves <b>YES</b> if {priceFeed} is above <b>${priceThreshold || "X"}</b> on resolution
                      date.
                    </div>
                  </div>

                  <button
                    type="submit"
                    className={`btn btn-primary w-full shadow-lg hover:shadow-xl transition-all ${isPending ? "btn-disabled" : ""}`}
                    disabled={isPending}
                  >
                    {isPending && <span className="loading loading-spinner loading-sm" />}
                    {isPending ? "Deploying..." : "Create Market"}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
