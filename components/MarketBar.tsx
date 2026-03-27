"use client";

import { MarketIndex } from "@/lib/types";

interface Props {
  indices: MarketIndex[];
}

function fmt(price: number): string {
  if (price === 0) return "—";
  if (price < 10)   return price.toFixed(4);
  if (price < 1000) return price.toFixed(2);
  return price.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

export function MarketBar({ indices }: Props) {
  if (!indices.length) return null;

  // Duplicate for seamless scroll loop
  const items = [...indices, ...indices];

  return (
    <div
      className="border-b overflow-hidden"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      <div className="flex ticker-track whitespace-nowrap">
        {items.map((idx, i) => {
          const isUp = idx.changePercent >= 0;
          const hasData = idx.price > 0;
          return (
            <div
              key={`${idx.ticker}-${i}`}
              className="inline-flex items-center gap-2 px-5 py-2 border-r shrink-0"
              style={{ borderColor: "var(--border)" }}
            >
              <span className="text-xs font-semibold tracking-wide" style={{ color: "var(--text-2)" }}>
                {idx.name}
              </span>
              {hasData ? (
                <>
                  <span className="text-xs font-semibold tabnum" style={{ color: "var(--text-1)" }}>
                    {fmt(idx.price)}
                  </span>
                  <span
                    className="text-xs font-medium tabnum"
                    style={{ color: isUp ? "var(--green)" : "var(--red)" }}
                  >
                    {isUp ? "▲" : "▼"} {Math.abs(idx.changePercent).toFixed(2)}%
                  </span>
                </>
              ) : (
                <span className="text-xs" style={{ color: "var(--text-3)" }}>—</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
