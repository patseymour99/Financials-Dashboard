"use client";

import { MarketIndex } from "@/lib/types";
import { TrendingUp, TrendingDown } from "lucide-react";

interface Props {
  indices: MarketIndex[];
}

export function MarketBar({ indices }: Props) {
  if (!indices.length) return null;

  return (
    <div className="bg-gray-900 border-b border-gray-800 overflow-x-auto">
      <div className="flex items-center gap-0 min-w-max px-4">
        {indices.map((idx) => {
          const isUp = idx.changePercent >= 0;
          return (
            <div
              key={idx.ticker}
              className="flex items-center gap-2 px-4 py-2 border-r border-gray-800 last:border-r-0"
            >
              <span className="text-gray-400 text-xs font-medium whitespace-nowrap">
                {idx.name}
              </span>
              <span className="text-white text-xs font-semibold">
                {idx.price > 0
                  ? idx.price < 100
                    ? idx.price.toFixed(4)
                    : idx.price.toLocaleString("en-US", {
                        maximumFractionDigits: 2,
                      })
                  : "—"}
              </span>
              {idx.price > 0 && (
                <span
                  className={`flex items-center gap-0.5 text-xs font-medium ${
                    isUp ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {isUp ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  {isUp ? "+" : ""}
                  {idx.changePercent.toFixed(2)}%
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
