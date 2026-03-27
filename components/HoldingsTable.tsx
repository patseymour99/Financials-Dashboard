"use client";

import { useState } from "react";
import { FundData } from "@/lib/types";

interface Props { funds: FundData[] }

export function HoldingsTable({ funds }: Props) {
  const [active, setActive] = useState(0);
  const fd = funds[active];
  if (!fd) return null;

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      {/* Tab bar */}
      <div className="flex border-b" style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}>
        {funds.map((f, i) => (
          <button
            key={f.fund.id}
            onClick={() => setActive(i)}
            className="relative flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors"
            style={{ color: active === i ? "var(--text-1)" : "var(--text-3)" }}
          >
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: f.fund.color }} />
            {f.fund.shortName}
            {active === i && (
              <span
                className="absolute bottom-0 left-0 right-0 h-0.5"
                style={{ background: f.fund.color }}
              />
            )}
          </button>
        ))}
        <div className="ml-auto flex items-center px-4">
          <span className="text-xs font-medium uppercase tracking-widest" style={{ color: "var(--text-3)" }}>
            Top Holdings
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: `1px solid var(--border)` }}>
              {["#", "Company", "Ticker", "Price", "Change", "% Change", "Weight"].map((h, i) => (
                <th
                  key={h}
                  className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-wider ${i === 0 ? "text-left w-8" : i <= 2 ? "text-left" : "text-right"}`}
                  style={{ color: "var(--text-3)", background: "var(--surface-2)" }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {fd.holdings.map((h, idx) => {
              const isUp = h.changePercent >= 0;
              const has = h.price > 0;
              return (
                <tr
                  key={h.ticker}
                  className="transition-colors"
                  style={{ borderBottom: "1px solid var(--border)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                >
                  <td className="px-4 py-3 text-xs tabnum" style={{ color: "var(--text-3)" }}>
                    {idx + 1}
                  </td>
                  <td className="px-4 py-3 font-medium" style={{ color: "var(--text-1)" }}>
                    {h.name}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="text-xs font-mono px-1.5 py-0.5 rounded"
                      style={{ color: "var(--text-2)", background: "var(--surface-3)" }}
                    >
                      {h.ticker}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabnum font-medium" style={{ color: "var(--text-1)" }}>
                    {has ? `$${h.price.toFixed(2)}` : "—"}
                  </td>
                  <td
                    className="px-4 py-3 text-right tabnum font-medium"
                    style={{ color: !has ? "var(--text-3)" : isUp ? "var(--green)" : "var(--red)" }}
                  >
                    {has ? `${isUp ? "+" : ""}${h.change.toFixed(2)}` : "—"}
                  </td>
                  <td
                    className="px-4 py-3 text-right tabnum font-medium"
                    style={{ color: !has ? "var(--text-3)" : isUp ? "var(--green)" : "var(--red)" }}
                  >
                    {has ? (
                      <span className="flex items-center justify-end gap-1">
                        {isUp ? "▲" : "▼"} {Math.abs(h.changePercent).toFixed(2)}%
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {h.fundWeight != null ? (
                      <div className="flex items-center justify-end gap-2">
                        <div
                          className="w-16 h-1 rounded-full overflow-hidden"
                          style={{ background: "var(--surface-3)" }}
                        >
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.min(100, (h.fundWeight / 12) * 100)}%`,
                              background: fd.fund.color,
                            }}
                          />
                        </div>
                        <span className="text-xs tabnum" style={{ color: "var(--text-2)" }}>
                          {h.fundWeight.toFixed(1)}%
                        </span>
                      </div>
                    ) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!fd.holdings.length && (
          <p className="text-center py-10 text-sm" style={{ color: "var(--text-3)" }}>
            Holdings data unavailable
          </p>
        )}
      </div>
    </div>
  );
}
