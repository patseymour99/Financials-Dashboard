import { NextResponse } from "next/server";
import { fetchQuotes, YFQuote } from "@/lib/yahoo";
import { FUNDS, MARKET_INDICES } from "@/lib/constants";
import {
  FundConfig,
  FundQuote,
  HoldingQuote,
  MarketIndex,
  HistoricalPoint,
  FundData,
} from "@/lib/types";

// ── BlackRock NAV (unchanged — Yahoo doesn't carry UCITS/active ETF NAVs) ──

interface BlackRockProductData {
  quote: FundQuote | null;
  history: HistoricalPoint[];
}

async function fetchBlackRockProductData(
  fund: FundConfig
): Promise<BlackRockProductData> {
  const { blackrockProductId, blackrockRegion, name, ticker, currency } = fund;
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
    const indexTickers = MARKET_INDICES.map((i) => i.ticker);

    // One Yahoo batch quote call + one BlackRock call per fund — all parallel
    const [quotesResult, ...fundResults] = await Promise.allSettled([
      fetchQuotes([...holdingTickers, ...indexTickers]),
      ...FUNDS.map((f) => fetchBlackRockProductData(f)),
    ]);

    const quotes: Map<string, YFQuote> =
      quotesResult.status === "fulfilled" ? quotesResult.value : new Map();

    const fundsData: FundData[] = FUNDS.map((fund, i) => {
      const br =
        fundResults[i].status === "fulfilled"
          ? (fundResults[i] as PromiseFulfilledResult<BlackRockProductData>).value
          : ({ quote: null, history: [] } as BlackRockProductData);

      return {
        fund,
        quote: br.quote,
        history: br.history,
        holdings: fund.holdings.map((h) =>
          yfToHolding(h.ticker, h.name, h.weight, quotes)
        ),
      };
    });

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
