/**
 * Yahoo Finance public API wrapper.
 * Uses the same endpoints as finance.yahoo.com — no API key required.
 *
 * Endpoints used:
 *   v7/finance/quote        — batch real-time quotes        (needs crumb)
 *   v8/finance/chart/{sym}  — OHLCV history                (needs crumb)
 *   RSS feeds               — news per ticker/ETF           (NO auth needed)
 *
 * Yahoo Finance requires a crumb token (+ matching session cookies) for the
 * data APIs. The RSS feeds at feeds.finance.yahoo.com are fully public.
 *
 * NOTE: All fetch() calls use cache: 'no-store'.
 * Using next: { revalidate: N } would cause Next.js to cache a failed/empty
 * response and serve stale empty data for hours — exactly what we don't want.
 */

const Q1 = "https://query1.finance.yahoo.com";
const Q2 = "https://query2.finance.yahoo.com";

// ── Crumb cache (module-level — survives warm lambda reuse) ────────────────

interface CrumbCache {
  crumb: string;
  cookies: string;
  fetchedAt: number;
}

let _crumbCache: CrumbCache | null = null;
const CRUMB_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

const BASE_HEADERS: HeadersInit = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
    "AppleWebKit/537.36 (KHTML, like Gecko) " +
    "Chrome/122.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  Origin: "https://finance.yahoo.com",
  Referer: "https://finance.yahoo.com/",
};

/**
 * Extract cookies from a Response, handling both the WHATWG getSetCookie()
 * method (Node 18.14+ / undici) and the older concatenated header fallback.
 */
function extractCookies(headers: Headers): string {
  // Preferred: getSetCookie() returns each Set-Cookie header as a separate string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fn = (headers as any).getSetCookie;
  if (typeof fn === "function") {
    const parts: string[] = fn.call(headers);
    if (parts.length) {
      return parts.map((c) => c.split(";")[0].trim()).filter(Boolean).join("; ");
    }
  }

  // Fallback: headers.get("set-cookie") returns all Set-Cookie values joined
  // by ", ". We split on ", " only when followed by a key= pattern (not inside values).
  const raw = headers.get("set-cookie") ?? "";
  if (!raw) return "";
  return raw
    .split(/,\s*(?=[a-zA-Z0-9_][a-zA-Z0-9_-]*=)/)
    .map((c) => c.split(";")[0].trim())
    .filter(Boolean)
    .join("; ");
}

/**
 * Returns a valid { crumb, cookies } pair, refreshing if stale.
 * Uses fc.yahoo.com (lightweight cookie-init endpoint) rather than the full
 * finance.yahoo.com homepage so this stays fast and avoids consent pages.
 * Returns null gracefully if Yahoo is unreachable.
 */
async function getCrumb(): Promise<CrumbCache | null> {
  if (_crumbCache && Date.now() - _crumbCache.fetchedAt < CRUMB_TTL_MS) {
    return _crumbCache;
  }

  try {
    // Step 1: GET fc.yahoo.com — lightweight finance cookie initialiser
    const cookieRes = await fetch("https://fc.yahoo.com/", {
      headers: BASE_HEADERS,
      redirect: "follow",
      cache: "no-store",
    });

    const cookies = extractCookies(cookieRes.headers);

    // Step 2: Exchange cookies for a crumb token
    const crumbRes = await fetch(`${Q2}/v1/test/getcrumb`, {
      headers: { ...BASE_HEADERS, Cookie: cookies },
      cache: "no-store",
    });

    if (!crumbRes.ok) throw new Error(`getcrumb HTTP ${crumbRes.status}`);

    const crumb = (await crumbRes.text()).trim();
    if (!crumb || crumb.length < 2) throw new Error(`Invalid crumb: "${crumb}"`);

    console.log("Yahoo crumb refreshed successfully");
    _crumbCache = { crumb, cookies, fetchedAt: Date.now() };
    return _crumbCache;
  } catch (err) {
    console.warn("Yahoo crumb fetch failed — proceeding without crumb:", err);
    _crumbCache = null;
    return null;
  }
}

/** Build request headers, optionally injecting session cookies. */
function authHeaders(cookies?: string): HeadersInit {
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
}

// ── Quote ──────────────────────────────────────────────────────────────────

/**
 * Fetch real-time quotes for one or more tickers in a single request.
 * Returns a Map keyed by symbol for O(1) lookup.
 */
export async function fetchQuotes(
  tickers: string[]
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
      headers: authHeaders(auth?.cookies),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Yahoo v7 quote HTTP ${res.status}`);
    const json = await res.json();
    const results: YFQuote[] = json?.quoteResponse?.result ?? [];
    return new Map(results.map((q) => [q.symbol, q]));
  } catch (err) {
    console.error("Yahoo fetchQuotes error:", err);
    _crumbCache = null; // force crumb refresh on next call
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
  range: "ytd" | "1y" | "6mo" | "3mo" | "1mo" = "ytd"
): Promise<YFHistoricalPoint[]> {
  const auth = await getCrumb();
  const crumbParam = auth ? `&crumb=${encodeURIComponent(auth.crumb)}` : "";

  const url =
    `${Q2}/v8/finance/chart/${encodeURIComponent(ticker)}` +
    `?interval=1d&range=${range}&includePrePost=false${crumbParam}`;

  try {
    const res = await fetch(url, {
      headers: authHeaders(auth?.cookies),
      cache: "no-store",
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

// ── ETF Holdings ──────────────────────────────────────────────────────────

export interface YFHolding {
  ticker: string;
  name: string;
  weight: number; // percentage, e.g. 10.34 for 10.34%
}

/**
 * Fetch the top holdings for an ETF via Yahoo Finance quoteSummary.
 * Uses the topHoldings module — no extra API key required, same crumb flow.
 * Returns an empty array on failure.
 */
export async function fetchETFHoldings(etfTicker: string): Promise<YFHolding[]> {
  const auth = await getCrumb();
  const crumbParam = auth ? `&crumb=${encodeURIComponent(auth.crumb)}` : "";

  const url =
    `${Q2}/v10/finance/quoteSummary/${encodeURIComponent(etfTicker)}` +
    `?modules=topHoldings&formatted=false&lang=en-US&region=US${crumbParam}`;

  try {
    const res = await fetch(url, {
      headers: authHeaders(auth?.cookies),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Yahoo quoteSummary HTTP ${res.status}`);
    const json = await res.json();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw: any[] =
      json?.quoteSummary?.result?.[0]?.topHoldings?.holdings ?? [];

    return raw
      .filter((h) => h.symbol && h.symbol !== "-")
      .map((h) => ({
        ticker: String(h.symbol).trim(),
        name: String(h.holdingName ?? h.symbol).trim(),
        // holdingPercent.raw is a decimal fraction (0.1034 → 10.34%)
        weight:
          typeof h.holdingPercent === "object"
            ? (h.holdingPercent.raw ?? 0) * 100
            : typeof h.holdingPercent === "number"
            ? h.holdingPercent * 100
            : 0,
      }))
      .filter((h) => h.weight > 0);
  } catch (err) {
    console.error(`fetchETFHoldings(${etfTicker}) error:`, err);
    return [];
  }
}

// ── GICS Industry Performance ─────────────────────────────────────────────

const GICS_SECTOR_KEYS: Record<string, string> = {
  technology: "technology",
  healthcare: "healthcare",
  financials: "financial-services",
};

export interface GICSIndustry {
  name: string;
  changePercent: number;
}

/**
 * Fetch GICS industry performance for a given sector from Yahoo Finance's
 * sectors API.  Returns [] on failure — caller should fall back to ETF proxies.
 */
export async function fetchGICSIndustries(sectorId: string): Promise<GICSIndustry[]> {
  const sectorKey = GICS_SECTOR_KEYS[sectorId];
  if (!sectorKey) return [];

  const auth = await getCrumb();
  const crumbParam = auth ? `&crumb=${encodeURIComponent(auth.crumb)}` : "";

  const url =
    `${Q1}/v1/finance/sectors/${sectorKey}` +
    `?formatted=false&lang=en-US&region=US${crumbParam}`;

  try {
    const res = await fetch(url, {
      headers: authHeaders(auth?.cookies),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`GICS sectors API HTTP ${res.status}`);
    const json = await res.json();

    // Support multiple possible response shapes
    const result =
      json?.sectorPerformance?.result ??
      json?.quoteSummary?.result?.[0] ??
      json?.finance?.result;

    const industries: unknown[] =
      (Array.isArray(result) ? result[0] : result)?.industries ?? [];

    return industries
      .filter(
        (i): i is Record<string, unknown> =>
          typeof i === "object" && i !== null && "industry" in i
      )
      .map((i) => ({
        name: String(i.industry ?? i.industryName ?? ""),
        changePercent: parseFloat(
          String(i.changesPercentage ?? i.changePercent ?? "0").replace("%", "")
        ),
      }))
      .filter((i) => i.name && !isNaN(i.changePercent));
  } catch (err) {
    console.warn(`fetchGICSIndustries(${sectorId}) failed:`, err);
    return [];
  }
}

// ── News (RSS — no auth required) ─────────────────────────────────────────

const RSS_BASE = "https://feeds.finance.yahoo.com/rss/2.0/headline";
const RSS_HEADERS: HeadersInit = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  Accept: "application/rss+xml, application/xml, text/xml, */*",
};

function extractTag(xml: string, tag: string): string {
  const m = xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`));
  return m ? m[1] : "";
}

function stripCDATA(s: string): string {
  const m = s.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
  return (m ? m[1] : s).trim();
}

function parseRSS(xml: string, limit: number): YFNewsItem[] {
  const items: YFNewsItem[] = [];
  const re = /<item>([\s\S]*?)<\/item>/g;
  let m: RegExpExecArray | null;

  while ((m = re.exec(xml)) !== null && items.length < limit) {
    const chunk = m[1];
    const title  = stripCDATA(extractTag(chunk, "title"));
    const link   = stripCDATA(extractTag(chunk, "link"));
    const pubDate = extractTag(chunk, "pubDate");
    // <source> may carry the publisher name
    const source = stripCDATA(extractTag(chunk, "source")) || "Yahoo Finance";

    if (!title || !link) continue;

    items.push({
      uuid: link,
      title,
      link,
      publisher: source,
      providerPublishTime: pubDate
        ? Math.floor(new Date(pubDate).getTime() / 1000)
        : 0,
    });
  }

  return items;
}

/**
 * Fetch news for a Yahoo Finance ticker via the public RSS feed.
 * No crumb or cookies required — works reliably from serverless.
 */
export async function fetchRSSNews(
  ticker: string,
  count = 8
): Promise<YFNewsItem[]> {
  const url = `${RSS_BASE}?s=${encodeURIComponent(ticker)}&region=US&lang=en-US`;
  try {
    const res = await fetch(url, { headers: RSS_HEADERS, cache: "no-store" });
    if (!res.ok) throw new Error(`RSS ${res.status} for ${ticker}`);
    return parseRSS(await res.text(), count);
  } catch (err) {
    console.error(`fetchRSSNews(${ticker}) error:`, err);
    return [];
  }
}

/**
 * Fetch news from any public RSS URL (Reuters, CNBC, MarketWatch, etc.).
 * Falls back to [] gracefully so callers can try alternative sources.
 */
export async function fetchExternalRSS(
  url: string,
  count = 8,
  defaultPublisher = ""
): Promise<YFNewsItem[]> {
  try {
    const res = await fetch(url, { headers: RSS_HEADERS, cache: "no-store" });
    if (!res.ok) throw new Error(`External RSS ${res.status} (${url})`);
    const items = parseRSS(await res.text(), count);
    if (!defaultPublisher) return items;
    return items.map((item) => ({
      ...item,
      publisher: item.publisher || defaultPublisher,
    }));
  } catch (err) {
    console.warn(`fetchExternalRSS(${url}) error:`, err);
    return [];
  }
}
