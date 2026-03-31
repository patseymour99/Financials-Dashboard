"use client";

import { useEffect, useState, useCallback } from "react";
import { MarketBar } from "@/components/MarketBar";
import { FundCard } from "@/components/FundCard";
import { HoldingsTable } from "@/components/HoldingsTable";
import { NewsSection } from "@/components/NewsSection";
import { AIBriefing } from "@/components/AIBriefing";
import { PerformanceMetrics } from "@/components/PerformanceMetrics";
import { DashboardData, BriefingRequest, MetricAsset, Sector, FundData } from "@/lib/types";
import { SECTORS } from "@/lib/constants";
import { format } from "date-fns";

const REFRESH_MS = 15 * 60 * 1000;

function SectionHeading({ label, sub }: { label: string; sub?: string }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-3)" }}>
        {label}
      </h2>
      {sub && (
        <>
          <span style={{ color: "var(--border-2)" }}>·</span>
          <span className="text-xs" style={{ color: "var(--text-3)" }}>{sub}</span>
        </>
      )}
      <span className="flex-1 h-px ml-1" style={{ background: "var(--border)" }} />
    </div>
  );
}

interface SectorTabsProps {
  activeSector: Sector;
  onChange: (s: Sector) => void;
}

function SectorTabs({ activeSector, onChange }: SectorTabsProps) {
  return (
    <div
      className="sticky top-[52px] z-40 border-b"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex gap-0">
          {SECTORS.map((sector) => {
            const isActive = activeSector === sector.id;
            return (
              <button
                key={sector.id}
                onClick={() => onChange(sector.id)}
                className="relative flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-colors"
                style={{
                  color: isActive ? "var(--text-1)" : "var(--text-3)",
                  borderBottom: isActive ? `2px solid ${sector.color}` : "2px solid transparent",
                  marginBottom: "-1px",
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: isActive ? sector.color : "var(--border-2)" }}
                />
                {sector.name}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [data, setData]             = useState<DashboardData | null>(null);
  const [metrics, setMetrics]       = useState<MetricAsset[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [lastRefreshed, setLast]    = useState<Date | null>(null);
  const [marketOpen, setMarketOpen] = useState<"pre" | "open" | "closed">("closed");
  const [activeSector, setActiveSector] = useState<Sector>("financials");

  // Determine US market status
  useEffect(() => {
    const update = () => {
      const now = new Date();
      const et  = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
      const h   = et.getHours() + et.getMinutes() / 60;
      const day = et.getDay();
      if (day === 0 || day === 6) { setMarketOpen("closed"); return; }
      if (h >= 9.5 && h < 16)    { setMarketOpen("open");   return; }
      if (h >= 4 && h < 9.5)     { setMarketOpen("pre");    return; }
      setMarketOpen("closed");
    };
    update();
    const t = setInterval(update, 60_000);
    return () => clearInterval(t);
  }, []);

  const fetchAll = useCallback(async (sector: Sector = "financials") => {
    setLoading(true); setError("");
    try {
      const [fundsRes, newsRes, metricsRes] = await Promise.allSettled([
        fetch("/api/funds"),
        fetch(`/api/news?sector=${sector}`),
        fetch("/api/metrics"),
      ]);

      const funds   = fundsRes.status   === "fulfilled" && fundsRes.value.ok   ? await fundsRes.value.json()   : null;
      const news    = newsRes.status    === "fulfilled" && newsRes.value.ok    ? await newsRes.value.json()    : null;
      const mtrData = metricsRes.status === "fulfilled" && metricsRes.value.ok ? await metricsRes.value.json() : null;

      setData({
        funds:   funds?.funds   ?? [],
        indices: funds?.indices ?? [],
        metrics: mtrData?.metrics ?? [],
        news:    news ?? { market: [], sector: [], portfolio: [] },
        lastUpdated: new Date().toISOString(),
      });
      setMetrics(mtrData?.metrics ?? []);
      setLast(new Date());
    } catch (e) {
      setError((e as Error).message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchAll(activeSector);
    const t = setInterval(() => fetchAll(activeSector), REFRESH_MS);
    return () => clearInterval(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchAll]);

  // Re-fetch news when sector tab changes
  const handleSectorChange = useCallback(async (sector: Sector) => {
    setActiveSector(sector);
    // Only re-fetch news (fast) — fund/metrics data is sector-agnostic
    try {
      const newsRes = await fetch(`/api/news?sector=${sector}`);
      if (newsRes.ok) {
        const news = await newsRes.json();
        setData((prev) =>
          prev ? { ...prev, news } : prev
        );
      }
    } catch {
      // non-fatal
    }
  }, []);

  // Filter funds for the active sector
  const sectorFunds: FundData[] = (data?.funds ?? []).filter(
    (fd) => fd.fund.sector === activeSector
  );

  const activeSectorConfig = SECTORS.find((s) => s.id === activeSector);

  const briefingReq: BriefingRequest | null = data
    ? { fundData: sectorFunds, indices: data.indices, metrics, news: data.news }
    : null;

  const statusColor = marketOpen === "open" ? "var(--green)" : marketOpen === "pre" ? "var(--amber)" : "var(--text-3)";
  const statusLabel = marketOpen === "open" ? "US Market Open" : marketOpen === "pre" ? "Pre-Market" : "US Market Closed";

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>

      {/* ── App header ──────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-50 flex items-center gap-4 px-6 py-3 border-b"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
            style={{ background: "linear-gradient(135deg,#f59e0b,#ea580c)", color: "#fff" }}
          >
            FD
          </div>
          <div>
            <p className="text-xs font-bold tracking-tight leading-none" style={{ color: "var(--text-1)" }}>
              Financials Dashboard
            </p>
            <p className="text-xs leading-none mt-0.5" style={{ color: "var(--text-3)" }}>
              {activeSectorConfig?.description ?? "Sector Equity Coverage"}
            </p>
          </div>
        </div>

        <div className="h-5 w-px mx-1" style={{ background: "var(--border-2)" }} />

        {/* Date */}
        <p className="text-xs hidden sm:block" style={{ color: "var(--text-3)" }}>
          {format(new Date(), "EEEE, d MMMM yyyy")}
        </p>

        <div className="ml-auto flex items-center gap-3">
          {/* Market status */}
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusColor }} />
            <span className="text-xs font-medium" style={{ color: statusColor }}>{statusLabel}</span>
          </div>

          {/* Last updated */}
          {lastRefreshed && (
            <span className="text-xs hidden md:block" style={{ color: "var(--text-3)" }}>
              Updated {format(lastRefreshed, "HH:mm:ss")}
            </span>
          )}

          {/* Refresh */}
          <button
            onClick={() => fetchAll(activeSector)}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded border transition-colors disabled:opacity-50"
            style={{
              color: "var(--text-2)",
              borderColor: "var(--border-2)",
              background: "var(--surface-2)",
            }}
          >
            <span className={loading ? "animate-spin inline-block" : ""}>⟳</span>
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>
      </header>

      {/* ── Ticker bar ──────────────────────────────────────────── */}
      {data?.indices && <MarketBar indices={data.indices} />}

      {/* ── Sector tabs ─────────────────────────────────────────── */}
      <SectorTabs activeSector={activeSector} onChange={handleSectorChange} />

      {/* ── Main content ────────────────────────────────────────── */}
      <main className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">

        {/* Error banner */}
        {error && (
          <div
            className="flex items-center gap-2 rounded-lg px-4 py-3 text-sm border"
            style={{ background: "rgba(239,68,68,0.08)", borderColor: "rgba(239,68,68,0.3)", color: "var(--red)" }}
          >
            ⚠ {error}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && !data && (
          <div className="flex items-center justify-center py-24 gap-2" style={{ color: "var(--text-3)" }}>
            <span className="animate-spin text-lg">⟳</span>
            <span className="text-sm">Loading market data…</span>
          </div>
        )}

        {data && (
          <>
            {/* ── 1. AI Morning Briefing (TOP) ── */}
            <section>
              <SectionHeading
                label="AI Morning Briefing"
                sub={`Claude · ${activeSectorConfig?.name ?? ""} Sector`}
              />
              <AIBriefing data={briefingReq} />
            </section>

            {/* ── 2. Fund Overview ── */}
            <section>
              <SectionHeading
                label="Fund Overview"
                sub={`${activeSectorConfig?.name} Sector · ${sectorFunds.length} fund${sectorFunds.length !== 1 ? "s" : ""}`}
              />
              {sectorFunds.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {sectorFunds.map((fd) => <FundCard key={fd.fund.id} data={fd} />)}
                </div>
              ) : (
                <div
                  className="rounded-xl border flex items-center justify-center py-16 text-sm"
                  style={{ borderColor: "var(--border)", color: "var(--text-3)" }}
                >
                  No funds configured for the {activeSectorConfig?.name} sector
                </div>
              )}
            </section>

            {/* ── 3. Market Performance ── */}
            <section>
              <SectionHeading label="Market Performance" sub="MTD & YTD · MSCI ACWI · S&P 500 · 10Y Yield · BTC · Gold · Oil" />
              <PerformanceMetrics metrics={metrics} />
            </section>

            {/* ── 4. Holdings ── */}
            <section>
              <SectionHeading
                label="Portfolio Holdings"
                sub={`${activeSectorConfig?.name} sector · Live quotes via Yahoo Finance`}
              />
              {sectorFunds.length > 0 && <HoldingsTable funds={sectorFunds} />}
            </section>

            {/* ── 5. News ── */}
            <section>
              <SectionHeading
                label="Latest News"
                sub={`${activeSectorConfig?.name} · Broad market · Portfolio companies`}
              />
              <NewsSection news={data.news} />
            </section>
          </>
        )}

        {/* Footer */}
        <footer className="pt-2 pb-4 flex items-center justify-between text-xs" style={{ color: "var(--text-3)" }}>
          <span>NAV data via BlackRock · Market data via Yahoo Finance · AI via Claude</span>
          <span>Auto-refreshes every 15 min</span>
        </footer>
      </main>
    </div>
  );
}
