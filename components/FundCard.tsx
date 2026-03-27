"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, TrendingDown, AlertCircle } from "lucide-react";
import { FundData } from "@/lib/types";
import { format, parseISO } from "date-fns";

interface Props {
  data: FundData;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs">
        <p className="text-gray-400">
          {label ? format(parseISO(label), "dd MMM yyyy") : ""}
        </p>
        <p className="text-white font-semibold">
          {Number(payload[0].value).toFixed(2)}
        </p>
      </div>
    );
  }
  return null;
}

export function FundCard({ data }: Props) {
  const { fund, quote, history } = data;
  const isUcits = !!fund.isin;
  const isUp = (quote?.changePercent ?? 0) >= 0;
  const color = fund.color;
  const chartColor = isUp ? "#10b981" : "#ef4444";

  const chartData = history.slice(-60);
  const prices = chartData.map((d) => d.close).filter((v) => v > 0);
  const minVal = prices.length ? Math.min(...prices) * 0.995 : 0;
  const maxVal = prices.length ? Math.max(...prices) * 1.005 : 1;

  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: color }}
            />
            <span className="text-gray-400 text-xs font-medium uppercase tracking-wide truncate">
              {isUcits ? `ISIN ${fund.isin}` : fund.ticker}
            </span>
            <span className="ml-auto text-gray-600 text-xs bg-gray-800 px-1.5 py-0.5 rounded">
              BlackRock
            </span>
          </div>
          <h2 className="text-white font-bold text-lg leading-tight">
            {fund.shortName}
          </h2>
          <p className="text-gray-500 text-xs mt-0.5 line-clamp-2">
            {fund.description}
          </p>
        </div>
      </div>

      {/* Price / NAV */}
      {quote ? (
        <div className="flex items-end gap-3">
          <div>
            <div className="flex items-baseline gap-1.5">
              <p className="text-3xl font-bold text-white tabular-nums">
                {quote.price > 0
                  ? `${quote.currency} ${quote.price.toFixed(2)}`
                  : "—"}
              </p>
              <span className="text-gray-600 text-xs">
                {isUcits ? "NAV" : "NAV"}
              </span>
            </div>
            <div
              className={`flex items-center gap-1.5 mt-1 ${
                isUp ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {isUp ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              <span className="text-sm font-semibold">
                {isUp ? "+" : ""}
                {quote.change.toFixed(2)} ({isUp ? "+" : ""}
                {quote.changePercent.toFixed(2)}%)
              </span>
              <span className="text-gray-500 text-xs">vs prev day</span>
            </div>
          </div>
          {quote.exchange && (
            <div className="ml-auto text-right">
              <p className="text-gray-600 text-xs leading-tight">
                {quote.exchange}
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2 text-amber-400">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <p className="text-sm">
            {isUcits
              ? "NAV unavailable — BlackRock endpoint may have changed"
              : `NAV unavailable — BlackRock product ${fund.blackrockProductId}`}
          </p>
        </div>
      )}

      {/* NAV history chart — available for both funds */}
      {chartData.length > 1 ? (
        <div className="h-28 -mx-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient
                  id={`grad-${fund.id}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor={chartColor}
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="95%"
                    stopColor={chartColor}
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" hide />
              <YAxis domain={[minVal, maxVal]} hide />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="close"
                stroke={chartColor}
                strokeWidth={2}
                fill={`url(#grad-${fund.id})`}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-28 flex items-center justify-center text-gray-600 text-xs">
          Loading NAV history…
        </div>
      )}

      {/* Key stats */}
      {quote && quote.price > 0 && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-2 border-t border-gray-800">
          <div>
            <p className="text-gray-500 text-xs">Prev Day NAV</p>
            <p className="text-white text-sm font-medium tabular-nums">
              {quote.currency} {quote.previousClose.toFixed(2)}
            </p>
          </div>
          {quote.navDate && (
            <div>
              <p className="text-gray-500 text-xs">As of</p>
              <p className="text-white text-sm font-medium">
                {format(parseISO(quote.navDate), "dd MMM yyyy")}
              </p>
            </div>
          )}
          {quote.ytdReturn != null && (
            <div>
              <p className="text-gray-500 text-xs">YTD</p>
              <p
                className={`text-sm font-semibold tabular-nums ${
                  quote.ytdReturn >= 0 ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {quote.ytdReturn >= 0 ? "+" : ""}
                {(quote.ytdReturn * 100).toFixed(2)}%
              </p>
            </div>
          )}
          {quote.expenseRatio != null && (
            <div>
              <p className="text-gray-500 text-xs">Expense Ratio</p>
              <p className="text-white text-sm font-medium">
                {(quote.expenseRatio * 100).toFixed(2)}%
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
