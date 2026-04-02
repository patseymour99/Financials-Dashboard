import { NextResponse } from "next/server";
import { fetchQuotes, fetchHistory, fetchETFHoldings, YFHistoricalPoint, YFQuote } from "@/lib/yahoo";
import { FUNDS, MARKET_INDICES } from "@/lib/constants";
import {
  FundConfig,
  FundQuote,
  HoldingConfig,
  HoldingQuote,
  MarketIndex,
  HistoricalPoint,
  FundData,
} from "@/lib/types";

// ── iShares live holdings ─────────────────────────────────────────────────

const ISHARES_HEADERS: HeadersInit = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: "https://www.ishares.com/us/products/",
  "X-Requested-With": "XMLHttpRequest",
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "same-origin",
};

/**
 * Fetch the latest daily holdings from BlackRock's iShares holdings API.
 * Returns an empty array on failure so the caller falls back to hardcoded data.
 */
async function fetchIsharesHoldings(
  productId: string,
  slug: string
): Promise<HoldingConfig[]> {
  const url =
    `https://www.ishares.com/us/products/${productId}/${slug}` +
    `/1467271812596.ajax?tab=holdings&fileType=json`;
  try {
    const res = await fetch(url, { headers: ISHARES_HEADERS, cache: "no-store" });
    if (!res.ok) throw new Error(`iShares holdings HTTP ${res.status}`);

    const json = await res.json();
    // Response shape: { aaData: [[ticker, name, assetClass, weight, ...], ...] }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows: any[][] = json?.aaData ?? [];

    const holdings: HoldingConfig[] = [];
    for (const row of rows) {
      // Columns: [ticker, name, assetClass, weight%, price, shares, marketValue, notional, ...]
      const ticker = String(row[0] ?? "").trim();
      const name   = String(row[1] ?? "").trim();
      const weight = parseFloat(String(row[3] ?? "0").replace(/[^0-9.-]/g, ""));

      // Skip cash, money-market entries, and rows without a real ticker
      if (!ticker || ticker === "-" || ticker === "CASH") continue;
      // Skip purely-numeric tickers (e.g. Korean KRX "000660" for SK Hynix) —
      // Yahoo Finance has no quote for these and they'd show as unavailable
      if (/^\d+$/.test(ticker)) continue;
      // Skip non-equity asset classes
      const assetClass = String(row[2] ?? "").toLowerCase();
      if (assetClass.includes("cash") || assetClass.includes("money")) continue;

      holdings.push({ ticker, name, weight: isNaN(weight) ? undefined : weight });
      if (holdings.length >= 20) break; // cap at top 20
    }

    return holdings;
  } catch (err) {
    console.error(`iShares holdings fetch failed for ${slug}:`, err);
    return [];
  }
}

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
    // Step 1: Fetch live holdings for active iShares ETFs.
    // Primary source: iShares holdings API.
    // Backup source: Yahoo Finance quoteSummary/topHoldings.
    // For non-iShares funds (BGF): use the curated holdings list from config.
    const isharesHoldingsMap = new Map<string, HoldingConfig[]>();
    await Promise.all(
      FUNDS
        .filter((f) => f.isharesProductId && f.isharesSlug)
        .map(async (f) => {
          // Try iShares first
          let live = await fetchIsharesHoldings(f.isharesProductId!, f.isharesSlug!);

          // Fallback to Yahoo Finance topHoldings if iShares returned nothing
          if (!live.length) {
            console.log(`iShares failed for ${f.ticker}, trying Yahoo topHoldings`);
            const yfHoldings = await fetchETFHoldings(f.ticker);
            live = yfHoldings.map((h) => ({ ticker: h.ticker, name: h.name, weight: h.weight }));
          }

          if (live.length) isharesHoldingsMap.set(f.id, live);
        })
    );

    // Step 2: Collect all holding tickers (live where available, else fund config for BGF funds)
    const holdingTickers = [
      ...new Set(
        FUNDS.flatMap((f) =>
          (isharesHoldingsMap.get(f.id) ?? f.holdings).map((h) => h.ticker)
        )
      ),
    ];

    const yahooFundTickers = FUNDS
      .filter((f) => (f.dataSource ?? "blackrock") === "yahoo")
      .map((f) => f.ticker);

    const indexTickers = MARKET_INDICES.map((i) => i.ticker);

    // Step 3: Batch Yahoo quote + per-fund data calls in parallel
    const blackrockFunds = FUNDS.filter((f) => (f.dataSource ?? "blackrock") === "blackrock");
    const [quotesResult, ...fundResults] = await Promise.allSettled([
      fetchQuotes([...holdingTickers, ...yahooFundTickers, ...indexTickers]),
      ...blackrockFunds.map((f) => fetchBlackRockProductData(f)),
    ]);

    const quotes: Map<string, YFQuote> =
      quotesResult.status === "fulfilled" ? quotesResult.value : new Map();

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

    // Step 4: Build FundData — use live holdings if fetched, hardcoded as fallback
    const fundDataPromises = FUNDS.map(async (fund): Promise<FundData> => {
      const source = fund.dataSource ?? "blackrock";
      const result: FundResult =
        source === "yahoo"
          ? await fetchYahooFundData(fund, quotes)
          : (brResultsByFundId.get(fund.id) ?? { quote: null, history: [] });

      const holdings = (isharesHoldingsMap.get(fund.id) ?? fund.holdings).map((h) =>
        yfToHolding(h.ticker, h.name, h.weight, quotes)
      );

      return { fund, quote: result.quote, history: result.history, holdings };
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
