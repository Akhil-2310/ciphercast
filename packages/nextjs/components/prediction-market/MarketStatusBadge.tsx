"use client";

export type MarketStatus = "open" | "closed" | "resolved";

interface MarketStatusBadgeProps {
  status: MarketStatus;
  outcome?: boolean; // true = Yes won, false = No won (only for resolved)
}

/**
 * MarketStatusBadge - Shows the current state of a market
 */
export const MarketStatusBadge = ({ status, outcome }: MarketStatusBadgeProps) => {
  const config = {
    open: {
      label: "Open",
      className: "badge-open",
    },
    closed: {
      label: "Pending Resolution",
      className: "badge-closed",
    },
    resolved: {
      label: outcome ? "Yes Won" : "No Won",
      className: "badge-resolved",
    },
  };

  const { label, className } = config[status];

  return <span className={`badge badge-sm border ${className}`}>{label}</span>;
};
