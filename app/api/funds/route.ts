import { NextResponse } from "next/server";
import { FUNDS, MARKET_INDICES } from "@/lib/constants";
import {
  FundQuote,
  HoldingQuote,
  MarketIndex,
  HistoricalPoint,
  FundData,
} from "@/lib/types";

const FMP_BASE = "https://financialmodelingprep.com/api/v3";
const API_KEY = process.env.FMP_API_KEY;

// ── FMP response shapes ──────────────────────────────────────────────────

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

interface FmpHistoricalDay {
  date: string;
  close: number;
}

// ── FMP fetchers ─────────────────────────────────────────────────────────

async function fmpBatchQuotes(
  tickers: string[]
): Promise<Map<string, FmpQuote>> {
  if (!tickers.length) return new Map();
  try {
    const res = await fetch(
      `${FMP_BASE}/quote/${tickers.join(",")}?apikey=${API_KEY}`,
      { next: { revalidate: 300 } }
    );
    if (!res.ok) throw new Error(`FMP ${res.status}`);
    const data: FmpQuote[] = await res.json();
    return new Map(data.map((q) => [q.symbol, q]));
  } catch (err) {
    console.error("FMP batch quotes error:", err);
    return new Map();
  }
}

async function fmpHistory(ticker: string): Promise<HistoricalPoint[]> {
  try {
    const res = await fetch(
      `${FMP_BASE}/historical-price-full/${ticker}?timeseries=90&apikey=${API_KEY}`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return [];
    const data: { historical?: FmpHistoricalDay[] } = await res.json();
    return (data.historical || [])
      .slice()
      .reverse()
      .map((d) => ({ date: d.date, close: d.close }));
  } catch {
    return [];
  }
}

// ── BlackRock NAV for UCITS funds ────────────────────────────────────────
// BlackRock exposes fund data via their product performance API.
// We try two endpoints; both are used by the public BlackRock website.

interface BlackRockNav {
  navDate: string;
  nav: number;
  navChange: number;
  navChangePercent: number;
  currency: string;
  fundName: string;
}

async function fetchBlackRockProductNav(
  productUrl: string
): Promise<BlackRockNav | null> {
  try {
    const res = await fetch(
      `https://www.blackrock.com/cache/api/1/public/products/${productUrl}/performanceChart.json`,
      {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; dashboard/1.0)" },
        next: { revalidate: 3600 },
      }
    );
    if (!res.ok) return null;
    const json = await res.json();
    const series = json?.data?.series?.[0]?.data;
    if (!series?.length) return null;
    const latest = series[series.length - 1];
    const prev = series[series.length - 2];
    const nav: number = latest?.[1] ?? 0;
    const prevNav: number = prev?.[1] ?? nav;
    return {
      navDate: new Date(latest?.[0]).toISOString().split("T")[0],
      nav,
      navChange: nav - prevNav,
      navChangePercent: prevNav ? ((nav - prevNav) / prevNav) * 100 : 0,
      currency: "USD",
      fundName: "",
    };
  } catch {
    return null;
  }
}

async function fetchBlackRockNavByIsin(
  isin: string
): Promise<BlackRockNav | null> {
  try {
    const res = await fetch(
      `https://www.blackrock.com/uk/individual/products/fund-finder?isin=${isin}&siteEntryPassthrough=true&pk=1&dataType=fund&format=json`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; dashboard/1.0)",
          Accept: "application/json",
        },
        next: { revalidate: 3600 },
      }
    );
    if (!res.ok) return null;
    const json = await res.json();
    const fund = json?.data?.tableData?.data?.[0];
    if (!fund) return null;
    return {
      navDate: fund.navDate || "",
      nav: parseFloat(fund.nav) || 0,
      navChange: parseFloat(fund.navChange) || 0,
      navChangePercent: parseFloat(fund.navChangePercent) || 0,
      currency: fund.currency || "USD",
      fundName: fund.fundName || "",
    };
  } catch {
    return null;
  }
}

async function getBlackRockNav(fund: {
  isin?: string;
  blackrockProductUrl?: string;
  name: string;
}): Promise<BlackRockNav | null> {
  if (fund.blackrockProductUrl) {
    const nav = await fetchBlackRockProductNav(fund.blackrockProductUrl);
    if (nav) return nav;
  }
  if (fund.isin) {
    return fetchBlackRockNavByIsin(fund.isin);
  }
  return null;
}

function navToFundQuote(
  ticker: string,
  fundName: string,
  nav: BlackRockNav | null
): FundQuote | null {
  if (!nav || nav.nav === 0) return null;
  return {
    ticker,
    name: nav.fundName || fundName,
    price: nav.nav,
    change: nav.navChange,
    changePercent: nav.navChangePercent,
    previousClose: nav.nav - nav.navChange,
    open: nav.nav - nav.navChange,
    dayHigh: nav.nav,
    dayLow: nav.nav,
    volume: 0,
    currency: nav.currency,
    exchange: `NAV — ${nav.navDate}`,
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────

function fmpToFundQuote(
  ticker: string,
  name: string,
  quotes: Map<string, FmpQuote>
): FundQuote | null {
  const q = quotes.get(ticker);
  if (!q) return null;
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
    marketCap: q.marketCap,
    currency: "USD",
    exchange: q.exchange,
  };
}

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
    const ucitsFunds = FUNDS.filter((f) => f.isin);
    const tradedFunds = FUNDS.filter((f) => !f.isin);

    const holdingTickers = [
      ...new Set(FUNDS.flatMap((f) => f.holdings.map((h) => h.ticker))),
    ];

    const allTradedTickers = [
      ...tradedFunds.map((f) => f.ticker),
      ...MARKET_INDICES.map((i) => i.ticker),
      ...holdingTickers,
    ];

    // Fire everything in parallel: one batch FMP call + historical + UCITS NAVs
    const [quotesResult, ...parallelResults] = await Promise.allSettled([
      fmpBatchQuotes(allTradedTickers),
      ...tradedFunds.map((f) => fmpHistory(f.ticker)),
      ...ucitsFunds.map((f) => getBlackRockNav(f)),
    ]);

    const quotes: Map<string, FmpQuote> =
      quotesResult.status === "fulfilled" ? quotesResult.value : new Map();

    const tradedHistories = parallelResults
      .slice(0, tradedFunds.length)
      .map((r) =>
        r.status === "fulfilled" ? (r.value as HistoricalPoint[]) : []
      );

    const ucitsNavs = parallelResults
      .slice(tradedFunds.length)
      .map((r) =>
        r.status === "fulfilled" ? (r.value as BlackRockNav | null) : null
      );

    // Build fund data
    const fundsData: FundData[] = FUNDS.map((fund) => {
      const tradedIdx = tradedFunds.findIndex((f) => f.id === fund.id);
      const ucitsIdx = ucitsFunds.findIndex((f) => f.id === fund.id);

      const quote =
        tradedIdx !== -1
          ? fmpToFundQuote(fund.ticker, fund.name, quotes)
          : navToFundQuote(fund.ticker, fund.name, ucitsNavs[ucitsIdx] ?? null);

      const history = tradedIdx !== -1 ? tradedHistories[tradedIdx] : [];

      const holdings = fund.holdings.map((h) =>
        fmpToHolding(h.ticker, h.name, h.weight, quotes)
      );

      return { fund, quote, history, holdings };
    });

    // Build indices
    const indices: MarketIndex[] = MARKET_INDICES.map((idx) => {
      const q = quotes.get(idx.ticker);
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
