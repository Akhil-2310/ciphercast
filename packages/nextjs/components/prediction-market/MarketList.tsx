"use client";

import { useState } from "react";
import { BetPanel } from "./BetPanel";
import { MarketCard } from "./MarketCard";
import { MarketStatus } from "./MarketStatusBadge";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";

type FilterTab = "all" | "open" | "resolved";

interface Market {
  id: number;
  question: string;
  closeTime: number;
  status: MarketStatus;
  currency: "ETH" | "FUSD";
  winningOutcome?: boolean;
}

/**
 * MarketList - Displays all prediction markets with filtering
 * Fetches from FHEPredictionMarket contract
 */
export const MarketList = () => {
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [selectedMarketId, setSelectedMarketId] = useState<number | null>(null);

  // Read market count from contract
  const { data: marketCounter } = useScaffoldReadContract({
    contractName: "FHEPredictionMarket",
    functionName: "marketCounter",
  });

  // For demo, create mock markets (in production, fetch each from contract)
  const mockMarkets: Market[] = [
    {
      id: 0,
      question: "Will ETH be above $4,000 by end of January 2026?",
      closeTime: Math.floor(Date.now() / 1000) + 86400 * 5, // 5 days from now
      status: "open",
      currency: "ETH",
    },
    {
      id: 1,
      question: "Will Bitcoin reach $150,000 in Q1 2026?",
      closeTime: Math.floor(Date.now() / 1000) + 86400 * 60,
      status: "open",
      currency: "FUSD",
    },
    {
      id: 2,
      question: "Will Solana flip Ethereum in market cap by March 2026?",
      closeTime: Math.floor(Date.now() / 1000) - 86400, // Closed
      status: "closed",
      currency: "ETH",
    },
  ];

  // Filter markets based on active tab
  const filteredMarkets = mockMarkets.filter(market => {
    if (activeTab === "all") return true;
    if (activeTab === "open") return market.status === "open";
    if (activeTab === "resolved") return market.status === "resolved" || market.status === "closed";
    return true;
  });

  const selectedMarket = selectedMarketId !== null ? mockMarkets.find(m => m.id === selectedMarketId) : null;

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: "All Markets" },
    { key: "open", label: "Open" },
    { key: "resolved", label: "Resolved" },
  ];

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Market List */}
      <div className="flex-1">
        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6">
          {tabs.map(tab => (
            <button
              key={tab.key}
              className={`btn btn-sm ${activeTab === tab.key ? "btn-primary" : "btn-ghost"}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Markets Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredMarkets.map(market => (
            <MarketCard
              key={market.id}
              marketId={market.id}
              question={market.question}
              closeTime={market.closeTime}
              status={market.status}
              currency={market.currency}
              isSelected={selectedMarketId === market.id}
              onClick={() => setSelectedMarketId(selectedMarketId === market.id ? null : market.id)}
            />
          ))}
        </div>

        {filteredMarkets.length === 0 && (
          <div className="text-center py-12 text-base-content/50">
            <p>No markets found</p>
          </div>
        )}

        {/* Contract Info */}
        <div className="mt-6 text-sm text-base-content/50">
          Total markets on-chain: {marketCounter?.toString() || "0"}
        </div>
      </div>

      {/* Bet Panel (shown when market selected) */}
      {selectedMarket && (
        <div className="lg:w-80 lg:sticky lg:top-4 lg:self-start">
          <div className="bg-base-100 border border-base-300 rounded-xl p-4">
            <h3 className="font-semibold mb-2 text-sm line-clamp-2">{selectedMarket.question}</h3>
            <BetPanel
              marketId={selectedMarket.id}
              currency={selectedMarket.currency}
              isOpen={selectedMarket.status === "open"}
            />
          </div>
        </div>
      )}
    </div>
  );
};
