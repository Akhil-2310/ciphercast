"use client";

import { useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { BetPanel } from "~~/components/prediction-market/BetPanel";
import { MarketStatus, MarketStatusBadge } from "~~/components/prediction-market/MarketStatusBadge";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

export default function MarketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { address } = useAccount();
  const marketId = Number(params.id);

  // Read contract owner
  const { data: owner } = useScaffoldReadContract({
    contractName: "FHEPredictionMarket",
    functionName: "owner",
  });

  // Read market data
  const { data: marketData, isLoading } = useScaffoldReadContract({
    contractName: "FHEPredictionMarket",
    functionName: "markets",
    args: [BigInt(marketId)],
  });

  const isOwner = address && owner && address.toLowerCase() === owner.toLowerCase();

  // Parse market data
  const now = Math.floor(Date.now() / 1000);
  const question = marketData?.[0] as string | undefined;
  const closeTime = marketData ? Number(marketData[1]) : 0;
  const feeBps = marketData ? Number(marketData[2]) : 0;
  const currency = marketData ? (Number(marketData[3]) === 0 ? "ETH" : "FUSD") : "ETH";
  const outcomeReported = marketData?.[6] as boolean | undefined;
  const winningOutcome = marketData?.[7] as boolean | undefined;
  const decryptRequested = marketData?.[17] as boolean | undefined;
  const settled = marketData?.[18] as boolean | undefined;

  // Determine status
  let status: MarketStatus = "open";
  if (settled || outcomeReported) {
    status = "resolved";
  } else if (closeTime < now && closeTime > 0) {
    status = "closed";
  }

  const isExpired = closeTime < now && closeTime > 0;

  // Resolve market
  const { isPending: isResolving, writeContractAsync: resolveMarket } = useScaffoldWriteContract({
    contractName: "FHEPredictionMarket",
  });

  // Request decrypt
  const { isPending: isRequestingDecrypt, writeContractAsync: requestDecryptContract } = useScaffoldWriteContract({
    contractName: "FHEPredictionMarket",
  });

  // Settle market
  const { isPending: isSettling, writeContractAsync: settleMarket } = useScaffoldWriteContract({
    contractName: "FHEPredictionMarket",
  });

  const handleResolve = useCallback(async () => {
    try {
      await resolveMarket({
        functionName: "resolveWithChainlink",
        args: [BigInt(marketId)],
      });
    } catch (error) {
      console.error("Failed to resolve:", error);
    }
  }, [marketId, resolveMarket]);

  const handleRequestDecrypt = useCallback(async () => {
    try {
      await requestDecryptContract({
        functionName: "requestDecrypt",
        args: [BigInt(marketId)],
      });
    } catch (error) {
      console.error("Failed to request decrypt:", error);
    }
  }, [marketId, requestDecryptContract]);

  const handleSettle = useCallback(async () => {
    try {
      await settleMarket({
        functionName: "settleMarket",
        args: [BigInt(marketId)],
      });
    } catch (error) {
      console.error("Failed to settle:", error);
    }
  }, [marketId, settleMarket]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  // Not found
  if (!question) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h1 className="text-2xl font-bold text-base-content mb-2">Market Not Found</h1>
          <p className="text-base-content/60 mb-4">Market #{marketId} does not exist.</p>
          <button onClick={() => router.push("/markets")} className="btn btn-primary mt-4">
            Browse Markets
          </button>
        </div>
      </div>
    );
  }

  const closeDate = new Date(closeTime * 1000);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b border-base-300 bg-base-100">
        <div className="container mx-auto px-4 py-8">
          <button onClick={() => router.push("/markets")} className="btn btn-ghost btn-sm mb-4">
            ← Back to Markets
          </button>
          <div className="flex items-start gap-4">
            <MarketStatusBadge status={status} outcome={winningOutcome} />
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-bold text-base-content">{question}</h1>
              <div className="flex items-center gap-4 mt-3 text-sm text-base-content/60">
                <span>Market #{marketId}</span>
                <span>•</span>
                <span>{currency}</span>
                <span>•</span>
                <span>{isExpired ? "Closed" : `Closes ${closeDate.toLocaleDateString()}`}</span>
                <span>•</span>
                <span>Fee: {feeBps / 100}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Market Info Card */}
            <div className="bg-base-100 border border-base-300 rounded-xl p-6">
              <h2 className="font-semibold text-lg mb-4">Market Details</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-base-content/60">Close Time</div>
                  <div className="font-medium">{closeDate.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-base-content/60">Currency</div>
                  <div className="font-medium">{currency}</div>
                </div>
                <div>
                  <div className="text-base-content/60">Status</div>
                  <div className="font-medium capitalize">{status}</div>
                </div>
                <div>
                  <div className="text-base-content/60">Settled</div>
                  <div className="font-medium">{settled ? "Yes" : "No"}</div>
                </div>
                {outcomeReported && (
                  <div className="col-span-2">
                    <div className="text-base-content/60">Outcome</div>
                    <div className={`font-bold ${winningOutcome ? "text-success" : "text-error"}`}>
                      {winningOutcome ? "YES" : "NO"}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Owner Actions */}
            {isOwner && (
              <div className="bg-base-100 border border-base-300 rounded-xl p-6">
                <h2 className="font-semibold text-lg mb-4">Owner Actions</h2>
                <div className="flex flex-wrap gap-4">
                  {/* Step 1: Resolve with Chainlink */}
                  {status === "closed" && !outcomeReported && (
                    <button
                      className={`btn btn-primary ${isResolving ? "btn-disabled" : ""}`}
                      onClick={handleResolve}
                      disabled={isResolving}
                    >
                      {isResolving && <span className="loading loading-spinner loading-sm" />}
                      1. Resolve with Chainlink
                    </button>
                  )}
                  {/* Step 2: Request Decrypt */}
                  {outcomeReported && !decryptRequested && (
                    <button
                      className={`btn btn-secondary ${isRequestingDecrypt ? "btn-disabled" : ""}`}
                      onClick={handleRequestDecrypt}
                      disabled={isRequestingDecrypt}
                    >
                      {isRequestingDecrypt && <span className="loading loading-spinner loading-sm" />}
                      2. Request Decrypt
                    </button>
                  )}
                  {/* Step 3: Settle Market */}
                  {decryptRequested && !settled && (
                    <button
                      className={`btn btn-primary ${isSettling ? "btn-disabled" : ""}`}
                      onClick={handleSettle}
                      disabled={isSettling}
                    >
                      {isSettling && <span className="loading loading-spinner loading-sm" />}
                      3. Settle Market
                    </button>
                  )}
                  {settled && (
                    <div className="text-success flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Market fully settled
                    </div>
                  )}
                  {status === "open" && <div className="text-base-content/60">Market must close before resolution</div>}
                </div>
              </div>
            )}

            {/* Encryption Notice */}
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-6">
              <div className="flex items-start gap-3">
                <svg
                  className="w-6 h-6 text-primary flex-shrink-0 mt-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
                <div>
                  <h3 className="font-semibold text-base-content">Privacy Protected</h3>
                  <p className="text-sm text-base-content/70 mt-1">
                    All bets in this market are encrypted using FHE. Your prediction and stake remain private until the
                    market settles.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar - Betting */}
          <div className="space-y-6">
            <div className="bg-base-100 border border-base-300 rounded-xl p-6">
              <h2 className="font-semibold text-lg mb-4">Place Your Bet</h2>
              <BetPanel marketId={marketId} currency={currency as "ETH" | "FUSD"} isOpen={status === "open"} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
