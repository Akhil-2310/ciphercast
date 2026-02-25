"use client";

import { useCallback, useState } from "react";
import { useEncryptInput } from "../../app/useEncryptInput";
import { FheTypes } from "@cofhe/sdk";
import { parseEther, parseUnits } from "viem";
import { IntegerInput, IntegerVariant } from "~~/components/scaffold-eth";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

interface BetPanelProps {
  marketId: number;
  currency: "ETH" | "FUSD";
  isOpen: boolean;
}

/**
 * BetPanel - Encrypted bet placement interface
 * Users select Yes/No and enter amount, which gets encrypted before submission
 */
export const BetPanel = ({ marketId, currency, isOpen }: BetPanelProps) => {
  const [selectedOutcome, setSelectedOutcome] = useState<boolean | null>(null);
  const [amount, setAmount] = useState<string>("");

  const { isPending, writeContractAsync } = useScaffoldWriteContract({
    contractName: "FHEPredictionMarket",
  });
  const { onEncryptInput, isEncryptingInput, inputEncryptionDisabled } = useEncryptInput();

  const handlePlaceBet = useCallback(async () => {
    if (selectedOutcome === null || !amount || parseFloat(amount) <= 0) return;

    try {
      if (currency === "ETH") {
        // ETH uses 18 decimals
        const parsedAmount = parseEther(amount);

        // Check for uint64 overflow (approx 18.44 ETH)
        if (parsedAmount > 18446744073709551615n) {
          console.error("Amount exceeds maximum uint64 limit");
          return;
        }

        const encryptedStake = await onEncryptInput(FheTypes.Uint64, parsedAmount.toString());
        const encryptedOutcome = await onEncryptInput(FheTypes.Bool, selectedOutcome);

        if (!encryptedStake || !encryptedOutcome) return;

        await writeContractAsync({
          functionName: "placeBet",
          args: [
            BigInt(marketId),
            encryptedStake as any,
            encryptedOutcome as any,
            parsedAmount,
            encryptedStake as any, // placeholder for FUSD amount
          ],
          value: parsedAmount,
        });
      } else {
        // FUSD (AUSD) uses 6 decimals
        const parsedAmount = parseUnits(amount, 6);

        // Check for uint64 overflow
        if (parsedAmount > 18446744073709551615n) {
          console.error("Amount exceeds maximum uint64 limit");
          return;
        }

        const encryptedStake = await onEncryptInput(FheTypes.Uint64, parsedAmount.toString());
        const encryptedOutcome = await onEncryptInput(FheTypes.Bool, selectedOutcome);
        const encryptedFusdAmount = await onEncryptInput(FheTypes.Uint64, parsedAmount.toString());

        if (!encryptedStake || !encryptedOutcome || !encryptedFusdAmount) return;

        await writeContractAsync({
          functionName: "placeBet",
          args: [
            BigInt(marketId),
            encryptedStake as any,
            encryptedOutcome as any,
            BigInt(0),
            encryptedFusdAmount as any,
          ],
        });
      }

      // Reset form on success
      setSelectedOutcome(null);
      setAmount("");
    } catch (error) {
      console.error("Failed to place bet:", error);
    }
  }, [marketId, selectedOutcome, amount, currency, onEncryptInput, writeContractAsync]);

  const isLoading = isPending || isEncryptingInput;
  const canSubmit =
    selectedOutcome !== null && amount && parseFloat(amount) > 0 && !isLoading && !inputEncryptionDisabled && isOpen;

  if (!isOpen) {
    return (
      <div className="bg-base-200 rounded-lg p-4 text-center text-base-content/60">
        <p className="text-sm">This market is closed for betting</p>
      </div>
    );
  }

  return (
    <div className="bg-base-200 rounded-lg p-4 space-y-4">
      <div className="text-sm font-medium text-base-content/70 mb-2">Select your prediction</div>

      {/* Yes/No Selection */}
      <div className="flex gap-2">
        <button
          className={`btn flex-1 ${
            selectedOutcome === true
              ? "btn-yes"
              : "btn-ghost border border-base-300 hover:bg-green-500/10 hover:border-green-500/30"
          }`}
          onClick={() => setSelectedOutcome(true)}
        >
          <span className="text-lg mr-1">✓</span> Yes
        </button>
        <button
          className={`btn flex-1 ${
            selectedOutcome === false
              ? "btn-no"
              : "btn-ghost border border-base-300 hover:bg-red-500/10 hover:border-red-500/30"
          }`}
          onClick={() => setSelectedOutcome(false)}
        >
          <span className="text-lg mr-1">✗</span> No
        </button>
      </div>

      {/* Amount Input */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-base-content/70">Bet Amount ({currency})</label>
        <IntegerInput
          value={amount}
          onChange={setAmount}
          variant={IntegerVariant.UINT64}
          placeholder={`Enter ${currency} amount`}
          disableMultiplyBy1e18
        />
      </div>

      {/* Privacy Notice */}
      <div className="flex items-center gap-2 text-xs text-base-content/50 bg-base-100 px-3 py-2 rounded">
        <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
        <span>Your bet amount and prediction will be encrypted using FHE</span>
      </div>

      {/* Submit Button */}
      <button
        className={`btn btn-cofhe w-full ${!canSubmit ? "btn-disabled" : ""}`}
        onClick={handlePlaceBet}
        disabled={!canSubmit}
      >
        {isLoading && <span className="loading loading-spinner loading-sm"></span>}
        {isEncryptingInput ? "Encrypting..." : isPending ? "Submitting..." : "Place Encrypted Bet"}
      </button>
    </div>
  );
};
