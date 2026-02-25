"use client";

import { useCallback, useEffect, useState } from "react";
import { useEncryptInput } from "../useEncryptInput";
import { FheTypes } from "@cofhe/sdk";
import { parseUnits } from "viem";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { Address } from "~~/components/scaffold-eth";
import { useScaffoldContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

// AUSD contract address on Sepolia
const AUSD_ADDRESS = "0x75980803748f325b7274c9b68e87cbc2f9e8b357" as const;

// FHERC20 ABI for operator functions
const FHERC20_ABI = [
  {
    name: "setOperator",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "operator", type: "address" },
      { name: "until", type: "uint48" },
    ],
    outputs: [],
  },
  {
    name: "isOperator",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "holder", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ type: "bool" }],
  },
] as const;

export default function DepositPage() {
  const { address, isConnected } = useAccount();
  const [amount, setAmount] = useState<string>("");
  const [step, setStep] = useState<"approve" | "deposit">("approve");

  // Get prediction market address
  const { data: predictionMarketContract } = useScaffoldContract({
    contractName: "FHEPredictionMarket",
  });
  const predictionMarketAddress = predictionMarketContract?.address;

  // Check current operator status
  const { data: isOperator, refetch: refetchOperator } = useReadContract({
    address: AUSD_ADDRESS,
    abi: FHERC20_ABI,
    functionName: "isOperator",
    args: address && predictionMarketAddress ? [address, predictionMarketAddress] : undefined,
  });

  // Determine if approval (operator set) needed
  useEffect(() => {
    if (isOperator) {
      setStep("deposit");
    } else {
      setStep("approve");
    }
  }, [isOperator]);

  // Set Operator (Approve)
  const { writeContractAsync: setOperatorAsync, isPending: isSettingOperator } = useWriteContract();

  const handleApprove = useCallback(async () => {
    if (!predictionMarketAddress) return;
    try {
      // Set operator for 1 year (approx)
      const oneYearFromNow = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;

      await setOperatorAsync({
        address: AUSD_ADDRESS,
        abi: FHERC20_ABI,
        functionName: "setOperator",
        args: [predictionMarketAddress, oneYearFromNow],
      });

      // Wait a bit for indexing then refetch
      setTimeout(() => refetchOperator(), 3000);
      setStep("deposit");
    } catch (error) {
      console.error("Set operator failed:", error);
    }
  }, [predictionMarketAddress, setOperatorAsync, refetchOperator]);

  // Deposit FUSD via the prediction market contract
  const { isPending: isDepositing, writeContractAsync } = useScaffoldWriteContract({
    contractName: "FHEPredictionMarket",
  });
  const { onEncryptInput, isEncryptingInput } = useEncryptInput();

  const handleDeposit = useCallback(async () => {
    if (!amount || parseFloat(amount) <= 0) return;

    try {
      const parsedAmount = parseUnits(amount, 6);

      // Check for uint64 overflow
      if (parsedAmount > 18446744073709551615n) {
        console.error("Amount exceeds maximum uint64 limit");
        return;
      }

      const encryptedAmount = await onEncryptInput(FheTypes.Uint64, parsedAmount.toString());
      if (!encryptedAmount) return;

      await writeContractAsync({
        functionName: "depositFUSD",
        args: [encryptedAmount as any],
      });

      setAmount("");
    } catch (error) {
      console.error("Failed to deposit:", error);
    }
  }, [amount, onEncryptInput, writeContractAsync]);

  const isProcessing = isSettingOperator || isDepositing || isEncryptingInput;

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">💳</div>
          <h1 className="text-2xl font-bold text-base-content mb-2">Connect Wallet</h1>
          <p className="text-base-content/60">Connect your wallet to deposit AUSD</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b border-base-300 bg-base-100">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-base-content">Deposit AUSD</h1>
          <p className="text-base-content/60 mt-1">Deposit AUSD to bet on shielded stablecoin markets</p>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          {/* Steps */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className={`flex items-center gap-2 ${step === "approve" ? "text-primary" : "text-success"}`}>
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step === "approve" ? "bg-primary text-primary-content" : "bg-success text-success-content"}`}
              >
                {step === "approve" ? "1" : "✓"}
              </div>
              <span className="font-medium">Approve</span>
            </div>
            <div className="w-8 h-0.5 bg-base-300" />
            <div className={`flex items-center gap-2 ${step === "deposit" ? "text-primary" : "text-base-content/40"}`}>
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step === "deposit" ? "bg-primary text-primary-content" : "bg-base-300"}`}
              >
                2
              </div>
              <span className="font-medium">Deposit</span>
            </div>
          </div>

          {/* Debug Info */}
          <div className="collapse collapse-arrow bg-base-200 border border-base-300 rounded-xl mb-6">
            <input type="checkbox" />
            <div className="collapse-title text-sm font-medium">Debug Info</div>
            <div className="collapse-content text-xs overflow-auto">
              <p>Wallet: {address}</p>
              <p>Market Contract: {predictionMarketAddress}</p>
              <p>Is Operator: {isOperator ? "YES" : "NO"}</p>
              <p>AUSD: {AUSD_ADDRESS}</p>
            </div>
          </div>

          {/* Card */}
          <div className="bg-base-100 border border-base-300 rounded-xl p-6">
            <div className="mb-4">
              <div className="text-sm text-base-content/60 mb-1">Connected:</div>
              <Address address={address} />
            </div>

            {step === "approve" && (
              <>
                <p className="text-sm text-base-content/70 mb-4">
                  First, authorize the prediction market contract as an <b>operator</b> for your AUSD. This allows it to
                  transfer your encrypted tokens for deposits.
                </p>
                <button
                  className={`btn btn-primary w-full ${isSettingOperator ? "btn-disabled" : ""}`}
                  onClick={handleApprove}
                  disabled={isSettingOperator || !predictionMarketAddress}
                >
                  {isSettingOperator && <span className="loading loading-spinner loading-sm" />}
                  Set Operator (Approve)
                </button>
              </>
            )}

            {step === "deposit" && (
              <>
                <div className="badge badge-success mb-4">✓ Operator Set</div>

                <div className="form-control mb-6">
                  <label className="label">
                    <span className="label-text">Amount (AUSD)</span>
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 10"
                    className="input input-bordered w-full"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    min="0"
                    step="0.01"
                  />
                </div>

                <button
                  className={`btn btn-primary w-full ${isProcessing ? "btn-disabled" : ""}`}
                  onClick={handleDeposit}
                  disabled={isProcessing || !amount}
                >
                  {isProcessing && <span className="loading loading-spinner loading-sm" />}
                  {isEncryptingInput ? "Encrypting..." : isDepositing ? "Depositing..." : "Deposit AUSD"}
                </button>

                <div className="mt-4 text-center">
                  <button
                    className="btn btn-ghost btn-xs text-xs opacity-50 hover:opacity-100"
                    onClick={handleApprove}
                    disabled={isSettingOperator}
                  >
                    Force Re-Approve (Use if failing)
                  </button>
                </div>
              </>
            )}

            <div className="mt-4 p-3 bg-base-200 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-base-content/60">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
                Your deposit amount is encrypted end-to-end
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
