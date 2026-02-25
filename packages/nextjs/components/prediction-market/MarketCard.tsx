"use client";

import { MarketStatus, MarketStatusBadge } from "./MarketStatusBadge";

interface MarketCardProps {
  marketId: number;
  question: string;
  closeTime: number;
  status: MarketStatus;
  currency: "ETH" | "FUSD";
  isSelected?: boolean;
  onClick?: () => void;
}

/**
 * MarketCard - Displays a prediction market summary
 * Shows question, close time, status badge, and currency type
 */
export const MarketCard = ({
  marketId,
  question,
  closeTime,
  status,
  currency,
  isSelected,
  onClick,
}: MarketCardProps) => {
  const timeRemaining = closeTime * 1000 - Date.now();
  const isExpired = timeRemaining <= 0;

  const formatTimeRemaining = () => {
    if (isExpired) return "Closed";

    const days = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `${days}d ${hours}h remaining`;
    if (hours > 0) return `${hours}h remaining`;

    const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
    return `${minutes}m remaining`;
  };

  return (
    <div
      className={`market-card cursor-pointer ${isSelected ? "border-primary ring-2 ring-primary/20" : ""}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <MarketStatusBadge status={status} />
        <span className="text-xs text-base-content/50">#{marketId}</span>
      </div>

      <h3 className="text-base font-semibold text-base-content mb-3 line-clamp-2">{question}</h3>

      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <span className="encrypted-indicator">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            Encrypted
          </span>
        </div>
        <div className="flex items-center gap-2 text-base-content/60">
          <span className="font-medium">{currency}</span>
          <span>•</span>
          <span>{formatTimeRemaining()}</span>
        </div>
      </div>
    </div>
  );
};
