"use client";

import { MetricAsset } from "@/lib/types";

interface Props { metrics: MetricAsset[] }

function PctCell({ value }: { value: number | null }) {
  if (value === null) return <span style={{ color: "var(--text-3)" }}>—</span>;
  const isUp = value >= 0;
  return (
    <span
      className="tabnum font-medium"
      style={{ color: isUp ? "var(--green)" : "var(--red)" }}
    >
      {isUp ? "+" : ""}{value.toFixed(2)}%
    </span>
  );
}

function PriceCell({ asset }: { asset: MetricAsset }) {
  if (asset.price === 0) return <span style={{ color: "var(--text-3)" }}>—</span>;

  let display: string;
  if (asset.isYield) {
    display = `${asset.price.toFixed(2)}%`;
  } else if (asset.isCrypto) {
    display = asset.price.toLocaleString("en-US", { maximumFractionDigits: 0 });
  } else if (asset.price >= 1000) {
    display = asset.price.toLocaleString("en-US", { maximumFractionDigits: 2 });
  } else {
    display = asset.price.toFixed(2);
  }

  return <span className="tabnum font-semibold" style={{ color: "var(--text-1)" }}>{display}</span>;
}

// Spark bar for visual context
function PerfBar({ value, max }: { value: number | null; max: number }) {
  if (value === null || max === 0) return null;
  const isUp = value >= 0;
  const width = Math.min(100, (Math.abs(value) / max) * 100);
  return (
    <div className="flex items-center gap-1.5 justify-end">
      <div className="w-16 h-1 rounded-full overflow-hidden flex" style={{ background: "var(--surface-3)" }}>
        {isUp ? (
          <>
            <div className="w-1/2" />
            <div className="h-full rounded-r-full" style={{ width: `${width / 2}%`, background: "var(--green-dim)" }} />
          </>
        ) : (
          <>
            <div className="h-full rounded-l-full ml-auto" style={{ width: `${width / 2}%`, background: "var(--red-dim)" }} />
            <div className="w-1/2" />
          </>
        )}
      </div>
    </div>
  );
}

export function PerformanceMetrics({ metrics }: Props) {
  if (!metrics.length) return null;

  // Max absolute YTD for bar scaling
  const maxYtd = Math.max(1, ...metrics.map((m) => Math.abs(m.ytdReturn ?? 0)));

  const cols = [
    { key: "name",    label: "Asset",     align: "left"  },
    { key: "label",   label: "Instrument",align: "left"  },
    { key: "price",   label: "Price",     align: "right" },
    { key: "day",     label: "Day",       align: "right" },
    { key: "mtd",     label: "MTD",       align: "right" },
    { key: "ytd",     label: "YTD",       align: "right" },
    { key: "bar",     label: "YTD range", align: "right" },
  ];

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: `1px solid var(--border)`, background: "var(--surface-2)" }}>
              {cols.map((c) => (
                <th
                  key={c.key}
                  className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-wider ${c.align === "right" ? "text-right" : "text-left"}`}
                  style={{ color: "var(--text-3)" }}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {metrics.map((m) => (
              <tr
                key={m.id}
                className="transition-colors"
                style={{ borderBottom: `1px solid var(--border)` }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "")}
              >
                <td className="px-4 py-3">
                  <span className="font-semibold text-sm" style={{ color: "var(--text-1)" }}>{m.name}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs" style={{ color: "var(--text-3)" }}>{m.label}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <PriceCell asset={m} />
                </td>
                <td className="px-4 py-3 text-right">
                  <PctCell value={m.changePercent} />
                </td>
                <td className="px-4 py-3 text-right">
                  <PctCell value={m.mtdReturn} />
                </td>
                <td className="px-4 py-3 text-right">
                  <PctCell value={m.ytdReturn} />
                </td>
                <td className="px-4 py-3 text-right w-28">
                  <PerfBar value={m.ytdReturn} max={maxYtd} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div
        className="flex items-center gap-2 px-4 py-2 border-t text-xs"
        style={{ borderColor: "var(--border)", background: "var(--surface-2)", color: "var(--text-3)" }}
      >
        <span>MTD &amp; YTD calculated vs first trading day of period</span>
        <span className="ml-auto">Prices via FMP · ETF proxies used for indices</span>
      </div>
    </div>
  );
}
