"use client";

import { useCallback } from "react";
import { useAccount } from "wagmi";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

interface UserBet {
  marketId: number;
  betIndex: number;
  marketQuestion: string;
  currency: "ETH" | "FUSD";
  isWithdrawn: boolean;
  marketSettled: boolean;
}

/**
 * UserBets - Shows user's encrypted positions across markets
 */
export const UserBets = () => {
  const { address } = useAccount();
  const { isPending: isWithdrawingETH, writeContractAsync: withdrawETH } = useScaffoldWriteContract({
    contractName: "FHEPredictionMarket",
  });
  const { isPending: isWithdrawingFUSD, writeContractAsync: withdrawFUSD } = useScaffoldWriteContract({
    contractName: "FHEPredictionMarket",
  });

  // Mock user bets (in production, fetch from contract events or indexer)
  const mockBets: UserBet[] = [
    {
      marketId: 0,
      betIndex: 0,
      marketQuestion: "Will ETH be above $4,000 by end of January 2026?",
      currency: "ETH",
      isWithdrawn: false,
      marketSettled: false,
    },
    {
      marketId: 1,
      betIndex: 1,
      marketQuestion: "Will Bitcoin reach $150,000 in Q1 2026?",
      currency: "FUSD",
      isWithdrawn: false,
      marketSettled: true,
    },
  ];

  const handleWithdraw = useCallback(
    async (bet: UserBet) => {
      try {
        if (bet.currency === "ETH") {
          await withdrawETH({
            functionName: "withdrawETH",
            args: [BigInt(bet.marketId), BigInt(bet.betIndex)],
          });
        } else {
          await withdrawFUSD({
            functionName: "withdrawFUSD",
            args: [BigInt(bet.marketId), BigInt(bet.betIndex)],
          });
        }
      } catch (error) {
        console.error("Withdraw failed:", error);
      }
    },
    [withdrawETH, withdrawFUSD],
  );

  if (!address) {
    return (
      <div className="bg-base-100 border border-base-300 rounded-xl p-8 text-center">
        <p className="text-base-content/60">Connect your wallet to view your bets</p>
      </div>
    );
  }

  if (mockBets.length === 0) {
    return (
      <div className="bg-base-100 border border-base-300 rounded-xl p-8 text-center">
        <p className="text-base-content/60">No bets placed yet</p>
        <p className="text-sm text-base-content/40 mt-1">Place your first encrypted bet on an active market</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Your Positions</h2>

      <div className="space-y-3">
        {mockBets.map(bet => (
          <div key={`${bet.marketId}-${bet.betIndex}`} className="bg-base-100 border border-base-300 rounded-xl p-4">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex-1">
                <p className="text-sm font-medium line-clamp-2">{bet.marketQuestion}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="encrypted-indicator">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      />
                    </svg>
                    Position Hidden
                  </span>
                  <span className="text-xs text-base-content/50">{bet.currency}</span>
                </div>
              </div>

              <div className="flex-shrink-0">
                {bet.isWithdrawn ? (
                  <span className="badge badge-ghost text-xs">Withdrawn</span>
                ) : bet.marketSettled ? (
                  <button
                    className="btn btn-sm btn-cofhe"
                    onClick={() => handleWithdraw(bet)}
                    disabled={isWithdrawingETH || isWithdrawingFUSD}
                  >
                    {(isWithdrawingETH || isWithdrawingFUSD) && (
                      <span className="loading loading-spinner loading-xs"></span>
                    )}
                    Withdraw
                  </button>
                ) : (
                  <span className="badge badge-ghost text-xs">Pending</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-base-content/40 text-center">
        Your bet amounts and predictions are encrypted on-chain
      </p>
    </div>
  );
};
