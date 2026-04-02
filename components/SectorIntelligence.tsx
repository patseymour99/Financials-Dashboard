"use client";

import { SubSectorPerf, NewsItem, BriefingRequest } from "@/lib/types";
import { AIBriefing } from "@/components/AIBriefing";
import { formatDistanceToNow, parseISO } from "date-fns";

// ── GICS Sub-Sector Performance ───────────────────────────────────────────

function SubSectorTable({
  subSectors,
  color,
}: {
  subSectors: SubSectorPerf[];
  color: string;
}) {
  const validRows = subSectors.filter((s) => s.price > 0);
  const maxAbs = Math.max(0.01, ...validRows.map((s) => Math.abs(s.changePercent)));

  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-3 border-b"
        style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}
      >
        <span
          className="text-[11px] font-semibold uppercase tracking-widest"
          style={{ color: "var(--text-3)" }}
        >
          GICS Sub-Sector Performance
        </span>
        <span className="text-[10px]" style={{ color: "var(--text-3)" }}>
          Day · ETF proxies
        </span>
      </div>

      <div className="divide-y" style={{ borderColor: "var(--border)" }}>
        {subSectors.map((s) => {
          const isUp    = s.changePercent >= 0;
          const hasData = s.price > 0;
          const barPct  = hasData
            ? Math.min(100, (Math.abs(s.changePercent) / maxAbs) * 100)
            : 0;

          return (
            <div
              key={s.ticker}
              className="flex items-center gap-4 px-5 py-3 group transition-colors"
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "")}
            >
              {/* Sub-sector name */}
              <div className="w-36 shrink-0">
                <p className="text-sm font-medium" style={{ color: "var(--text-1)" }}>
                  {s.name}
                </p>
                <p className="text-[10px] mt-0.5" style={{ color: "var(--text-3)" }}>
                  {s.ticker} · {s.etfLabel}
                </p>
              </div>

              {/* Bar */}
              <div className="flex-1 h-[4px] rounded-full" style={{ background: "var(--surface-3)" }}>
                {hasData && (
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${barPct}%`,
                      background: isUp ? "var(--green)" : "var(--red)",
                      opacity: 0.75,
                    }}
                  />
                )}
              </div>

              {/* Change % */}
              <div className="w-20 text-right shrink-0">
                {hasData ? (
                  <span
                    className="text-sm font-bold tabnum"
                    style={{ color: isUp ? "var(--green)" : "var(--red)" }}
                  >
                    {isUp ? "▲ +" : "▼ "}{s.changePercent.toFixed(2)}%
                  </span>
                ) : (
                  <span className="text-sm" style={{ color: "var(--text-3)" }}>—</span>
                )}
              </div>

              {/* Price */}
              <div className="w-16 text-right shrink-0 hidden lg:block">
                {hasData ? (
                  <span className="text-xs tabnum" style={{ color: "var(--text-2)" }}>
                    ${s.price.toFixed(2)}
                  </span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Key Events ────────────────────────────────────────────────────────────

function KeyEvents({
  items,
  sectorColor,
  sectorName,
}: {
  items: NewsItem[];
  sectorColor: string;
  sectorName: string;
}) {
  if (!items.length) return null;

  const top = items.slice(0, 4);

  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      <div
        className="flex items-center gap-2.5 px-5 py-3 border-b"
        style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}
      >
        <span className="w-1 h-4 rounded-full shrink-0" style={{ background: sectorColor }} />
        <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-3)" }}>
          Key Events · {sectorName}
        </span>
      </div>

      <div className="divide-y" style={{ borderColor: "var(--border)" }}>
        {top.map((item) => (
          <a
            key={item.uuid}
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex gap-3 px-5 py-3.5 group transition-colors"
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "")}
          >
            {/* Accent dot */}
            <span
              className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0"
              style={{ background: sectorColor, opacity: 0.6 }}
            />
            <div className="min-w-0">
              <p
                className="text-sm font-medium leading-snug line-clamp-2 group-hover:text-white transition-colors"
                style={{ color: "var(--text-1)" }}
              >
                {item.title}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[11px] font-medium" style={{ color: sectorColor }}>
                  {item.publisher}
                </span>
                <span style={{ color: "var(--border-2)" }}>·</span>
                <span className="text-[11px]" style={{ color: "var(--text-3)" }}>
                  {(() => {
                    try { return formatDistanceToNow(parseISO(item.publishedAt), { addSuffix: true }); }
                    catch { return "recently"; }
                  })()}
                </span>
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

// ── Compact news panel (sidebar) ──────────────────────────────────────────

function CompactNewsPanel({
  title,
  accentColor,
  items,
}: {
  title: string;
  accentColor: string;
  items: NewsItem[];
}) {
  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-4 py-2.5 border-b"
        style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}
      >
        <span className="w-1 h-3.5 rounded-full shrink-0" style={{ background: accentColor }} />
        <span
          className="text-[10px] font-semibold uppercase tracking-widest flex-1"
          style={{ color: "var(--text-2)" }}
        >
          {title}
        </span>
        <span
          className="text-[10px] tabnum px-1.5 py-0.5 rounded"
          style={{ color: "var(--text-3)", background: "var(--surface-3)" }}
        >
          {items.length}
        </span>
      </div>

      {/* Items — compact */}
      <div className="divide-y" style={{ borderColor: "var(--border)" }}>
        {items.length === 0 && (
          <p className="px-4 py-4 text-[11px] text-center" style={{ color: "var(--text-3)" }}>
            No stories available
          </p>
        )}
        {items.slice(0, 6).map((item) => (
          <a
            key={item.uuid}
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="block px-4 py-2.5 group transition-colors"
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "")}
          >
            <p
              className="text-[11px] font-medium leading-snug line-clamp-2 group-hover:text-white transition-colors"
              style={{ color: "var(--text-1)" }}
            >
              {item.title}
            </p>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-[10px]" style={{ color: accentColor }}>
                {item.publisher}
              </span>
              <span style={{ color: "var(--border-2)" }}>·</span>
              <span className="text-[10px]" style={{ color: "var(--text-3)" }}>
                {(() => {
                  try { return formatDistanceToNow(parseISO(item.publishedAt), { addSuffix: true }); }
                  catch { return "recently"; }
                })()}
              </span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────

interface Props {
  subSectors: SubSectorPerf[];
  news: { market: NewsItem[]; sector: NewsItem[]; portfolio: NewsItem[] };
  briefingData: BriefingRequest | null;
  sectorName: string;
  sectorColor: string;
}

export function SectorIntelligence({
  subSectors,
  news,
  briefingData,
  sectorName,
  sectorColor,
}: Props) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-5 items-start">

      {/* ── Left: GICS + events + AI briefing ───────────────── */}
      <div className="space-y-5 min-w-0">
        {/* GICS sub-sector performance */}
        {subSectors.length > 0 && (
          <SubSectorTable subSectors={subSectors} color={sectorColor} />
        )}

        {/* Key events from sector news */}
        <KeyEvents
          items={news.sector}
          sectorColor={sectorColor}
          sectorName={sectorName}
        />

        {/* AI Briefing */}
        <AIBriefing data={briefingData} />
      </div>

      {/* ── Right: stacked news sidebar ─────────────────────── */}
      <div className="space-y-4">
        <CompactNewsPanel
          title="Broad Market"
          accentColor="#3b82f6"
          items={news.market}
        />
        <CompactNewsPanel
          title={`${sectorName} Sector`}
          accentColor={sectorColor}
          items={news.sector}
        />
        <CompactNewsPanel
          title="Portfolio Companies"
          accentColor="#818cf8"
          items={news.portfolio}
        />
      </div>

    </div>
  );
}
