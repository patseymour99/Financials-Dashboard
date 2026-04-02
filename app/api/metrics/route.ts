import { NextResponse } from "next/server";
import { fetchQuotes, fetchHistory, YFHistoricalPoint } from "@/lib/yahoo";
import { MetricAsset, SubSectorPerf, Sector } from "@/lib/types";
import { SECTORS } from "@/lib/constants";

// Assets shown in the performance table.
// Yahoo Finance tickers: forex = "XXX=X", BTC = "BTC-USD", futures = "XX=F"
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

    // Single batch quote call for everything + YTD history only for main metrics
    const [quotesResult, ...histResults] = await Promise.allSettled([
      fetchQuotes(allTickers),
      ...metricTickers.map((t) => fetchHistory(t, "ytd")),
    ]);

    const quotes =
      quotesResult.status === "fulfilled" ? quotesResult.value : new Map();

    // ── Main metric assets (with MTD/YTD from history) ──────────────────
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

    // ── GICS sub-sector performance (Day % only — no history needed) ────
    const subSectors: Partial<Record<Sector, SubSectorPerf[]>> = {};
    for (const sector of SECTORS) {
      subSectors[sector.id] = sector.subSectors.map((ss) => {
        const q = quotes.get(ss.ticker);
        return {
          name:          ss.name,
          ticker:        ss.ticker,
          etfLabel:      ss.etfLabel,
          price:         q?.regularMarketPrice         ?? 0,
          change:        q?.regularMarketChange        ?? 0,
          changePercent: q?.regularMarketChangePercent ?? 0,
        };
      });
    }

    return NextResponse.json({ metrics, subSectors, lastUpdated: new Date().toISOString() });
  } catch (err) {
    console.error("Metrics fetch error:", err);
    return NextResponse.json({ error: "Failed to fetch metrics" }, { status: 500 });
  }
}
