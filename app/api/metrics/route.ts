import { NextResponse } from "next/server";
import { fetchQuotes, fetchHistory, fetchGICSIndustries, YFHistoricalPoint } from "@/lib/yahoo";
import { MetricAsset, SubSectorPerf, Sector } from "@/lib/types";
import { SECTORS } from "@/lib/constants";

const METRIC_CONFIGS = [
  { id: "acwi",  ticker: "ACWI",     name: "MSCI ACWI",   label: "iShares MSCI ACWI ETF",      currency: "USD" },
  { id: "spy",   ticker: "SPY",      name: "S&P 500",      label: "SPDR S&P 500 ETF",           currency: "USD" },
  { id: "qqq",   ticker: "QQQ",      name: "Nasdaq 100",   label: "Invesco QQQ",                currency: "USD" },
  { id: "tnx",   ticker: "^TNX",     name: "10Y Yield",    label: "US 10-Year Treasury",        currency: "USD", isYield: true },
  { id: "btc",   ticker: "BTC-USD",  name: "Bitcoin",      label: "BTC / USD",                  currency: "USD", isCrypto: true },
  { id: "gold",  ticker: "GLD",      name: "Gold",         label: "SPDR Gold Shares",           currency: "USD" },
  { id: "oil",   ticker: "CL=F",     name: "WTI Crude",    label: "WTI Crude Futures",          currency: "USD" },
  { id: "dxy",   ticker: "DX-Y.NYB", name: "US Dollar",    label: "ICE US Dollar Index",        currency: "USD" },
];

// Top-5 industries to surface per sector when using GICS data.
// These match GICS classifications used by Yahoo Finance's sectors API.
const GICS_INDUSTRY_FILTER: Record<Sector, string[]> = {
  technology: [
    "Semiconductors",
    "Software—Application",
    "Software—Infrastructure",
    "Information Technology Services",
    "Computer Hardware",
    "Electronic Components",
    "Communication Equipment",
    "Internet Content & Information",
  ],
  healthcare: [
    "Biotechnology",
    "Drug Manufacturers—General",
    "Drug Manufacturers—Specialty & Generic",
    "Medical Devices",
    "Healthcare Plans",
    "Medical Instruments & Supplies",
    "Diagnostics & Research",
    "Health Information Services",
  ],
  financials: [
    "Banks—Diversified",
    "Banks—Regional",
    "Capital Markets",
    "Credit Services",
    "Insurance—Diversified",
    "Insurance—Life",
    "Insurance—Property & Casualty",
    "Financial Data & Stock Exchanges",
  ],
};

function firstPriceAtOrAfter(
  history: YFHistoricalPoint[],
  targetDate: string
): number | null {
  const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date));
  return sorted.find((d) => d.date >= targetDate)?.close ?? null;
}

function pctChange(from: number | null, to: number): number | null {
  if (!from) return null;
  return ((to - from) / from) * 100;
}

export async function GET() {
  try {
    const now      = new Date();
    const ytdStart = `${now.getFullYear()}-01-01`;
    const mtdStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

    const metricTickers    = METRIC_CONFIGS.map((c) => c.ticker);
    const subSectorTickers = SECTORS.flatMap((s) => s.subSectors.map((ss) => ss.ticker));
    const allTickers       = [...new Set([...metricTickers, ...subSectorTickers])];

    // Fetch quotes + YTD history + GICS data in parallel
    const [quotesResult, ...histResults] = await Promise.allSettled([
      fetchQuotes(allTickers),
      ...metricTickers.map((t) => fetchHistory(t, "ytd")),
    ]);

    // GICS industry data per sector (all three in parallel)
    const gicsResults = await Promise.allSettled(
      SECTORS.map((s) => fetchGICSIndustries(s.id))
    );

    const quotes =
      quotesResult.status === "fulfilled" ? quotesResult.value : new Map();

    // ── Main metric assets ──────────────────────────────────────────────────
    const metrics: MetricAsset[] = METRIC_CONFIGS.map((cfg, i) => {
      const q       = quotes.get(cfg.ticker);
      const history = histResults[i]?.status === "fulfilled"
        ? (histResults[i] as PromiseFulfilledResult<YFHistoricalPoint[]>).value
        : [];

      const price         = q?.regularMarketPrice ?? 0;
      const changePercent = q?.regularMarketChangePercent ?? 0;
      const change        = q?.regularMarketChange ?? 0;

      return {
        id:            cfg.id,
        ticker:        cfg.ticker,
        name:          cfg.name,
        label:         cfg.label,
        price,
        change,
        changePercent,
        mtdReturn:     pctChange(firstPriceAtOrAfter(history, mtdStart), price),
        ytdReturn:     pctChange(firstPriceAtOrAfter(history, ytdStart), price),
        currency:      cfg.currency,
        isYield:       cfg.isYield,
        isCrypto:      cfg.isCrypto,
      };
    });

    // ── GICS sub-sector performance ─────────────────────────────────────────
    const subSectors: Partial<Record<Sector, SubSectorPerf[]>> = {};

    for (let idx = 0; idx < SECTORS.length; idx++) {
      const sector    = SECTORS[idx];
      const gicsData  = gicsResults[idx]?.status === "fulfilled"
        ? (gicsResults[idx] as PromiseFulfilledResult<{ name: string; changePercent: number }[]>).value
        : [];

      const preferredNames = GICS_INDUSTRY_FILTER[sector.id] ?? [];

      if (gicsData.length > 0) {
        // Sort so that preferred industries appear first, then any extras
        const sorted = [
          ...preferredNames
            .map((pref) => gicsData.find((g) => g.name === pref))
            .filter((g): g is { name: string; changePercent: number } => g !== undefined),
          ...gicsData.filter((g) => !preferredNames.includes(g.name)),
        ];

        subSectors[sector.id] = sorted.slice(0, 5).map((g) => ({
          name:          g.name,
          changePercent: g.changePercent,
          source:        "gics" as const,
        }));
      } else {
        // Fallback: ETF proxy quotes
        subSectors[sector.id] = sector.subSectors.map((ss) => {
          const q = quotes.get(ss.ticker);
          return {
            name:          ss.name,
            ticker:        ss.ticker,
            etfLabel:      ss.etfLabel,
            price:         q?.regularMarketPrice         ?? 0,
            change:        q?.regularMarketChange        ?? 0,
            changePercent: q?.regularMarketChangePercent ?? 0,
            source:        "etf" as const,
          };
        });
      }
    }

    return NextResponse.json({ metrics, subSectors, lastUpdated: new Date().toISOString() });
  } catch (err) {
    console.error("Metrics fetch error:", err);
    return NextResponse.json({ error: "Failed to fetch metrics" }, { status: 500 });
  }
}
