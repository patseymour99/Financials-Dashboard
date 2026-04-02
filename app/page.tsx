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

// ── Section heading ───────────────────────────────────────────────────────

function SectionHeading({ label, sub }: { label: string; sub?: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <h2
        className="text-[11px] font-semibold uppercase tracking-widest shrink-0"
        style={{ color: "var(--text-3)" }}
      >
        {label}
      </h2>
      {sub && (
        <span className="text-[11px] shrink-0" style={{ color: "var(--text-3)" }}>
          · {sub}
        </span>
      )}
      <span className="flex-1 h-px" style={{ background: "var(--border)" }} />
    </div>
  );
}

// ── Sector tabs ───────────────────────────────────────────────────────────

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
                  borderBottom: isActive
                    ? `2px solid ${sector.color}`
                    : "2px solid transparent",
                  marginBottom: "-1px",
                }}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0 transition-colors"
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

// ── Skeleton card ─────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div
      className="rounded-2xl border overflow-hidden animate-pulse"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      <div className="h-[3px]" style={{ background: "var(--border-2)" }} />
      <div className="p-5 space-y-4">
        <div className="h-4 rounded w-2/3" style={{ background: "var(--surface-3)" }} />
        <div className="h-10 rounded w-1/2" style={{ background: "var(--surface-3)" }} />
        <div className="h-[200px] rounded-xl" style={{ background: "var(--surface-2)" }} />
        <div className="h-12 rounded-xl" style={{ background: "var(--surface-2)" }} />
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-8 rounded-lg" style={{ background: "var(--surface-2)" }} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function Home() {
  const [data, setData]             = useState<DashboardData | null>(null);
  const [metrics, setMetrics]       = useState<MetricAsset[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [lastRefreshed, setLast]    = useState<Date | null>(null);
  const [marketOpen, setMarketOpen] = useState<"pre" | "open" | "closed">("closed");
  const [activeSector, setActiveSector] = useState<Sector>("technology");

  // US market status
  useEffect(() => {
    const update = () => {
      const et  = new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }));
      const h   = et.getHours() + et.getMinutes() / 60;
      const day = et.getDay();
      if (day === 0 || day === 6)  { setMarketOpen("closed"); return; }
      if (h >= 9.5  && h < 16)    { setMarketOpen("open");   return; }
      if (h >= 4    && h < 9.5)   { setMarketOpen("pre");    return; }
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
        funds:       funds?.funds   ?? [],
        indices:     funds?.indices ?? [],
        metrics:     mtrData?.metrics ?? [],
        news:        news ?? { market: [], sector: [], portfolio: [] },
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

  useEffect(() => {
    fetchAll(activeSector);
    const t = setInterval(() => fetchAll(activeSector), REFRESH_MS);
    return () => clearInterval(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchAll]);

  const handleSectorChange = useCallback(async (sector: Sector) => {
    setActiveSector(sector);
    try {
      const res = await fetch(`/api/news?sector=${sector}`);
      if (res.ok) {
        const news = await res.json();
        setData((prev) => prev ? { ...prev, news } : prev);
      }
    } catch { /* non-fatal */ }
  }, []);

  const sectorFunds: FundData[] = (data?.funds ?? []).filter(
    (fd) => fd.fund.sector === activeSector
  );
  const activeSectorConfig = SECTORS.find((s) => s.id === activeSector)!;

  const briefingReq: BriefingRequest | null = data
    ? { fundData: sectorFunds, indices: data.indices, metrics, news: data.news }
    : null;

  const statusDot  = marketOpen === "open" ? "var(--green)" : marketOpen === "pre" ? "var(--amber)" : "var(--border-2)";
  const statusText = marketOpen === "open" ? "Market open" : marketOpen === "pre" ? "Pre-market" : "Market closed";

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>

      {/* ── App header ──────────────────────────────────────── */}
      <header
        className="sticky top-0 z-50 flex items-center gap-4 px-5 py-3 border-b"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-black tracking-tight"
            style={{
              background: `linear-gradient(135deg, ${activeSectorConfig.color}, ${activeSectorConfig.color}aa)`,
              color: "#fff",
              transition: "background 0.4s",
            }}
          >
            FE
          </div>
          <div>
            <p className="text-sm font-bold tracking-tight leading-none" style={{ color: "var(--text-1)" }}>
              FE Sectors Dashboard
            </p>
            <p className="text-[10px] leading-none mt-0.5 truncate max-w-[200px]" style={{ color: "var(--text-3)" }}>
              {activeSectorConfig.description}
            </p>
          </div>
        </div>

        <div className="h-4 w-px mx-1" style={{ background: "var(--border-2)" }} />

        {/* Date */}
        <p className="text-[11px] hidden sm:block tabnum" style={{ color: "var(--text-3)" }}>
          {format(new Date(), "EEE d MMM yyyy")}
        </p>

        <div className="ml-auto flex items-center gap-3">
          {/* Market status */}
          <div className="hidden sm:flex items-center gap-1.5">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: statusDot,
                boxShadow: marketOpen === "open" ? `0 0 6px var(--green)` : "none",
              }}
            />
            <span className="text-[11px] font-medium" style={{ color: statusDot }}>{statusText}</span>
          </div>

          {lastRefreshed && (
            <span className="text-[11px] hidden lg:block tabnum" style={{ color: "var(--text-3)" }}>
              {format(lastRefreshed, "HH:mm:ss")}
            </span>
          )}

          <button
            onClick={() => fetchAll(activeSector)}
            disabled={loading}
            className="flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50 hover:border-[var(--border-2)]"
            style={{
              color: "var(--text-2)",
              borderColor: "var(--border)",
              background: "var(--surface-2)",
            }}
          >
            <span className={loading ? "animate-spin inline-block" : ""}>↺</span>
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>
      </header>

      {/* ── Ticker bar ──────────────────────────────────────── */}
      {data?.indices && <MarketBar indices={data.indices} />}

      {/* ── Sector tabs ─────────────────────────────────────── */}
      <SectorTabs activeSector={activeSector} onChange={handleSectorChange} />

      {/* ── Main content ────────────────────────────────────── */}
      <main className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-7 space-y-10">

        {/* Error */}
        {error && (
          <div
            className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm border"
            style={{ background: "rgba(239,68,68,0.07)", borderColor: "rgba(239,68,68,0.25)", color: "var(--red)" }}
          >
            ⚠ {error}
          </div>
        )}

        {/* ══════════════════════════════════════════════════
            LAYER 1 — WHAT'S DRIVING MARKETS
            Macro indices, asset classes, key rates.
            Context before anything sector-specific.
        ══════════════════════════════════════════════════ */}
        {(data || loading) && (
          <section>
            <SectionHeading
              label="What's Driving Markets"
              sub="S&P 500 · Nasdaq · FTSE · 10Y Yield · BTC · Gold · Oil · VIX — Day · MTD · YTD"
            />
            {loading && !data ? (
              <div className="h-48 rounded-2xl border animate-pulse" style={{ background: "var(--surface)", borderColor: "var(--border)" }} />
            ) : (
              <PerformanceMetrics metrics={metrics} />
            )}
          </section>
        )}

        {/* ══════════════════════════════════════════════════
            LAYER 2 — WHAT'S DRIVING THE SECTOR
            AI synthesis of sector-specific catalysts,
            news, and macro cross-currents.
        ══════════════════════════════════════════════════ */}
        {(data || loading) && (
          <section>
            <SectionHeading
              label={`What's Driving ${activeSectorConfig.name}`}
              sub={`Sector intelligence · Claude · ${activeSectorConfig.name} funds + news synthesis`}
            />
            {loading && !data ? (
              <div className="h-32 rounded-2xl border animate-pulse" style={{ background: "var(--surface)", borderColor: "var(--border)" }} />
            ) : (
              <>
                <AIBriefing data={briefingReq} />
                {data && (
                  <div className="mt-4">
                    <NewsSection news={data.news} sectorName={activeSectorConfig.name} />
                  </div>
                )}
              </>
            )}
          </section>
        )}

        {/* ══════════════════════════════════════════════════
            LAYER 3 — THE FUNDS
            Live fund prices, charts, holdings.
        ══════════════════════════════════════════════════ */}
        <section>
          <SectionHeading
            label={`${activeSectorConfig.name} Funds`}
            sub={`${sectorFunds.length} fund${sectorFunds.length !== 1 ? "s" : ""} · live NAV & holdings`}
          />

          {loading && !data ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : sectorFunds.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {sectorFunds.map((fd) => <FundCard key={fd.fund.id} data={fd} />)}
            </div>
          ) : !loading && (
            <div
              className="rounded-2xl border flex items-center justify-center py-20 text-sm"
              style={{ borderColor: "var(--border)", color: "var(--text-3)" }}
            >
              No funds configured for the {activeSectorConfig.name} sector
            </div>
          )}
        </section>

        {/* ── Full holdings detail (drill-down) ──────────── */}
        {data && sectorFunds.length > 0 && sectorFunds.some((f) => f.holdings.length > 0) && (
          <section>
            <SectionHeading
              label="Holdings Detail"
              sub="All positions · live prices · fund weights"
            />
            <HoldingsTable funds={sectorFunds} />
          </section>
        )}

        {/* Footer */}
        <footer
          className="pt-2 pb-6 flex flex-wrap items-center justify-between gap-2 text-[10px]"
          style={{ color: "var(--text-3)", borderTop: "1px solid var(--border)" }}
        >
          <span>Data · Yahoo Finance · BlackRock iShares · AI · Claude Sonnet</span>
          <span>Auto-refreshes every 15 min</span>
        </footer>
      </main>
    </div>
  );
}
