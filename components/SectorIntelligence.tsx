"use client";

import { SubSectorPerf, NewsItem, BriefingRequest } from "@/lib/types";
import { AIBriefing } from "@/components/AIBriefing";
import { formatDistanceToNow, parseISO } from "date-fns";

// ── GICS Sub-Sector Performance ───────────────────────────────────────────

function SubSectorTable({ subSectors }: { subSectors: SubSectorPerf[] }) {
  const isGICS   = subSectors.some((s) => s.source === "gics");
  const validRows = subSectors.filter((s) =>
    s.source === "gics" ? true : (s.price ?? 0) > 0
  );
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
          {isGICS ? "Day · GICS Industries" : "Day · ETF Proxies"}
        </span>
      </div>

      <div className="divide-y" style={{ borderColor: "var(--border)" }}>
        {subSectors.map((s, i) => {
          const hasData = s.source === "gics" ? true : (s.price ?? 0) > 0;
          const isUp    = s.changePercent >= 0;
          const barPct  = hasData
            ? Math.min(100, (Math.abs(s.changePercent) / maxAbs) * 100)
            : 0;

          return (
            <div
              key={`${s.name}-${i}`}
              className="flex items-center gap-4 px-5 py-3 transition-colors"
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "")}
            >
              {/* Name column */}
              <div className="w-44 shrink-0">
                <p className="text-sm font-medium leading-tight" style={{ color: "var(--text-1)" }}>
                  {s.name}
                </p>
                {s.source === "etf" && s.ticker && (
                  <p className="text-[10px] mt-0.5" style={{ color: "var(--text-3)" }}>
                    {s.ticker} · {s.etfLabel}
                  </p>
                )}
              </div>

              {/* Bar */}
              <div className="flex-1 h-[4px] rounded-full" style={{ background: "var(--surface-3)" }}>
                {hasData && (
                  <div
                    className="h-full rounded-full"
                    style={{
                      width:      `${barPct}%`,
                      background: isUp ? "var(--green)" : "var(--red)",
                      opacity:    0.75,
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

              {/* Price (ETF only) */}
              {s.source === "etf" && (
                <div className="w-16 text-right shrink-0 hidden lg:block">
                  {(s.price ?? 0) > 0 ? (
                    <span className="text-xs tabnum" style={{ color: "var(--text-2)" }}>
                      ${(s.price ?? 0).toFixed(2)}
                    </span>
                  ) : null}
                </div>
              )}
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
        <span
          className="text-[11px] font-semibold uppercase tracking-widest"
          style={{ color: "var(--text-3)" }}
        >
          Key Events · {sectorName}
        </span>
      </div>

      <div className="divide-y" style={{ borderColor: "var(--border)" }}>
        {items.slice(0, 4).map((item) => (
          <a
            key={item.uuid}
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex gap-3 px-5 py-3.5 group transition-colors"
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "")}
          >
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
                    try {
                      return formatDistanceToNow(parseISO(item.publishedAt), { addSuffix: true });
                    } catch {
                      return "recently";
                    }
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

// ── Main component ────────────────────────────────────────────────────────

interface Props {
  subSectors: SubSectorPerf[];
  sectorNews: NewsItem[];
  briefingData: BriefingRequest | null;
  sectorName: string;
  sectorColor: string;
}

export function SectorIntelligence({
  subSectors,
  sectorNews,
  briefingData,
  sectorName,
  sectorColor,
}: Props) {
  return (
    <div className="space-y-5">
      {subSectors.length > 0 && (
        <SubSectorTable subSectors={subSectors} />
      )}
      <KeyEvents items={sectorNews} sectorColor={sectorColor} sectorName={sectorName} />
      <AIBriefing data={briefingData} />
    </div>
  );
}
