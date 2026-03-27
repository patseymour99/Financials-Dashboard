"use client";

import { useState } from "react";
import { FundData } from "@/lib/types";
import { TrendingUp, TrendingDown } from "lucide-react";

interface Props {
  funds: FundData[];
}

export function HoldingsTable({ funds }: Props) {
  const [activeTab, setActiveTab] = useState(0);
  const activeData = funds[activeTab];

  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-gray-800">
        {funds.map((fd, i) => (
          <button
            key={fd.fund.id}
            onClick={() => setActiveTab(i)}
            className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-colors ${
              activeTab === i
                ? "text-white border-b-2 -mb-px"
                : "text-gray-400 hover:text-gray-300"
            }`}
            style={
              activeTab === i
                ? { borderBottomColor: fd.fund.color }
                : {}
            }
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: fd.fund.color }}
            />
            {fd.fund.shortName}
          </button>
        ))}
        <div className="ml-auto flex items-center px-4">
          <span className="text-gray-600 text-xs">Top Holdings</span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left text-gray-500 font-medium text-xs uppercase tracking-wide px-4 py-2.5">
                Company
              </th>
              <th className="text-right text-gray-500 font-medium text-xs uppercase tracking-wide px-4 py-2.5">
                Ticker
              </th>
              <th className="text-right text-gray-500 font-medium text-xs uppercase tracking-wide px-4 py-2.5">
                Price
              </th>
              <th className="text-right text-gray-500 font-medium text-xs uppercase tracking-wide px-4 py-2.5">
                Change
              </th>
              <th className="text-right text-gray-500 font-medium text-xs uppercase tracking-wide px-4 py-2.5">
                % Change
              </th>
              <th className="text-right text-gray-500 font-medium text-xs uppercase tracking-wide px-4 py-2.5">
                Weight
              </th>
            </tr>
          </thead>
          <tbody>
            {activeData.holdings.map((h) => {
              const isUp = h.changePercent >= 0;
              const hasData = h.price > 0;
              return (
                <tr
                  key={h.ticker}
                  className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors"
                >
                  <td className="px-4 py-3 text-white font-medium">
                    {h.name}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-mono text-xs bg-gray-800 text-gray-300 px-1.5 py-0.5 rounded">
                      {h.ticker}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-white font-medium tabular-nums">
                    {hasData ? `$${h.price.toFixed(2)}` : "—"}
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-medium tabular-nums ${
                      !hasData
                        ? "text-gray-600"
                        : isUp
                          ? "text-emerald-400"
                          : "text-red-400"
                    }`}
                  >
                    {hasData
                      ? `${isUp ? "+" : ""}${h.change.toFixed(2)}`
                      : "—"}
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-medium tabular-nums ${
                      !hasData
                        ? "text-gray-600"
                        : isUp
                          ? "text-emerald-400"
                          : "text-red-400"
                    }`}
                  >
                    {hasData ? (
                      <span className="flex items-center justify-end gap-1">
                        {isUp ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        {isUp ? "+" : ""}
                        {h.changePercent.toFixed(2)}%
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-400 tabular-nums">
                    {h.fundWeight != null ? (
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-12 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.min(100, (h.fundWeight / 12) * 100)}%`,
                              backgroundColor: activeData.fund.color,
                            }}
                          />
                        </div>
                        <span className="text-xs">{h.fundWeight.toFixed(1)}%</span>
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!activeData.holdings.length && (
          <p className="text-center text-gray-600 text-sm py-8">
            Holdings data unavailable
          </p>
        )}
      </div>
    </div>
  );
}
