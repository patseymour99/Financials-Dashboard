import { NextResponse } from "next/server";
import { MetricAsset } from "@/lib/types";

const FMP_BASE = "https://financialmodelingprep.com/api/v3";
const FMP_KEY = process.env.FMP_API_KEY;

// Assets tracked in the performance table.
// We use ETF proxies where direct index tickers aren't available on FMP free tier.
const METRIC_CONFIGS = [
  { id: "acwi",  ticker: "ACWI",   name: "MSCI ACWI",    label: "iShares MSCI ACWI ETF", currency: "USD" },
  { id: "spy",   ticker: "SPY",    name: "S&P 500",       label: "SPDR S&P 500 ETF",      currency: "USD" },
  { id: "qqq",   ticker: "QQQ",    name: "Nasdaq 100",    label: "Invesco QQQ",            currency: "USD" },
  { id: "tlt",   ticker: "^TNX",   name: "10Y Yield",     label: "US 10-Year Treasury",    currency: "USD", isYield: true },
  { id: "btc",   ticker: "BTCUSD", name: "Bitcoin",       label: "BTC / USD",              currency: "USD", isCrypto: true },
  { id: "gold",  ticker: "GLD",    name: "Gold",          label: "SPDR Gold Shares",       currency: "USD" },
  { id: "oil",   ticker: "WTIUSD", name: "WTI Crude",     label: "WTI Oil / USD",          currency: "USD" },
  { id: "dxy",   ticker: "UUP",    name: "US Dollar",     label: "Invesco DB USD Index",   currency: "USD" },
];

interface FmpQuote {
  symbol: string;
  price: number;
  changesPercentage: number;
  change: number;
  previousClose: number;
}

interface FmpHistoricalResponse {
  symbol?: string;
  historical?: { date: string; close: number }[];
}

interface FmpBatchHistoricalResponse {
  historicalStockList?: FmpHistoricalResponse[];
}

/** Returns the first trading day price on or after a given date from a sorted (desc) history array */
function priceAtOrAfter(history: { date: string; close: number }[], targetDate: string): number | null {
  // history is newest-first; we want the last entry that is >= targetDate
  const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date)); // asc
  const entry = sorted.find((d) => d.date >= targetDate);
  return entry?.close ?? null;
}

function calcPctChange(from: number | null, to: number): number | null {
  if (from === null || from === 0) return null;
  return ((to - from) / from) * 100;
}

export async function GET() {
  try {
    const now = new Date();
    const ytdStart = `${now.getFullYear()}-01-01`;
    const mtdStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

    const tickers = METRIC_CONFIGS.map((c) => c.ticker);
    // Separate ^TNX since it's an index and may need different handling
    const quoteTickers = tickers.join(",");
    const historyTickers = METRIC_CONFIGS
      .filter((c) => !c.isYield) // TNX history handled separately
      .map((c) => c.ticker)
      .join(",");

    const [quotesRes, historyRes, tnxHistoryRes] = await Promise.allSettled([
      // Batch quote — one call
      fetch(`${FMP_BASE}/quote/${quoteTickers}?apikey=${FMP_KEY}`, {
        next: { revalidate: 300 },
      }),
      // Batch history for YTD/MTD — one call
      fetch(
        `${FMP_BASE}/historical-price-full?symbols=${historyTickers}&from=${ytdStart}&apikey=${FMP_KEY}`,
        { next: { revalidate: 3600 } }
      ),
      // TNX history separately
      fetch(
        `${FMP_BASE}/historical-price-full/%5ETNX?from=${ytdStart}&apikey=${FMP_KEY}`,
        { next: { revalidate: 3600 } }
      ),
    ]);

    // Parse quotes
    const quotesMap = new Map<string, FmpQuote>();
    if (quotesRes.status === "fulfilled" && quotesRes.value.ok) {
      const data: FmpQuote[] = await quotesRes.value.json();
      if (Array.isArray(data)) data.forEach((q) => quotesMap.set(q.symbol, q));
    }

    // Parse batch history
    const historyMap = new Map<string, { date: string; close: number }[]>();
    if (historyRes.status === "fulfilled" && historyRes.value.ok) {
      const data: FmpBatchHistoricalResponse | FmpHistoricalResponse = await historyRes.value.json();
      // Batch endpoint returns { historicalStockList: [...] }
      // Single ticker returns { symbol, historical: [...] }
      if ("historicalStockList" in data && Array.isArray(data.historicalStockList)) {
        data.historicalStockList.forEach((item) => {
          if (item.symbol && item.historical) {
            historyMap.set(item.symbol, item.historical);
          }
        });
      } else if ("historical" in data && (data as FmpHistoricalResponse).symbol) {
        const single = data as FmpHistoricalResponse;
        if (single.symbol && single.historical) {
          historyMap.set(single.symbol, single.historical);
        }
      }
    }

    // Parse TNX history
    if (tnxHistoryRes.status === "fulfilled" && tnxHistoryRes.value.ok) {
      const data: FmpHistoricalResponse = await tnxHistoryRes.value.json();
      if (data.historical) historyMap.set("^TNX", data.historical);
    }

    const metrics: MetricAsset[] = METRIC_CONFIGS.map((cfg) => {
      const q = quotesMap.get(cfg.ticker);
      const history = historyMap.get(cfg.ticker) ?? [];
      const price = q?.price ?? 0;

      const ytdPrice = priceAtOrAfter(history, ytdStart);
      const mtdPrice = priceAtOrAfter(history, mtdStart);

      return {
        id: cfg.id,
        ticker: cfg.ticker,
        name: cfg.name,
        label: cfg.label,
        price,
        change: q?.change ?? 0,
        changePercent: q?.changesPercentage ?? 0,
        mtdReturn: calcPctChange(mtdPrice, price),
        ytdReturn: calcPctChange(ytdPrice, price),
        currency: cfg.currency,
        isYield: cfg.isYield,
        isCrypto: cfg.isCrypto,
      };
    });

    return NextResponse.json({ metrics, lastUpdated: new Date().toISOString() });
  } catch (err) {
    console.error("Metrics fetch error:", err);
    return NextResponse.json({ error: "Failed to fetch metrics" }, { status: 500 });
  }
}
