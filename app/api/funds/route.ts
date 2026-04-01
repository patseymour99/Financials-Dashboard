import { NextResponse } from "next/server";
import { fetchQuotes, fetchHistory, YFHistoricalPoint, YFQuote } from "@/lib/yahoo";
import { FUNDS, MARKET_INDICES } from "@/lib/constants";
import {
  FundConfig,
  FundQuote,
  HoldingQuote,
  MarketIndex,
  HistoricalPoint,
  FundData,
} from "@/lib/types";

// ── BlackRock NAV ─────────────────────────────────────────────────────────

interface FundResult {
  quote: FundQuote | null;
  history: HistoricalPoint[];
}

async function fetchBlackRockProductData(fund: FundConfig): Promise<FundResult> {
  const { blackrockProductId, blackrockRegion, name, ticker, currency } = fund;
  if (!blackrockProductId) return { quote: null, history: [] };

  const refererBase =
    blackrockRegion === "us"
      ? "https://www.blackrock.com/us/individual/products"
      : "https://www.blackrock.com/uk/individual/products";

  try {
    const url = `https://www.blackrock.com/cache/api/1/public/products/${blackrockProductId}/performanceChart.json`;
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
          "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "en-GB,en;q=0.9",
        Referer: `${refererBase}/${blackrockProductId}/`,
        Origin: "https://www.blackrock.com",
      },
      next: { revalidate: 3600 },
    });
    if (!res.ok) throw new Error(`BlackRock performanceChart ${res.status}`);

    const json = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const series: any[] = json?.data?.series ?? [];
    if (!series.length) throw new Error("No series in BlackRock response");

    const navSeries =
      series.find(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (s: any) =>
          s.name?.toLowerCase().includes("nav") ||
          s.id?.toLowerCase().includes("nav")
      ) ?? series[0];

    const raw: [number, number][] = navSeries?.data ?? [];
    if (!raw.length) throw new Error("Empty data series");

    const history: HistoricalPoint[] = raw.slice(-90).map(([ts, val]) => ({
      date: new Date(ts).toISOString().split("T")[0],
      close: typeof val === "number" ? val : 0,
    }));

    const latest  = raw[raw.length - 1];
    const prev    = raw[raw.length - 2];
    const nav     = latest?.[1] ?? 0;
    const prevNav = prev?.[1] ?? nav;
    const navDate = new Date(latest?.[0]).toISOString().split("T")[0];

    return {
      quote: {
        ticker,
        name: json?.data?.fundName || name,
        price: nav,
        change: nav - prevNav,
        changePercent: prevNav ? ((nav - prevNav) / prevNav) * 100 : 0,
        previousClose: prevNav,
        open: prevNav,
        dayHigh: nav,
        dayLow: nav,
        volume: 0,
        currency: json?.data?.currency || currency || "USD",
        exchange: fund.isin ? `NAV · ${navDate}` : `NYSE Arca · NAV ${navDate}`,
        navDate,
      },
      history,
    };
  } catch (err) {
    console.error(`BlackRock data error for ${name}:`, err);
    return { quote: null, history: [] };
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────

function firstPriceAtOrAfter(
  history: YFHistoricalPoint[],
  targetDate: string
): number | null {
  const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date));
  return sorted.find((d) => d.date >= targetDate)?.close ?? null;
}

function pctChange(from: number | null, to: number): number | null {
  if (!from || from === 0) return null;
  return ((to - from) / from) * 100;
}

// ── Yahoo-sourced fund (all funds are now Yahoo-sourced) ──────────────────

async function fetchYahooFundData(
  fund: FundConfig,
  quotes: Map<string, YFQuote>
): Promise<FundResult> {
  const q = quotes.get(fund.ticker);
  if (!q || !q.regularMarketPrice) {
    return { quote: null, history: [] };
  }

  // Fetch full YTD history — used for both the chart and MTD/YTD calculations
  let ytdHistory: YFHistoricalPoint[] = [];
  try {
    ytdHistory = await fetchHistory(fund.ticker, "ytd");
  } catch {
    // non-fatal — performance metrics will be unavailable
  }

  // Last 90 trading days for the chart
  const history: HistoricalPoint[] = ytdHistory
    .slice(-90)
    .map((p) => ({ date: p.date, close: p.close }));

  const now     = new Date();
  const ytdStart = `${now.getFullYear()}-01-01`;
  const mtdStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

  const price = q.regularMarketPrice;
  const prev  = q.regularMarketPreviousClose ?? price;
  const lastNavDate = ytdHistory.length
    ? ytdHistory[ytdHistory.length - 1].date
    : undefined;

  return {
    quote: {
      ticker: fund.ticker,
      name: q.longName || q.shortName || fund.name,
      price,
      change: q.regularMarketChange ?? 0,
      changePercent: q.regularMarketChangePercent ?? 0,
      previousClose: prev,
      open: q.regularMarketOpen ?? price,
      dayHigh: q.regularMarketDayHigh ?? price,
      dayLow: q.regularMarketDayLow ?? price,
      volume: q.regularMarketVolume ?? 0,
      currency: q.currency ?? fund.currency,
      exchange: q.fullExchangeName ?? (fund.isin ? "UCITS" : "NYSE Arca"),
      navDate: lastNavDate,
      mtdReturn: pctChange(firstPriceAtOrAfter(ytdHistory, mtdStart), price) ?? undefined,
      ytdReturn: pctChange(firstPriceAtOrAfter(ytdHistory, ytdStart), price) ?? undefined,
    },
    history,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────

function yfToHolding(
  ticker: string,
  name: string,
  weight: number | undefined,
  quotes: Map<string, YFQuote>
): HoldingQuote {
  const q = quotes.get(ticker);
  if (!q || !q.regularMarketPrice) {
    return {
      ticker, name, price: 0, change: 0, changePercent: 0,
      previousClose: 0, open: 0, dayHigh: 0, dayLow: 0,
      volume: 0, currency: "USD", fundWeight: weight,
      error: "Data unavailable",
    };
  }
  return {
    ticker,
    name: q.longName || q.shortName || name,
    price: q.regularMarketPrice,
    change: q.regularMarketChange ?? 0,
    changePercent: q.regularMarketChangePercent ?? 0,
    previousClose: q.regularMarketPreviousClose ?? 0,
    open: q.regularMarketOpen ?? 0,
    dayHigh: q.regularMarketDayHigh ?? 0,
    dayLow: q.regularMarketDayLow ?? 0,
    volume: q.regularMarketVolume ?? 0,
    marketCap: q.marketCap,
    currency: q.currency ?? "USD",
    exchange: q.fullExchangeName,
    fundWeight: weight,
  };
}

// ── Route handler ─────────────────────────────────────────────────────────

export async function GET() {
  try {
    const holdingTickers = [
      ...new Set(FUNDS.flatMap((f) => f.holdings.map((h) => h.ticker))),
    ];
    // Also include Yahoo-sourced ETF tickers for fund price lookup
    const yahooFundTickers = FUNDS
      .filter((f) => (f.dataSource ?? "blackrock") === "yahoo")
      .map((f) => f.ticker);

    const indexTickers = MARKET_INDICES.map((i) => i.ticker);

    // One batch Yahoo quote call + one data call per fund — all parallel
    const blackrockFunds = FUNDS.filter((f) => (f.dataSource ?? "blackrock") === "blackrock");
    const [quotesResult, ...fundResults] = await Promise.allSettled([
      fetchQuotes([...holdingTickers, ...yahooFundTickers, ...indexTickers]),
      ...blackrockFunds.map((f) => fetchBlackRockProductData(f)),
    ]);

    const quotes: Map<string, YFQuote> =
      quotesResult.status === "fulfilled" ? quotesResult.value : new Map();

    // Map BlackRock results back to their fund index
    const brResultsByFundId = new Map<string, FundResult>();
    blackrockFunds.forEach((fund, i) => {
      const r = fundResults[i];
      brResultsByFundId.set(
        fund.id,
        r.status === "fulfilled"
          ? (r as PromiseFulfilledResult<FundResult>).value
          : { quote: null, history: [] }
      );
    });

    // Build FundData for each fund (BlackRock or Yahoo)
    const fundDataPromises = FUNDS.map(async (fund): Promise<FundData> => {
      const source = fund.dataSource ?? "blackrock";
      const result: FundResult =
        source === "yahoo"
          ? await fetchYahooFundData(fund, quotes)
          : (brResultsByFundId.get(fund.id) ?? { quote: null, history: [] });

      return {
        fund,
        quote: result.quote,
        history: result.history,
        holdings: fund.holdings.map((h) =>
          yfToHolding(h.ticker, h.name, h.weight, quotes)
        ),
      };
    });

    const fundsData: FundData[] = await Promise.all(fundDataPromises);

    const indices: MarketIndex[] = MARKET_INDICES.map((idx) => {
      const q = quotes.get(idx.ticker);
      return {
        ticker: idx.ticker,
        name: idx.name,
        price: q?.regularMarketPrice ?? 0,
        change: q?.regularMarketChange ?? 0,
        changePercent: q?.regularMarketChangePercent ?? 0,
        currency: q?.currency ?? "USD",
      };
    });

    return NextResponse.json({ funds: fundsData, indices, lastUpdated: new Date().toISOString() });
  } catch (err) {
    console.error("Fund data fetch error:", err);
    return NextResponse.json({ error: "Failed to fetch fund data" }, { status: 500 });
  }
}
