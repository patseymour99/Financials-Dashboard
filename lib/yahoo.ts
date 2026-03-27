/**
 * Yahoo Finance public API wrapper.
 * Uses the same endpoints as finance.yahoo.com — no API key required.
 *
 * Endpoints used:
 *   v7/finance/quote        — batch real-time quotes
 *   v8/finance/chart/{sym}  — OHLCV history (also supplies current price in meta)
 *   v1/finance/search       — news search
 */

const Q1 = "https://query1.finance.yahoo.com";
const Q2 = "https://query2.finance.yahoo.com";

// Browser-like headers help avoid Yahoo's bot detection from serverless envs
const HEADERS: HeadersInit = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
    "AppleWebKit/537.36 (KHTML, like Gecko) " +
    "Chrome/122.0.0.0 Safari/537.36",
  Accept: "*/*",
  "Accept-Language": "en-US,en;q=0.9",
  Origin: "https://finance.yahoo.com",
  Referer: "https://finance.yahoo.com/",
};

// ── Types ──────────────────────────────────────────────────────────────────

export interface YFQuote {
  symbol: string;
  longName?: string;
  shortName?: string;
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  regularMarketPreviousClose?: number;
  regularMarketOpen?: number;
  regularMarketDayHigh?: number;
  regularMarketDayLow?: number;
  regularMarketVolume?: number;
  marketCap?: number;
  currency?: string;
  fullExchangeName?: string;
}

export interface YFHistoricalPoint {
  date: string;   // "YYYY-MM-DD"
  close: number;
}

export interface YFNewsItem {
  uuid: string;
  title: string;
  link: string;
  publisher: string;
  providerPublishTime: number; // unix seconds
  thumbnail?: { resolutions?: { url: string }[] };
  relatedTickers?: string[];
}

// ── Quote ──────────────────────────────────────────────────────────────────

/**
 * Fetch real-time quotes for one or more tickers in a single request.
 * Returns a Map keyed by symbol for O(1) lookup.
 */
export async function fetchQuotes(
  tickers: string[],
  cacheSecs = 300
): Promise<Map<string, YFQuote>> {
  if (!tickers.length) return new Map();
  const fields = [
    "regularMarketPrice",
    "regularMarketChange",
    "regularMarketChangePercent",
    "regularMarketPreviousClose",
    "regularMarketOpen",
    "regularMarketDayHigh",
    "regularMarketDayLow",
    "regularMarketVolume",
    "longName",
    "shortName",
    "currency",
    "fullExchangeName",
    "marketCap",
  ].join(",");

  const url =
    `${Q2}/v7/finance/quote?symbols=${encodeURIComponent(tickers.join(","))}` +
    `&fields=${fields}&formatted=false&lang=en-US&region=US`;

  try {
    const res = await fetch(url, {
      headers: HEADERS,
      next: { revalidate: cacheSecs },
    });
    if (!res.ok) throw new Error(`Yahoo v7 quote HTTP ${res.status}`);
    const json = await res.json();
    const results: YFQuote[] = json?.quoteResponse?.result ?? [];
    return new Map(results.map((q) => [q.symbol, q]));
  } catch (err) {
    console.error("Yahoo fetchQuotes error:", err);
    return new Map();
  }
}

// ── Historical ─────────────────────────────────────────────────────────────

/**
 * Fetch daily OHLCV history via the v8 chart endpoint.
 * `range` can be "ytd", "1y", "6mo", "3mo", "1mo", "5d", "1d".
 */
export async function fetchHistory(
  ticker: string,
  range: "ytd" | "1y" | "6mo" | "3mo" | "1mo" = "ytd",
  cacheSecs = 3600
): Promise<YFHistoricalPoint[]> {
  const url =
    `${Q2}/v8/finance/chart/${encodeURIComponent(ticker)}` +
    `?interval=1d&range=${range}&includePrePost=false`;

  try {
    const res = await fetch(url, {
      headers: HEADERS,
      next: { revalidate: cacheSecs },
    });
    if (!res.ok) throw new Error(`Yahoo v8 chart HTTP ${res.status}`);
    const json = await res.json();
    const result = json?.chart?.result?.[0];
    if (!result) return [];

    const timestamps: number[] = result.timestamp ?? [];
    const closes: (number | null)[] = result.indicators?.quote?.[0]?.close ?? [];

    return timestamps
      .map((ts, i) => ({
        date: new Date(ts * 1000).toISOString().split("T")[0],
        close: closes[i] ?? 0,
      }))
      .filter((p) => p.close > 0);
  } catch (err) {
    console.error(`Yahoo fetchHistory(${ticker}) error:`, err);
    return [];
  }
}

// ── News ───────────────────────────────────────────────────────────────────

/**
 * Search Yahoo Finance for news stories matching `query`.
 * Pass a ticker symbol for company-specific news, or a phrase for general search.
 */
export async function fetchNews(
  query: string,
  count = 10,
  cacheSecs = 900
): Promise<YFNewsItem[]> {
  const url =
    `${Q1}/v1/finance/search?q=${encodeURIComponent(query)}` +
    `&newsCount=${count}&quotesCount=0&enableFuzzyQuery=false`;

  try {
    const res = await fetch(url, {
      headers: HEADERS,
      next: { revalidate: cacheSecs },
    });
    if (!res.ok) throw new Error(`Yahoo news HTTP ${res.status}`);
    const json = await res.json();
    return json?.news ?? [];
  } catch (err) {
    console.error(`Yahoo fetchNews("${query}") error:`, err);
    return [];
  }
}
