/**
 * Yahoo Finance public API wrapper.
 * Uses the same endpoints as finance.yahoo.com — no API key required.
 *
 * Endpoints used:
 *   v7/finance/quote        — batch real-time quotes
 *   v8/finance/chart/{sym}  — OHLCV history
 *   v1/finance/search       — news search
 *
 * Yahoo Finance requires a crumb token (+ matching cookies) for all API calls.
 * We fetch the crumb once and cache it in module scope so warm serverless
 * lambdas reuse it across requests (saves ~300 ms per request).
 */

const Q1 = "https://query1.finance.yahoo.com";
const Q2 = "https://query2.finance.yahoo.com";
const YF_BASE = "https://finance.yahoo.com";

// ── Crumb cache (module-level — survives warm lambda reuse) ────────────────

interface CrumbCache {
  crumb: string;
  cookies: string;
  fetchedAt: number;
}

let _crumbCache: CrumbCache | null = null;
const CRUMB_TTL_MS = 20 * 60 * 60 * 1000; // 20 hours

const BASE_HEADERS: HeadersInit = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
    "AppleWebKit/537.36 (KHTML, like Gecko) " +
    "Chrome/122.0.0.0 Safari/537.36",
  Accept: "*/*",
  "Accept-Language": "en-US,en;q=0.9",
  Origin: YF_BASE,
  Referer: `${YF_BASE}/`,
};

/**
 * Returns a valid { crumb, cookies } pair, refreshing if stale.
 * Falls back gracefully — returns null if Yahoo is unreachable.
 */
async function getCrumb(): Promise<CrumbCache | null> {
  if (_crumbCache && Date.now() - _crumbCache.fetchedAt < CRUMB_TTL_MS) {
    return _crumbCache;
  }

  try {
    // Step 1: GET finance.yahoo.com to obtain session cookies
    const homeRes = await fetch(YF_BASE, {
      headers: BASE_HEADERS,
      redirect: "follow",
    });

    const rawCookies = homeRes.headers.getSetCookie?.() ?? [];
    const cookies = rawCookies
      .map((c) => c.split(";")[0])
      .filter(Boolean)
      .join("; ");

    // Step 2: GET /v1/test/getcrumb using the session cookies
    const crumbRes = await fetch(`${Q2}/v1/test/getcrumb`, {
      headers: { ...BASE_HEADERS, Cookie: cookies },
    });

    if (!crumbRes.ok) {
      throw new Error(`getcrumb HTTP ${crumbRes.status}`);
    }

    const crumb = (await crumbRes.text()).trim();
    if (!crumb || crumb.length < 2) {
      throw new Error(`Invalid crumb: "${crumb}"`);
    }

    _crumbCache = { crumb, cookies, fetchedAt: Date.now() };
    return _crumbCache;
  } catch (err) {
    console.warn("Yahoo crumb fetch failed — will retry next request:", err);
    _crumbCache = null;
    return null;
  }
}

/** Build request headers, optionally injecting session cookies. */
function headers(cookies?: string): HeadersInit {
  return cookies ? { ...BASE_HEADERS, Cookie: cookies } : BASE_HEADERS;
}

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

  const auth = await getCrumb();

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

  const crumbParam = auth ? `&crumb=${encodeURIComponent(auth.crumb)}` : "";
  const url =
    `${Q2}/v7/finance/quote?symbols=${encodeURIComponent(tickers.join(","))}` +
    `&fields=${fields}&formatted=false&lang=en-US&region=US${crumbParam}`;

  try {
    const res = await fetch(url, {
      headers: headers(auth?.cookies),
      next: { revalidate: cacheSecs },
    });
    if (!res.ok) throw new Error(`Yahoo v7 quote HTTP ${res.status}`);
    const json = await res.json();
    const results: YFQuote[] = json?.quoteResponse?.result ?? [];
    return new Map(results.map((q) => [q.symbol, q]));
  } catch (err) {
    console.error("Yahoo fetchQuotes error:", err);
    // Invalidate crumb so next request gets a fresh one
    _crumbCache = null;
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
  const auth = await getCrumb();
  const crumbParam = auth ? `&crumb=${encodeURIComponent(auth.crumb)}` : "";

  const url =
    `${Q2}/v8/finance/chart/${encodeURIComponent(ticker)}` +
    `?interval=1d&range=${range}&includePrePost=false${crumbParam}`;

  try {
    const res = await fetch(url, {
      headers: headers(auth?.cookies),
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
    _crumbCache = null;
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
  const auth = await getCrumb();
  const crumbParam = auth ? `&crumb=${encodeURIComponent(auth.crumb)}` : "";

  const url =
    `${Q1}/v1/finance/search?q=${encodeURIComponent(query)}` +
    `&newsCount=${count}&quotesCount=0&enableFuzzyQuery=false${crumbParam}`;

  try {
    const res = await fetch(url, {
      headers: headers(auth?.cookies),
      next: { revalidate: cacheSecs },
    });
    if (!res.ok) throw new Error(`Yahoo news HTTP ${res.status}`);
    const json = await res.json();
    return json?.news ?? [];
  } catch (err) {
    console.error(`Yahoo fetchNews("${query}") error:`, err);
    _crumbCache = null;
    return [];
  }
}
