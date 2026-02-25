"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { MarketCard } from "~~/components/prediction-market/MarketCard";
import { MarketStatus } from "~~/components/prediction-market/MarketStatusBadge";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";

type FilterTab = "all" | "open" | "closed" | "resolved";

interface Market {
  id: number;
  question: string;
  closeTime: number;
  status: MarketStatus;
  currency: "ETH" | "FUSD";
  settled: boolean;
}

export default function MarketsPage() {
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [markets, setMarkets] = useState<Market[]>([]);
  const { address } = useAccount();

  // Read market count from contract
  const { data: marketCounter } = useScaffoldReadContract({
    contractName: "FHEPredictionMarket",
    functionName: "marketCounter",
  });

  // Read contract owner
  const { data: owner } = useScaffoldReadContract({
    contractName: "FHEPredictionMarket",
    functionName: "owner",
  });

  const isOwner = address && owner && address.toLowerCase() === owner.toLowerCase();

  // Fetch all markets from contract
  // We need to read each market individually since Solidity mappings can't be iterated
  const marketCount = marketCounter ? Number(marketCounter) : 0;

  // Read market 0
  const { data: market0 } = useScaffoldReadContract({
    contractName: "FHEPredictionMarket",
    functionName: "markets",
    args: [BigInt(0)],
  });

  // Read market 1
  const { data: market1 } = useScaffoldReadContract({
    contractName: "FHEPredictionMarket",
    functionName: "markets",
    args: [BigInt(1)],
  });

  // Read market 2
  const { data: market2 } = useScaffoldReadContract({
    contractName: "FHEPredictionMarket",
    functionName: "markets",
    args: [BigInt(2)],
  });

  // Read market 3
  const { data: market3 } = useScaffoldReadContract({
    contractName: "FHEPredictionMarket",
    functionName: "markets",
    args: [BigInt(3)],
  });

  // Read market 4
  const { data: market4 } = useScaffoldReadContract({
    contractName: "FHEPredictionMarket",
    functionName: "markets",
    args: [BigInt(4)],
  });

  // Convert raw market data to our Market interface
  useEffect(() => {
    const rawMarkets = [market0, market1, market2, market3, market4];
    const now = Math.floor(Date.now() / 1000);
    const fetchedMarkets: Market[] = [];

    for (let i = 0; i < marketCount && i < rawMarkets.length; i++) {
      const raw = rawMarkets[i];
      if (raw && raw[0]) {
        // Check if question exists
        const closeTime = Number(raw[1]);
        const outcomeReported = raw[6] as boolean;
        const settled = raw[18] as boolean;

        let status: MarketStatus = "open";
        if (settled || outcomeReported) {
          status = "resolved";
        } else if (closeTime < now) {
          status = "closed";
        }

        fetchedMarkets.push({
          id: i,
          question: raw[0] as string,
          closeTime: closeTime,
          status,
          currency: Number(raw[3]) === 0 ? "ETH" : "FUSD",
          settled: settled,
        });
      }
    }

    setMarkets(fetchedMarkets);
  }, [marketCount, market0, market1, market2, market3, market4]);

  // Filter markets
  const filteredMarkets = markets.filter(market => {
    if (activeTab === "all") return true;
    return market.status === activeTab;
  });

  const tabs: { key: FilterTab; label: string; count: number }[] = [
    { key: "all", label: "All Markets", count: markets.length },
    { key: "open", label: "Open", count: markets.filter(m => m.status === "open").length },
    { key: "closed", label: "Pending", count: markets.filter(m => m.status === "closed").length },
    { key: "resolved", label: "Resolved", count: markets.filter(m => m.status === "resolved").length },
  ];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b border-base-300 bg-base-100">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-base-content">Markets</h1>
              <p className="text-base-content/60 mt-1">Browse and bet on prediction markets</p>
            </div>
            {isOwner && (
              <Link href="/markets/create" className="btn btn-cofhe">
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Market
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Filter Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {tabs.map(tab => (
            <button
              key={tab.key}
              className={`btn btn-sm whitespace-nowrap ${activeTab === tab.key ? "btn-primary" : "btn-ghost"}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
              <span className="ml-2 bg-base-300/50 px-2 py-0.5 rounded text-xs">{tab.count}</span>
            </button>
          ))}
        </div>

        {/* Markets Grid */}
        {filteredMarkets.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMarkets.map(market => (
              <Link key={market.id} href={`/markets/${market.id}`}>
                <MarketCard
                  marketId={market.id}
                  question={market.question}
                  closeTime={market.closeTime}
                  status={market.status}
                  currency={market.currency}
                />
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">📊</div>
            <h3 className="text-lg font-semibold text-base-content mb-2">No markets found</h3>
            <p className="text-base-content/60">
              {activeTab !== "all"
                ? "Try a different filter"
                : marketCount === 0
                  ? "No markets created yet"
                  : "Loading..."}
            </p>
            {isOwner && marketCount === 0 && (
              <Link href="/markets/create" className="btn btn-primary mt-4">
                Create First Market
              </Link>
            )}
          </div>
        )}

        {/* Contract Info */}
        <div className="mt-12 text-center text-sm text-base-content/50">
          Total markets on-chain: {marketCounter?.toString() || "0"}
        </div>
      </div>
    </div>
  );
}
