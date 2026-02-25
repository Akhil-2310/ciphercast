"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { cofhesdkClient, useCofheActivePermit } from "../useCofhe";
import { useDecryptValue } from "../useDecrypt";
import { FheTypes } from "@cofhe/sdk";
import { formatUnits } from "viem";
import { useAccount } from "wagmi";
import { Address } from "~~/components/scaffold-eth";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

interface UserBet {
  marketId: number;
  betIndex: number;
  marketQuestion: string;
  currency: "ETH" | "FUSD";
  ethEscrow: bigint;
  encryptedStake: bigint; // ctHash for FUSD stake
  encryptedOutcome: bigint; // ctHash for outcome (yes/no)
  decryptRequested: boolean;
  isWithdrawn: boolean;
  marketSettled: boolean;
  canClaim: boolean;
  // Settlement data (available after market settled)
  winningOutcome?: boolean;
  outcomeReported?: boolean;
  winningPool?: bigint;
  distributablePool?: bigint;
}

export default function PortfolioPage() {
  const { address, isConnected } = useAccount();
  const [bets, setBets] = useState<UserBet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [decryptedStakes, setDecryptedStakes] = useState<Record<string, bigint | "pending" | "error">>({});
  const activePermit = useCofheActivePermit();

  // Read encrypted FUSD balance
  const { data: encryptedBalance } = useScaffoldReadContract({
    contractName: "FHEPredictionMarket",
    functionName: "userFusdBalance",
    args: [address],
  } as any);

  // Decrypt the balance using permit
  const { onDecrypt: onDecryptBalance, result: balanceResult } = useDecryptValue(
    FheTypes.Uint64,
    encryptedBalance as bigint | null | undefined,
  );

  // Read market counter to know how many markets exist
  const { data: marketCounter } = useScaffoldReadContract({
    contractName: "FHEPredictionMarket",
    functionName: "marketCounter",
  });

  // Read market data (up to 5 markets)
  const { data: market0 } = useScaffoldReadContract({
    contractName: "FHEPredictionMarket",
    functionName: "markets",
    args: [BigInt(0)],
  });
  const { data: market1 } = useScaffoldReadContract({
    contractName: "FHEPredictionMarket",
    functionName: "markets",
    args: [BigInt(1)],
  });
  const { data: market2 } = useScaffoldReadContract({
    contractName: "FHEPredictionMarket",
    functionName: "markets",
    args: [BigInt(2)],
  });
  const { data: market3 } = useScaffoldReadContract({
    contractName: "FHEPredictionMarket",
    functionName: "markets",
    args: [BigInt(3)],
  });
  const { data: market4 } = useScaffoldReadContract({
    contractName: "FHEPredictionMarket",
    functionName: "markets",
    args: [BigInt(4)],
  });

  // Read bet counts for each market
  const { data: betCount0 } = useScaffoldReadContract({
    contractName: "FHEPredictionMarket",
    functionName: "getBetCount",
    args: [BigInt(0)],
  });
  const { data: betCount1 } = useScaffoldReadContract({
    contractName: "FHEPredictionMarket",
    functionName: "getBetCount",
    args: [BigInt(1)],
  });
  const { data: betCount2 } = useScaffoldReadContract({
    contractName: "FHEPredictionMarket",
    functionName: "getBetCount",
    args: [BigInt(2)],
  });

  // Read individual bets (up to 3 per market for the first 3 markets)
  const { data: bet00 } = useScaffoldReadContract({
    contractName: "FHEPredictionMarket",
    functionName: "bets",
    args: [BigInt(0), BigInt(0)],
  });
  const { data: bet01 } = useScaffoldReadContract({
    contractName: "FHEPredictionMarket",
    functionName: "bets",
    args: [BigInt(0), BigInt(1)],
  });
  const { data: bet02 } = useScaffoldReadContract({
    contractName: "FHEPredictionMarket",
    functionName: "bets",
    args: [BigInt(0), BigInt(2)],
  });
  const { data: bet10 } = useScaffoldReadContract({
    contractName: "FHEPredictionMarket",
    functionName: "bets",
    args: [BigInt(1), BigInt(0)],
  });
  const { data: bet11 } = useScaffoldReadContract({
    contractName: "FHEPredictionMarket",
    functionName: "bets",
    args: [BigInt(1), BigInt(1)],
  });
  const { data: bet20 } = useScaffoldReadContract({
    contractName: "FHEPredictionMarket",
    functionName: "bets",
    args: [BigInt(2), BigInt(0)],
  });
  const { data: bet21 } = useScaffoldReadContract({
    contractName: "FHEPredictionMarket",
    functionName: "bets",
    args: [BigInt(2), BigInt(1)],
  });

  // Process bets and find user's bets
  useEffect(() => {
    if (!address) {
      setBets([]);
      setIsLoading(false);
      return;
    }

    const marketCount = marketCounter ? Number(marketCounter) : 0;
    if (marketCount === 0) {
      setBets([]);
      setIsLoading(false);
      return;
    }

    const marketsData = [market0, market1, market2, market3, market4];
    const betCounts = [betCount0, betCount1, betCount2];
    const allBets: { [key: string]: readonly [string, bigint, bigint, bigint, bigint, boolean, boolean] | undefined } =
      {
        "0-0": bet00 as any,
        "0-1": bet01 as any,
        "0-2": bet02 as any,
        "1-0": bet10 as any,
        "1-1": bet11 as any,
        "2-0": bet20 as any,
        "2-1": bet21 as any,
      };

    const userBets: UserBet[] = [];
    const userAddressLower = address.toLowerCase();

    // Iterate through markets and bets to find user's bets
    for (let marketId = 0; marketId < Math.min(marketCount, 3); marketId++) {
      const marketData = marketsData[marketId];
      const betCount = betCounts[marketId] ? Number(betCounts[marketId]) : 0;

      if (!marketData) continue;

      // Market struct indices:
      // 0: question, 3: currency, 6: outcomeReported, 18: settled
      const question = marketData[0] as string;
      const currency = Number(marketData[3]) === 0 ? "ETH" : "FUSD";
      const settled = marketData[18] as boolean;

      for (let betIndex = 0; betIndex < Math.min(betCount, 3); betIndex++) {
        const betKey = `${marketId}-${betIndex}`;
        const betData = allBets[betKey];

        if (!betData) continue;

        // Bet struct: [bettor, encryptedStake, encryptedOutcome, ethEscrow, fusdEscrow, decryptRequested, withdrawn]
        const bettor = (betData[0] as string).toLowerCase();
        const encryptedStake = betData[1] as bigint;
        const encryptedOutcome = betData[2] as bigint;
        const ethEscrow = betData[3] as bigint;
        const decryptRequested = betData[5] as boolean;
        const isWithdrawn = betData[6] as boolean;

        if (bettor === userAddressLower) {
          userBets.push({
            marketId,
            betIndex,
            marketQuestion: question,
            currency: currency as "ETH" | "FUSD",
            ethEscrow,
            encryptedStake,
            encryptedOutcome,
            decryptRequested,
            isWithdrawn,
            marketSettled: settled,
            canClaim: settled && !isWithdrawn,
            // Market settlement data (indices from Market struct after settled)
            winningOutcome: settled ? (marketData[7] as boolean) : undefined,
            outcomeReported: settled ? (marketData[6] as boolean) : undefined,
            winningPool: settled ? (marketData[13] as bigint) : undefined,
            distributablePool: settled ? (marketData[15] as bigint) : undefined,
          });
        }
      }
    }

    setBets(userBets);
    setIsLoading(false);
  }, [
    address,
    marketCounter,
    market0,
    market1,
    market2,
    market3,
    market4,
    betCount0,
    betCount1,
    betCount2,
    bet00,
    bet01,
    bet02,
    bet10,
    bet11,
    bet20,
    bet21,
  ]);

  const { isPending: isRequestingDecrypt, writeContractAsync: requestDecrypt } = useScaffoldWriteContract({
    contractName: "FHEPredictionMarket",
  });
  const { isPending: isWithdrawingETH, writeContractAsync: withdrawETH } = useScaffoldWriteContract({
    contractName: "FHEPredictionMarket",
  });
  const { isPending: isWithdrawingFUSD, writeContractAsync: withdrawFUSD } = useScaffoldWriteContract({
    contractName: "FHEPredictionMarket",
  });

  const handleRequestDecrypt = useCallback(
    async (bet: UserBet) => {
      try {
        await requestDecrypt({
          functionName: "requestBetDecrypt",
          args: [BigInt(bet.marketId), BigInt(bet.betIndex)],
        } as any);
      } catch (error) {
        console.error("Request decrypt failed:", error);
      }
    },
    [requestDecrypt],
  );

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

  const isWithdrawing = isWithdrawingETH || isWithdrawingFUSD || isRequestingDecrypt;

  const handleDecryptStake = useCallback(
    async (bet: UserBet) => {
      const betKey = `${bet.marketId}-${bet.betIndex}`;
      if (decryptedStakes[betKey] === "pending") return;
      setDecryptedStakes(prev => ({ ...prev, [betKey]: "pending" }));
      try {
        const result = await cofhesdkClient.decryptHandle(bet.encryptedStake, FheTypes.Uint64).decrypt();
        if (result.success) {
          setDecryptedStakes(prev => ({ ...prev, [betKey]: result.data as bigint }));
        } else {
          setDecryptedStakes(prev => ({ ...prev, [betKey]: "error" }));
        }
      } catch {
        setDecryptedStakes(prev => ({ ...prev, [betKey]: "error" }));
      }
    },
    [decryptedStakes],
  );

  const activeBets = bets.filter(b => !b.marketSettled);
  const claimableBets = bets.filter(b => b.canClaim && !b.isWithdrawn);
  const completedBets = bets.filter(b => b.isWithdrawn);

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">👛</div>
          <h1 className="text-2xl font-bold text-base-content mb-2">Connect Wallet</h1>
          <p className="text-base-content/60">Connect your wallet to view your portfolio</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b border-base-300 bg-base-100">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-base-content">Portfolio</h1>
          <div className="flex items-center gap-2 mt-2 text-base-content/60">
            <span>Connected:</span>
            <Address address={address} />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        {isLoading ? (
          <div className="text-center py-16">
            <span className="loading loading-spinner loading-lg"></span>
            <p className="mt-4 text-base-content/60">Loading your bets...</p>
          </div>
        ) : (
          <>
            {/* FUSD Balance Card */}
            <div className="bg-base-100 border border-base-300 rounded-xl p-6 mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-base-content/60 mb-1">AUSD Deposit Balance</div>
                  <div className="text-3xl font-bold text-base-content">
                    {balanceResult.state === "success" && balanceResult.value != null
                      ? `${formatUnits(balanceResult.value as bigint, 6)} AUSD`
                      : balanceResult.state === "pending"
                        ? "Decrypting..."
                        : balanceResult.state === "error"
                          ? "Error"
                          : "🔒 Encrypted"}
                  </div>
                  {balanceResult.state === "error" && (
                    <div className="text-xs text-error mt-1">{balanceResult.error}</div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  {!activePermit && <div className="text-xs text-warning">Create a permit in CofhePortal first</div>}
                  <button
                    className={`btn btn-sm btn-outline ${balanceResult.state === "pending" ? "btn-disabled" : ""}`}
                    onClick={onDecryptBalance}
                    disabled={balanceResult.state === "pending" || !activePermit}
                  >
                    {balanceResult.state === "pending" && <span className="loading loading-spinner loading-xs" />}
                    {balanceResult.state === "success" ? "🔄 Refresh" : "🔓 Decrypt Balance"}
                  </button>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-base-100 border border-base-300 rounded-xl p-6">
                <div className="text-sm text-base-content/60 mb-1">Active Bets</div>
                <div className="text-3xl font-bold text-base-content">{activeBets.length}</div>
              </div>
              <div className="bg-base-100 border border-base-300 rounded-xl p-6">
                <div className="text-sm text-base-content/60 mb-1">Ready to Claim</div>
                <div className="text-3xl font-bold text-success">{claimableBets.length}</div>
              </div>
              <div className="bg-base-100 border border-base-300 rounded-xl p-6">
                <div className="text-sm text-base-content/60 mb-1">Completed</div>
                <div className="text-3xl font-bold text-base-content">{completedBets.length}</div>
              </div>
            </div>

            {/* Claimable */}
            {claimableBets.length > 0 && (
              <div className="mb-8">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 bg-success rounded-full animate-pulse" />
                  Ready to Claim
                </h2>
                <div className="space-y-4">
                  {claimableBets.map(bet => (
                    <div
                      key={`${bet.marketId}-${bet.betIndex}`}
                      className="bg-base-100 border border-success/30 rounded-xl p-4 flex items-center justify-between"
                    >
                      <div>
                        <Link
                          href={`/markets/${bet.marketId}`}
                          className="font-medium text-base-content hover:underline"
                        >
                          {bet.marketQuestion}
                        </Link>
                        <div className="flex items-center gap-3 mt-1 text-sm text-base-content/60">
                          <span className="badge badge-sm">{bet.currency}</span>
                          {bet.currency === "ETH" ? (
                            <>
                              <span>Stake: {formatUnits(bet.ethEscrow, 18)} ETH</span>
                              {bet.winningPool && bet.distributablePool && bet.winningPool > 0n && (
                                <span className="text-success font-medium">
                                  Potential:{" "}
                                  {formatUnits(
                                    bet.ethEscrow + (bet.ethEscrow * bet.distributablePool) / bet.winningPool,
                                    18,
                                  )}{" "}
                                  ETH
                                </span>
                              )}
                            </>
                          ) : (
                            (() => {
                              const betKey = `${bet.marketId}-${bet.betIndex}`;
                              const stakeVal = decryptedStakes[betKey];
                              return stakeVal && typeof stakeVal === "bigint" ? (
                                <>
                                  <span>Stake: {formatUnits(stakeVal, 6)} AUSD</span>
                                  {bet.winningPool && bet.distributablePool && bet.winningPool > 0n && (
                                    <span className="text-success font-medium">
                                      Potential:{" "}
                                      {formatUnits(stakeVal + (stakeVal * bet.distributablePool) / bet.winningPool, 6)}{" "}
                                      AUSD
                                    </span>
                                  )}
                                </>
                              ) : (
                                <button
                                  className={`btn btn-xs btn-ghost ${stakeVal === "pending" ? "btn-disabled" : ""}`}
                                  onClick={() => handleDecryptStake(bet)}
                                  disabled={stakeVal === "pending" || !activePermit}
                                >
                                  {stakeVal === "pending"
                                    ? "Decrypting..."
                                    : stakeVal === "error"
                                      ? "❌ Retry"
                                      : "🔓 Decrypt Stake"}
                                </button>
                              );
                            })()
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {!bet.decryptRequested ? (
                          <button
                            className={`btn btn-warning ${isWithdrawing ? "btn-disabled" : ""}`}
                            onClick={() => handleRequestDecrypt(bet)}
                            disabled={isWithdrawing}
                          >
                            {isRequestingDecrypt && <span className="loading loading-spinner loading-sm" />}
                            Step 1: Request Decrypt
                          </button>
                        ) : (
                          <button
                            className={`btn btn-success ${isWithdrawing ? "btn-disabled" : ""}`}
                            onClick={() => handleWithdraw(bet)}
                            disabled={isWithdrawing}
                          >
                            {(isWithdrawingETH || isWithdrawingFUSD) && (
                              <span className="loading loading-spinner loading-sm" />
                            )}
                            Step 2: Claim Winnings
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Active Bets */}
            {activeBets.length > 0 && (
              <div className="mb-8">
                <h2 className="text-lg font-semibold mb-4">Active Positions</h2>
                <div className="space-y-4">
                  {activeBets.map(bet => (
                    <div
                      key={`${bet.marketId}-${bet.betIndex}`}
                      className="bg-base-100 border border-base-300 rounded-xl p-4 flex items-center justify-between"
                    >
                      <div>
                        <Link
                          href={`/markets/${bet.marketId}`}
                          className="font-medium text-base-content hover:underline"
                        >
                          {bet.marketQuestion}
                        </Link>
                        <div className="flex items-center gap-3 mt-1 text-sm text-base-content/60">
                          <span className="badge badge-sm">{bet.currency}</span>
                          {bet.currency === "ETH" ? (
                            <span>Stake: {formatUnits(bet.ethEscrow, 18)} ETH</span>
                          ) : (
                            (() => {
                              const betKey = `${bet.marketId}-${bet.betIndex}`;
                              const stakeVal = decryptedStakes[betKey];
                              return stakeVal && typeof stakeVal === "bigint" ? (
                                <span>Stake: {formatUnits(stakeVal, 6)} AUSD</span>
                              ) : (
                                <button
                                  className={`btn btn-xs btn-ghost ${stakeVal === "pending" ? "btn-disabled" : ""}`}
                                  onClick={() => handleDecryptStake(bet)}
                                  disabled={stakeVal === "pending" || !activePermit}
                                >
                                  {stakeVal === "pending"
                                    ? "Decrypting..."
                                    : stakeVal === "error"
                                      ? "❌ Retry"
                                      : "🔓 Decrypt Stake"}
                                </button>
                              );
                            })()
                          )}
                        </div>
                      </div>
                      <span className="badge badge-ghost">Pending</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Completed */}
            {completedBets.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-4 text-base-content/70">History</h2>
                <div className="space-y-4 opacity-70">
                  {completedBets.map(bet => (
                    <div
                      key={`${bet.marketId}-${bet.betIndex}`}
                      className="bg-base-100 border border-base-300 rounded-xl p-4 flex items-center justify-between"
                    >
                      <div>
                        <Link
                          href={`/markets/${bet.marketId}`}
                          className="font-medium text-base-content hover:underline"
                        >
                          {bet.marketQuestion}
                        </Link>
                        <div className="text-sm text-base-content/60 mt-1">{bet.currency}</div>
                      </div>
                      <span className="badge badge-ghost">Claimed</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {bets.length === 0 && (
              <div className="text-center py-16">
                <div className="text-5xl mb-4">📭</div>
                <h3 className="text-lg font-semibold text-base-content mb-2">No bets yet</h3>
                <p className="text-base-content/60 mb-4">Place your first encrypted bet on an active market</p>
                <Link href="/markets" className="btn btn-primary">
                  Browse Markets
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
