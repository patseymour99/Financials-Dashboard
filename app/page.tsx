"use client";

import { useEffect, useState, useCallback } from "react";
import { MarketBar } from "@/components/MarketBar";
import { FundCard } from "@/components/FundCard";
import { HoldingsTable } from "@/components/HoldingsTable";
import { NewsSection } from "@/components/NewsSection";
import { AIBriefing } from "@/components/AIBriefing";
import {
  RefreshCw,
  TrendingUp,
  AlertCircle,
  BarChart2,
} from "lucide-react";
import { DashboardData, BriefingRequest } from "@/lib/types";
import { format } from "date-fns";

const REFRESH_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

export default function Home() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [loadingNews, setLoadingNews] = useState(true);
  const [error, setError] = useState("");
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const fetchAll = useCallback(async () => {
    setLoadingData(true);
    setLoadingNews(true);
    setError("");

    try {
      const [fundsRes, newsRes] = await Promise.allSettled([
        fetch("/api/funds"),
        fetch("/api/news"),
      ]);

      const fundsData =
        fundsRes.status === "fulfilled" && fundsRes.value.ok
          ? await fundsRes.value.json()
          : null;

      const newsData =
        newsRes.status === "fulfilled" && newsRes.value.ok
          ? await newsRes.value.json()
          : null;

      setData({
        funds: fundsData?.funds ?? [],
        indices: fundsData?.indices ?? [],
        news: newsData ?? { market: [], sector: [], portfolio: [] },
        lastUpdated: new Date().toISOString(),
      });

      setLastRefreshed(new Date());
    } catch (err) {
      setError((err as Error).message || "Failed to load dashboard data");
    } finally {
      setLoadingData(false);
      setLoadingNews(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchAll]);

  const briefingRequest: BriefingRequest | null = data
    ? {
        fundData: data.funds,
        indices: data.indices,
        news: data.news,
      }
    : null;

  const today = format(new Date(), "EEEE, MMMM do yyyy");
  const isLoading = loadingData || loadingNews;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Market ticker bar */}
      {data?.indices && <MarketBar indices={data.indices} />}

      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <BarChart2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-white font-bold text-xl leading-none">
                Financials Dashboard
              </h1>
              <p className="text-gray-500 text-xs mt-0.5">{today}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {lastRefreshed && (
              <span className="text-gray-600 text-xs">
                Updated {format(lastRefreshed, "HH:mm:ss")}
              </span>
            )}
            <button
              onClick={fetchAll}
              disabled={isLoading}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-sm transition-colors disabled:opacity-50"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Loading state */}
        {isLoading && !data && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="flex items-center gap-2 text-gray-400">
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span className="text-sm">Loading market data…</span>
            </div>
            <p className="text-gray-600 text-xs">
              Fetching fund quotes, holdings, and news
            </p>
          </div>
        )}

        {data && (
          <>
            {/* Fund Cards */}
            <section>
              <SectionLabel
                icon={<TrendingUp className="w-3.5 h-3.5" />}
                label="Fund Overview"
              />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-3">
                {data.funds.map((fd) => (
                  <FundCard key={fd.fund.id} data={fd} />
                ))}
              </div>
            </section>

            {/* Holdings */}
            <section>
              <SectionLabel
                icon={<BarChart2 className="w-3.5 h-3.5" />}
                label="Portfolio Holdings"
              />
              <div className="mt-3">
                {data.funds.length > 0 && (
                  <HoldingsTable funds={data.funds} />
                )}
              </div>
            </section>

            {/* AI Briefing */}
            {briefingRequest && (
              <section>
                <AIBriefing data={briefingRequest} />
              </section>
            )}

            {/* News */}
            <section>
              <SectionLabel
                icon={<span className="text-xs">📰</span>}
                label="Latest News"
                sublabel="Broad market · Financial sector · Portfolio companies"
              />
              <div className="mt-3">
                <NewsSection news={data.news} />
              </div>
            </section>
          </>
        )}

        <footer className="pt-4 pb-2 text-center text-gray-700 text-xs">
          Data from Yahoo Finance · AI by Claude · Refreshes every 15 min ·{" "}
          <span className="text-gray-600">
            Built for BGF World Financials &amp; iShares Fintech Active ETF
          </span>
        </footer>
      </div>
    </div>
  );
}

function SectionLabel({
  icon,
  label,
  sublabel,
}: {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-gray-500">{icon}</span>
      <h2 className="text-gray-400 text-xs font-semibold uppercase tracking-widest">
        {label}
      </h2>
      {sublabel && (
        <>
          <span className="text-gray-700">·</span>
          <span className="text-gray-600 text-xs">{sublabel}</span>
        </>
      )}
    </div>
  );
}
