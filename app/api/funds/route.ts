import { NextResponse } from "next/server";
import { FUNDS, MARKET_INDICES } from "@/lib/constants";
import {
  FundConfig,
  FundQuote,
  HoldingQuote,
  MarketIndex,
  HistoricalPoint,
  FundData,
} from "@/lib/types";

// ── FMP (for holdings + indices only) ────────────────────────────────────

const FMP_BASE = "https://financialmodelingprep.com/api/v3";
const FMP_KEY = process.env.FMP_API_KEY;

interface FmpQuote {
  symbol: string;
  name: string;
  price: number;
  changesPercentage: number;
  change: number;
  dayLow: number;
  dayHigh: number;
  open: number;
  previousClose: number;
  volume: number;
  marketCap?: number;
  exchange?: string;
}

async function fmpBatchQuotes(
  tickers: string[]
): Promise<Map<string, FmpQuote>> {
  if (!tickers.length) return new Map();
  try {
    const res = await fetch(
      `${FMP_BASE}/quote/${tickers.join(",")}?apikey=${FMP_KEY}`,
      { next: { revalidate: 300 } }
    );
    if (!res.ok) throw new Error(`FMP ${res.status}`);
    const data: FmpQuote[] = await res.json();
    if (!Array.isArray(data)) return new Map();
    return new Map(data.map((q) => [q.symbol, q]));
  } catch (err) {
    console.error("FMP batch quotes error:", err);
    return new Map();
  }
}

// ── BlackRock product data (for both funds) ───────────────────────────────
//
// BlackRock's cache API serves performance chart data for all products at:
//   https://www.blackrock.com/cache/api/1/public/products/{id}/performanceChart.json
//
// This works for both US ETFs (BPAY, product 329128) and UCITS funds
// (BGF World Financials, product 229936). The response contains a time-series
// of daily NAV values which we use for both the current quote and history.

interface BlackRockSeries {
  name?: string;
  id?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any[];
}

interface BlackRockChartResponse {
  data?: {
    series?: BlackRockSeries[];
    currency?: string;
    fundName?: string;
  };
}

interface BlackRockProductData {
  quote: FundQuote | null;
  history: HistoricalPoint[];
}

async function fetchBlackRockProductData(
  fund: FundConfig
): Promise<BlackRockProductData> {
  const { blackrockProductId, blackrockRegion, name, ticker, currency } = fund;

  // The cache API endpoint is the same regardless of region; only the
  // Referer header differs (used by BlackRock for routing/analytics).
  const refererBase =
    blackrockRegion === "us"
      ? "https://www.blackrock.com/us/individual/products"
      : "https://www.blackrock.com/uk/individual/products";

  try {
    const url = `https://www.blackrock.com/cache/api/1/public/products/${blackrockProductId}/performanceChart.json`;
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "en-GB,en;q=0.9",
        Referer: `${refererBase}/${blackrockProductId}/`,
        Origin: "https://www.blackrock.com",
      },
      next: { revalidate: 3600 },
    });

    if (!res.ok) throw new Error(`BlackRock performanceChart ${res.status}`);

    const json: BlackRockChartResponse = await res.json();
    const series = json?.data?.series;
    if (!Array.isArray(series) || !series.length) {
      throw new Error("No series data in BlackRock response");
    }

    // Prefer the series whose name/id contains "nav", otherwise use first
    const navSeries =
      series.find(
        (s) =>
          s.name?.toLowerCase().includes("nav") ||
          s.id?.toLowerCase().includes("nav")
      ) ?? series[0];

    const raw: [number, number][] = navSeries?.data ?? [];
    if (!raw.length) throw new Error("Empty data series");

    // Build 90-day history (oldest → newest)
    const history: HistoricalPoint[] = raw.slice(-90).map(([ts, val]) => ({
      date: new Date(ts).toISOString().split("T")[0],
      close: typeof val === "number" ? val : 0,
    }));

    // Derive current + previous NAV for the quote
    const latest = raw[raw.length - 1];
    const prev = raw[raw.length - 2];
    const nav: number = latest?.[1] ?? 0;
    const prevNav: number = prev?.[1] ?? nav;
    const navChange = nav - prevNav;
    const navChangePct = prevNav ? (navChange / prevNav) * 100 : 0;
    const navDate = new Date(latest?.[0]).toISOString().split("T")[0];
    const responseCurrency: string =
      json?.data?.currency || currency || "USD";

    const quote: FundQuote = {
      ticker,
      name: json?.data?.fundName || name,
      price: nav,
      change: navChange,
      changePercent: navChangePct,
      previousClose: prevNav,
      open: prevNav,
      dayHigh: nav,
      dayLow: nav,
      volume: 0,
      currency: responseCurrency,
      exchange:
        fund.isin
          ? `NAV · ${navDate}`
          : `NYSE Arca · NAV ${navDate}`,
      navDate,
    };

    return { quote, history };
  } catch (err) {
    console.error(`BlackRock data error for ${name}:`, err);
    return { quote: null, history: [] };
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────

function fmpToHolding(
  ticker: string,
  name: string,
  weight: number | undefined,
  quotes: Map<string, FmpQuote>
): HoldingQuote {
  const q = quotes.get(ticker);
  if (!q) {
    return {
      ticker,
      name,
      price: 0,
      change: 0,
      changePercent: 0,
      previousClose: 0,
      open: 0,
      dayHigh: 0,
      dayLow: 0,
      volume: 0,
      currency: "USD",
      fundWeight: weight,
      error: "Data unavailable",
    };
  }
  return {
    ticker,
    name: q.name || name,
    price: q.price,
    change: q.change,
    changePercent: q.changesPercentage,
    previousClose: q.previousClose,
    open: q.open,
    dayHigh: q.dayHigh,
    dayLow: q.dayLow,
    volume: q.volume,
    currency: "USD",
    fundWeight: weight,
  };
}

// ── Route handler ─────────────────────────────────────────────────────────

export async function GET() {
  try {
    const holdingTickers = [
      ...new Set(FUNDS.flatMap((f) => f.holdings.map((h) => h.ticker))),
    ];
    const indexTickers = MARKET_INDICES.map((i) => i.ticker);

    // Fire all requests in parallel
    const [quotesResult, ...fundResults] = await Promise.allSettled([
      // One FMP batch call covers all holdings + all indices
      fmpBatchQuotes([...holdingTickers, ...indexTickers]),
      // One BlackRock call per fund
      ...FUNDS.map((f) => fetchBlackRockProductData(f)),
    ]);

    const fmpQuotes: Map<string, FmpQuote> =
      quotesResult.status === "fulfilled" ? quotesResult.value : new Map();

    // Build fund data
    const fundsData: FundData[] = FUNDS.map((fund, i) => {
      const result =
        fundResults[i].status === "fulfilled"
          ? (fundResults[i] as PromiseFulfilledResult<BlackRockProductData>)
              .value
          : ({ quote: null, history: [] } as BlackRockProductData);

      const holdings: HoldingQuote[] = fund.holdings.map((h) =>
        fmpToHolding(h.ticker, h.name, h.weight, fmpQuotes)
      );

      return {
        fund,
        quote: result.quote,
        history: result.history,
        holdings,
      };
    });

    // Build indices from the same FMP batch
    const indices: MarketIndex[] = MARKET_INDICES.map((idx) => {
      const q = fmpQuotes.get(idx.ticker);
      return {
        ticker: idx.ticker,
        name: idx.name,
        price: q?.price ?? 0,
        change: q?.change ?? 0,
        changePercent: q?.changesPercentage ?? 0,
        currency: "USD",
      };
    });

    return NextResponse.json({
      funds: fundsData,
      indices,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Fund data fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch fund data" },
      { status: 500 }
    );
  }
}
