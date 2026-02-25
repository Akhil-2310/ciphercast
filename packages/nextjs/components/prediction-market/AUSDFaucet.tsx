"use client";

import { useCallback, useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

/**
 * AUSDFaucet - Claim test AUSD tokens
 * Allows users to claim 100 AUSD every 24 hours
 */
export const AUSDFaucet = () => {
  const { address } = useAccount();
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);

  const { isPending, writeContractAsync } = useScaffoldWriteContract({
    contractName: "AUSDFaucet",
  });

  // Read last claim time for this user
  const { data: lastClaim } = useScaffoldReadContract({
    contractName: "AUSDFaucet",
    functionName: "lastClaim",
    args: [address],
  });

  // Read faucet enabled status
  const { data: faucetEnabled } = useScaffoldReadContract({
    contractName: "AUSDFaucet",
    functionName: "faucetEnabled",
  });

  // Read cooldown duration
  const { data: cooldown } = useScaffoldReadContract({
    contractName: "AUSDFaucet",
    functionName: "COOLDOWN",
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

    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  };

  const canClaim = cooldownRemaining === 0 && faucetEnabled !== false;

  return (
    <div className="bg-base-100 border border-base-300 rounded-xl p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
          <span className="text-xl">💰</span>
        </div>
        <div>
          <h3 className="font-semibold">AUSD Faucet</h3>
          <p className="text-sm text-base-content/60">Claim test tokens</p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="bg-base-200 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-primary">100 AUSD</div>
          <div className="text-xs text-base-content/50">per claim</div>
        </div>

        {cooldownRemaining > 0 && (
          <div className="text-center text-sm text-base-content/60">
            Next claim in: <span className="font-mono font-medium">{formatCooldown(cooldownRemaining)}</span>
          </div>
        )}

        {faucetEnabled === false && <div className="text-center text-sm text-error">Faucet is currently disabled</div>}

        <button
          className={`btn btn-cofhe w-full ${!canClaim || isPending ? "btn-disabled" : ""}`}
          onClick={handleClaim}
          disabled={!canClaim || isPending}
        >
          {isPending && <span className="loading loading-spinner loading-sm"></span>}
          {isPending ? "Claiming..." : canClaim ? "Claim AUSD" : "Cooldown Active"}
        </button>

        <p className="text-xs text-base-content/40 text-center">Shielded stablecoin for encrypted betting</p>
      </div>
    </div>
  );
};
