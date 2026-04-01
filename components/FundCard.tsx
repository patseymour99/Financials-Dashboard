"use client";

import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import { FundData } from "@/lib/types";
import { format, parseISO } from "date-fns";

interface Props { data: FundData }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded px-2.5 py-1.5 text-xs border"
      style={{ background: "var(--surface-3)", borderColor: "var(--border-2)" }}
    >
      <p style={{ color: "var(--text-2)" }}>
        {label ? format(parseISO(label), "dd MMM yyyy") : ""}
      </p>
      <p className="font-semibold tabnum" style={{ color: "var(--text-1)" }}>
        {Number(payload[0].value).toFixed(2)}
      </p>
    </div>
  );
}

function PerfStat({
  label,
  value,
}: {
  label: string;
  value: number | null | undefined;
}) {
  if (value == null) {
    return (
      <div className="flex flex-col items-center gap-0.5">
        <span className="text-xs" style={{ color: "var(--text-3)" }}>{label}</span>
        <span className="text-xs tabnum" style={{ color: "var(--text-3)" }}>—</span>
      </div>
    );
  }
  const isPos = value >= 0;
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-xs" style={{ color: "var(--text-3)" }}>{label}</span>
      <span
        className="text-xs font-semibold tabnum"
        style={{ color: isPos ? "var(--green)" : "var(--red)" }}
      >
        {isPos ? "+" : ""}{value.toFixed(2)}%
      </span>
    </div>
  );
}

export function FundCard({ data }: Props) {
  const { fund, quote, history } = data;
  const isUcits    = !!fund.isin;
  const isUp       = (quote?.changePercent ?? 0) >= 0;
  const chartColor = isUp ? "#22c55e" : "#ef4444";

  const chartData = history.slice(-90);
  const prices = chartData.map((d) => d.close).filter((v) => v > 0);
  const minVal = prices.length ? Math.min(...prices) * 0.993 : 0;
  const maxVal = prices.length ? Math.max(...prices) * 1.007 : 1;

  const dataDetail  = isUcits ? `Yahoo · ${fund.ticker}` : `NYSE Arca · ${fund.ticker}`;
  const exchangeLabel = isUcits ? "UCITS / Luxembourg" : "NYSE Arca";

  return (
    <div
      className="rounded-xl border flex flex-col overflow-hidden"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      {/* Colour accent bar */}
      <div className="h-0.5 w-full" style={{ background: fund.color }} />

      <div className="p-5 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-xs font-mono tracking-widest uppercase" style={{ color: "var(--text-3)" }}>
                {isUcits ? fund.isin : fund.ticker}
              </span>
            </div>
            <h2 className="font-bold text-base leading-tight" style={{ color: "var(--text-1)" }}>
              {fund.name}
            </h2>
            <p className="text-xs mt-0.5 line-clamp-1" style={{ color: "var(--text-3)" }}>
              {fund.description}
            </p>
          </div>
          <span
            className="shrink-0 text-xs font-medium px-2 py-0.5 rounded border"
            style={{ color: "var(--text-3)", borderColor: "var(--border-2)", background: "var(--surface-2)" }}
          >
            Yahoo Finance
          </span>
        </div>

        {/* Price / NAV */}
        {quote && quote.price > 0 ? (
          <>
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold tabnum" style={{ color: "var(--text-1)" }}>
                    {quote.price.toFixed(2)}
                  </span>
                  <span className="text-sm font-medium" style={{ color: "var(--text-3)" }}>
                    {quote.currency}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className="text-sm font-semibold tabnum"
                    style={{ color: isUp ? "var(--green)" : "var(--red)" }}
                  >
                    {isUp ? "▲" : "▼"} {Math.abs(quote.changePercent).toFixed(2)}%
                  </span>
                  <span className="text-xs" style={{ color: "var(--text-3)" }}>
                    {isUp ? "+" : ""}{quote.change.toFixed(2)} today
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs" style={{ color: "var(--text-3)" }}>Prev close</p>
                <p className="text-sm font-medium tabnum" style={{ color: "var(--text-2)" }}>
                  {quote.previousClose.toFixed(2)}
                </p>
                {quote.navDate && (
                  <>
                    <p className="text-xs mt-1" style={{ color: "var(--text-3)" }}>As of</p>
                    <p className="text-xs tabnum" style={{ color: "var(--text-2)" }}>
                      {format(parseISO(quote.navDate), "dd MMM yyyy")}
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Performance row: Day / MTD / YTD */}
            <div
              className="grid grid-cols-3 rounded-lg border py-3"
              style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
            >
              <PerfStat label="Day"  value={quote.changePercent} />
              <div className="border-x" style={{ borderColor: "var(--border)" }}>
                <PerfStat label="MTD" value={quote.mtdReturn} />
              </div>
              <PerfStat label="YTD"  value={quote.ytdReturn} />
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2 text-sm py-2" style={{ color: "var(--amber)" }}>
            <span>⚠</span>
            <span>Live price unavailable — {fund.ticker}</span>
          </div>
        )}

        {/* 90-day chart */}
        {chartData.length > 1 ? (
          <div className="h-24 -mx-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id={`g-${fund.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor={chartColor} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={chartColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" hide />
                <YAxis domain={[minVal, maxVal]} hide />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="close" stroke={chartColor} strokeWidth={1.5}
                  fill={`url(#g-${fund.id})`} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-24 flex items-center justify-center text-xs" style={{ color: "var(--text-3)" }}>
            Loading price history…
          </div>
        )}
      </div>

      {/* Stats footer */}
      <div
        className="grid grid-cols-2 divide-x border-t"
        style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
      >
        {[
          { label: "Exchange", value: exchangeLabel },
          { label: "Data source", value: dataDetail },
        ].map(({ label, value }) => (
          <div key={label} className="px-4 py-2.5" style={{ borderColor: "var(--border)" }}>
            <p className="text-xs" style={{ color: "var(--text-3)" }}>{label}</p>
            <p className="text-xs font-medium mt-0.5 truncate" style={{ color: "var(--text-2)" }}>{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
