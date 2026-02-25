"use client";

import { useCallback, useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { Address } from "~~/components/scaffold-eth";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

export default function FaucetPage() {
  const { address, isConnected } = useAccount();
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);

  const { isPending, writeContractAsync } = useScaffoldWriteContract({
    contractName: "AUSDFaucet",
  });

  // Read last claim time
  const { data: lastClaim } = useScaffoldReadContract({
    contractName: "AUSDFaucet",
    functionName: "lastClaim",
    args: [address],
  });

  // Read faucet enabled
  const { data: faucetEnabled } = useScaffoldReadContract({
    contractName: "AUSDFaucet",
    functionName: "faucetEnabled",
  });

  // Read cooldown
  const { data: cooldown } = useScaffoldReadContract({
    contractName: "AUSDFaucet",
    functionName: "COOLDOWN",
  });

  // Read claim amount
  const { data: claimAmount } = useScaffoldReadContract({
    contractName: "AUSDFaucet",
    functionName: "FAUCET_AMOUNT",
  });

  // Calculate remaining cooldown
  useEffect(() => {
    if (!lastClaim || !cooldown) return;

    const updateCooldown = () => {
      const lastClaimTime = Number(lastClaim) * 1000;
      const cooldownMs = Number(cooldown) * 1000;
      const nextClaimTime = lastClaimTime + cooldownMs;
      const remaining = Math.max(0, nextClaimTime - Date.now());
      setCooldownRemaining(remaining);
    };

    updateCooldown();
    const interval = setInterval(updateCooldown, 1000);
    return () => clearInterval(interval);
  }, [lastClaim, cooldown]);

  const handleClaim = useCallback(async () => {
    try {
      await writeContractAsync({
        functionName: "claim",
      });
    } catch (error) {
      console.error("Failed to claim:", error);
    }
  }, [writeContractAsync]);

  const formatCooldown = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);

    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  };

  const canClaim = cooldownRemaining === 0 && faucetEnabled !== false && isConnected;
  const claimAmountFormatted = claimAmount ? Number(claimAmount) / 1e6 : 100;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b border-base-300 bg-base-100">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-base-content">AUSD Faucet</h1>
          <p className="text-base-content/60 mt-1">Claim test AUSD tokens for the prediction markets</p>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          <div className="bg-base-100 border border-base-300 rounded-xl p-8">
            {/* Logo/Icon */}
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">💰</span>
              </div>
              <h2 className="text-2xl font-bold text-base-content">{claimAmountFormatted} AUSD</h2>
              <p className="text-base-content/60 text-sm mt-1">Available per claim</p>
            </div>

            {/* Status */}
            {isConnected && (
              <div className="bg-base-200 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-base-content/60">Connected as:</span>
                  <Address address={address} />
                </div>
                {cooldownRemaining > 0 && (
                  <div className="flex items-center justify-between text-sm mt-2">
                    <span className="text-base-content/60">Next claim in:</span>
                    <span className="font-mono font-medium text-warning">{formatCooldown(cooldownRemaining)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Faucet Disabled Warning */}
            {faucetEnabled === false && (
              <div className="alert alert-warning mb-6">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <span>Faucet is currently disabled</span>
              </div>
            )}

            {/* Claim Button */}
            {isConnected ? (
              <button
                className={`btn btn-cofhe w-full btn-lg ${!canClaim || isPending ? "btn-disabled" : ""}`}
                onClick={handleClaim}
                disabled={!canClaim || isPending}
              >
                {isPending && <span className="loading loading-spinner loading-sm" />}
                {isPending
                  ? "Claiming..."
                  : canClaim
                    ? "Claim AUSD"
                    : cooldownRemaining > 0
                      ? "Cooldown Active"
                      : "Claim AUSD"}
              </button>
            ) : (
              <div className="text-center text-base-content/60">Connect your wallet to claim</div>
            )}

            {/* Info */}
            <div className="mt-6 space-y-3 text-sm text-base-content/60">
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>AUSD is a shielded stablecoin used for private betting on prediction markets.</span>
              </div>
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>You can claim every 24 hours.</span>
              </div>
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
                <span>Your AUSD balance is encrypted using FHE.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
