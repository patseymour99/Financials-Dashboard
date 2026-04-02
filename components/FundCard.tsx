"use client";

import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { FundData, HoldingQuote } from "@/lib/types";
import { format, parseISO } from "date-fns";

interface Props { data: FundData }

// ── Sub-components ────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-lg px-3 py-2 text-xs border shadow-lg"
      style={{ background: "var(--surface-3)", borderColor: "var(--border-2)" }}
    >
      <p style={{ color: "var(--text-3)" }}>
        {label ? format(parseISO(label), "dd MMM yyyy") : ""}
      </p>
      <p className="font-bold tabnum mt-0.5" style={{ color: "var(--text-1)" }}>
        {Number(payload[0].value).toFixed(2)}
      </p>
    </div>
  );
}

function StatPill({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: "var(--text-3)" }}>
        {label}
      </span>
      <span className="text-xs font-semibold tabnum" style={{ color: "var(--text-2)" }}>
        {value ?? "—"}
      </span>
    </div>
  );
}

function PerfBadge({ label, value }: { label: string; value?: number | null }) {
  if (value == null) {
    return (
      <div className="flex flex-col items-center gap-0.5 min-w-[52px]">
        <span className="text-[10px] uppercase tracking-wider font-medium" style={{ color: "var(--text-3)" }}>{label}</span>
        <span className="text-sm font-bold" style={{ color: "var(--text-3)" }}>—</span>
      </div>
    );
  }
  const isPos = value >= 0;
  return (
    <div className="flex flex-col items-center gap-0.5 min-w-[52px]">
      <span className="text-[10px] uppercase tracking-wider font-medium" style={{ color: "var(--text-3)" }}>{label}</span>
      <span
        className="text-sm font-bold tabnum"
        style={{ color: isPos ? "var(--green)" : "var(--red)" }}
      >
        {isPos ? "+" : ""}{value.toFixed(2)}%
      </span>
    </div>
  );
}

function HoldingRow({ h, max, color }: { h: HoldingQuote; max: number; color: string }) {
  const hasPrice = h.price > 0;
  const isUp = h.changePercent >= 0;
  const barPct = h.fundWeight != null ? Math.min(100, (h.fundWeight / max) * 100) : 0;

  return (
    <div
      className="flex items-center gap-3 py-2 px-3 rounded-lg transition-colors group cursor-default"
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-3)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "")}
    >
      {/* Ticker */}
      <span
        className="text-xs font-mono font-semibold w-12 shrink-0"
        style={{ color }}
      >
        {h.ticker}
      </span>

      {/* Name + weight bar */}
      <div className="flex-1 min-w-0">
        <p className="text-xs truncate font-medium leading-none mb-1.5" style={{ color: "var(--text-2)" }}>
          {h.name}
        </p>
        {h.fundWeight != null && (
          <div className="flex items-center gap-2">
            <div className="flex-1 h-[3px] rounded-full" style={{ background: "var(--surface-3)" }}>
              <div
                className="h-full rounded-full"
                style={{ width: `${barPct}%`, background: color, opacity: 0.7 }}
              />
            </div>
            <span className="text-[10px] tabnum shrink-0" style={{ color: "var(--text-3)" }}>
              {h.fundWeight.toFixed(1)}%
            </span>
          </div>
        )}
      </div>

      {/* Price + change */}
      <div className="text-right shrink-0">
        {hasPrice ? (
          <>
            <p className="text-xs font-semibold tabnum leading-none" style={{ color: "var(--text-1)" }}>
              ${h.price.toFixed(2)}
            </p>
            <p
              className="text-[10px] tabnum mt-0.5 leading-none"
              style={{ color: isUp ? "var(--green)" : "var(--red)" }}
            >
              {isUp ? "+" : ""}{h.changePercent.toFixed(2)}%
            </p>
          </>
        ) : (
          <p className="text-xs" style={{ color: "var(--text-3)" }}>—</p>
        )}
      </div>
    </div>
  );
}

function fmtVol(v: number): string {
  if (!v) return "—";
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `${(v / 1_000).toFixed(0)}K`;
  return String(v);
}

function fmtPrice(v: number): string {
  if (!v) return "—";
  if (v < 10)    return v.toFixed(4);
  if (v < 1000)  return v.toFixed(2);
  return v.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

// ── Main component ────────────────────────────────────────────────────────

export function FundCard({ data }: Props) {
  const { fund, quote, history, holdings } = data;

  const isUp       = (quote?.changePercent ?? 0) >= 0;
  const chartColor = isUp ? "#22c55e" : "#ef4444";

  const chartData = history.slice(-90);
  const prices    = chartData.map((d) => d.close).filter((v) => v > 0);
  const minVal    = prices.length ? Math.min(...prices) * 0.99  : 0;
  const maxVal    = prices.length ? Math.max(...prices) * 1.01  : 1;

  // For holdings weight bars scale
  const maxWeight = Math.max(1, ...holdings.map((h) => h.fundWeight ?? 0));

  const top5 = holdings.slice(0, 5);

  return (
    <div
      className="rounded-2xl border overflow-hidden flex flex-col"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      {/* Colour accent strip */}
      <div className="h-[3px] w-full" style={{ background: fund.color }} />

      <div className="p-5 flex flex-col gap-5">

        {/* ── Header ──────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span
                className="text-[10px] font-mono tracking-widest uppercase px-1.5 py-0.5 rounded"
                style={{ color: fund.color, background: `${fund.color}18` }}
              >
                {fund.isin ?? fund.ticker}
              </span>
              {quote?.navDate && (
                <span className="text-[10px]" style={{ color: "var(--text-3)" }}>
                  as of {format(parseISO(quote.navDate), "d MMM yyyy")}
                </span>
              )}
            </div>
            <h2 className="text-base font-bold leading-tight" style={{ color: "var(--text-1)" }}>
              {fund.name}
            </h2>
            <p className="text-[11px] mt-1 leading-snug line-clamp-2" style={{ color: "var(--text-3)" }}>
              {fund.description}
            </p>
          </div>
        </div>

        {/* ── Price hero ──────────────────────────────────────── */}
        {quote && quote.price > 0 ? (
          <>
            <div className="flex items-end justify-between gap-4">
              {/* Left: price */}
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[2.5rem] font-extrabold leading-none tabnum" style={{ color: "var(--text-1)" }}>
                    {fmtPrice(quote.price)}
                  </span>
                  <span className="text-sm font-medium pb-0.5" style={{ color: "var(--text-3)" }}>
                    {quote.currency}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  <span
                    className="text-base font-bold tabnum"
                    style={{ color: isUp ? "var(--green)" : "var(--red)" }}
                  >
                    {isUp ? "▲" : "▼"} {Math.abs(quote.changePercent).toFixed(2)}%
                  </span>
                  <span className="text-sm tabnum" style={{ color: "var(--text-3)" }}>
                    {quote.change >= 0 ? "+" : ""}{quote.change.toFixed(2)} today
                  </span>
                </div>
              </div>

              {/* Right: Day / MTD / YTD */}
              <div
                className="flex items-center gap-4 px-4 py-2.5 rounded-xl border shrink-0"
                style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
              >
                <PerfBadge label="Day" value={quote.changePercent} />
                <div className="w-px h-8" style={{ background: "var(--border)" }} />
                <PerfBadge label="MTD"  value={quote.mtdReturn} />
                <div className="w-px h-8" style={{ background: "var(--border)" }} />
                <PerfBadge label="YTD"  value={quote.ytdReturn} />
              </div>
            </div>

            {/* ── Chart ─────────────────────────────────────────── */}
            <div className="h-[200px] -mx-1">
              {chartData.length > 1 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                    <defs>
                      <linearGradient id={`g-${fund.id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor={chartColor} stopOpacity={0.3} />
                        <stop offset="75%"  stopColor={chartColor} stopOpacity={0.05} />
                        <stop offset="100%" stopColor={chartColor} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" hide />
                    <YAxis domain={[minVal, maxVal]} hide />
                    <Tooltip content={<ChartTooltip />} />
                    {chartData.length > 0 && (
                      <ReferenceLine y={chartData[0]?.close} stroke="var(--border-2)" strokeDasharray="3 3" />
                    )}
                    <Area
                      type="monotone"
                      dataKey="close"
                      stroke={chartColor}
                      strokeWidth={2}
                      fill={`url(#g-${fund.id})`}
                      dot={false}
                      activeDot={{ r: 4, fill: chartColor, stroke: "var(--surface)" }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs" style={{ color: "var(--text-3)" }}>
                  Loading chart…
                </div>
              )}
            </div>

            {/* ── OHLC stat row ────────────────────────────────── */}
            <div
              className="grid grid-cols-5 gap-3 px-4 py-3 rounded-xl border"
              style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
            >
              <StatPill label="Open"       value={fmtPrice(quote.open)} />
              <StatPill label="High"       value={fmtPrice(quote.dayHigh)} />
              <StatPill label="Low"        value={fmtPrice(quote.dayLow)} />
              <StatPill label="Prev close" value={fmtPrice(quote.previousClose)} />
              <StatPill label="Volume"     value={fmtVol(quote.volume)} />
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2 text-sm py-4" style={{ color: "var(--amber)" }}>
            <span>⚠</span>
            <span>Price unavailable — {fund.ticker}</span>
          </div>
        )}

        {/* ── Top holdings ─────────────────────────────────────── */}
        {top5.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-3)" }}>
                Top Holdings
              </span>
              <span className="flex-1 h-px" style={{ background: "var(--border)" }} />
              {holdings.length > 5 && (
                <span className="text-[10px]" style={{ color: "var(--text-3)" }}>
                  +{holdings.length - 5} more
                </span>
              )}
            </div>
            <div className="-mx-1">
              {top5.map((h) => (
                <HoldingRow key={h.ticker} h={h} max={maxWeight} color={fund.color} />
              ))}
            </div>
          </div>
        )}

        {holdings.length === 0 && fund.isharesProductId && (
          <div className="flex items-center gap-2 py-2 text-xs" style={{ color: "var(--text-3)" }}>
            <span className="animate-pulse">⟳</span>
            <span>Fetching live holdings from iShares…</span>
          </div>
        )}

      </div>

      {/* ── Card footer ─────────────────────────────────────── */}
      <div
        className="mt-auto px-5 py-2.5 border-t flex items-center justify-between"
        style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
      >
        <span className="text-[10px] font-mono" style={{ color: "var(--text-3)" }}>
          {fund.isin ? `UCITS · ${fund.isin}` : `NYSE Arca · ${fund.ticker}`}
        </span>
        <span className="text-[10px]" style={{ color: "var(--text-3)" }}>
          Yahoo Finance
        </span>
      </div>
    </div>
  );
}
