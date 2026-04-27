import { NextRequest, NextResponse } from "next/server";
import { fetchRSSNews, fetchExternalRSS, YFNewsItem } from "@/lib/yahoo";
import { NewsItem, Sector } from "@/lib/types";

// ── High-quality external RSS feeds ───────────────────────────────────────
// CNBC and Reuters give professional, curated financial journalism.

const CNBC_MARKET   = "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100003114";
const CNBC_TECH     = "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=19854910";
const CNBC_FINANCE  = "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=10000664";
const CNBC_HEALTH   = "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=10000108";
const MW_TOP        = "https://feeds.marketwatch.com/marketwatch/topstories/";
const MW_PULSE      = "https://feeds.marketwatch.com/marketwatch/marketpulse/";
const REUTERS_BIZ   = "https://feeds.reuters.com/reuters/businessNews";
const REUTERS_TECH  = "https://feeds.reuters.com/reuters/technologyNews";

// Per-sector external feeds: try each in order, merge results
const SECTOR_EXTERNAL: Record<Sector, Array<{ url: string; pub: string }>> = {
  technology: [
    { url: CNBC_TECH,    pub: "CNBC" },
    { url: REUTERS_TECH, pub: "Reuters" },
  ],
  healthcare: [
    { url: CNBC_HEALTH,  pub: "CNBC" },
    { url: REUTERS_BIZ,  pub: "Reuters" }, // Reuters no specific health feed
  ],
  financials: [
    { url: CNBC_FINANCE, pub: "CNBC" },
    { url: REUTERS_BIZ,  pub: "Reuters" },
  ],
};

const MARKET_EXTERNAL = [
  { url: CNBC_MARKET, pub: "CNBC" },
  { url: MW_PULSE,    pub: "MarketWatch" },
  { url: MW_TOP,      pub: "MarketWatch" },
  { url: REUTERS_BIZ, pub: "Reuters" },
];

// Individual holding tickers for the Portfolio Companies panel.
// Yahoo Finance RSS for individual stocks surfaces real company news
// (earnings, analyst moves, product launches) — much more relevant
// than ETF-level RSS feeds.
const PORTFOLIO_TICKERS: Record<Sector, string[]> = {
  technology: ["NVDA", "MSFT", "META", "GOOGL", "AMZN", "AVGO", "AAPL"],
  healthcare: ["LLY", "NVO", "UNH", "ABBV", "ISRG", "JNJ", "REGN"],
  financials: ["JPM", "V", "MA", "GS", "BAC", "MS", "AXP"],
};

function mapItem(item: YFNewsItem): NewsItem {
  return {
    uuid:        item.uuid,
    title:       item.title,
    link:        item.link,
    publisher:   item.publisher,
    publishedAt: item.providerPublishTime
      ? new Date(item.providerPublishTime * 1000).toISOString()
      : new Date().toISOString(),
  };
}

function dedupe(items: NewsItem[], seen: Set<string>): NewsItem[] {
  return items.filter(({ link, uuid }) => {
    const key = link || uuid;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const sector = (searchParams.get("sector") as Sector | null) ?? "technology";

    const sectorFeeds   = SECTOR_EXTERNAL[sector]       ?? SECTOR_EXTERNAL.technology;
    const portfolioTkrs = PORTFOLIO_TICKERS[sector]     ?? PORTFOLIO_TICKERS.technology;

    // Fetch everything in parallel: external RSS + Yahoo Finance individual stocks
    const externalFetches = [
      ...MARKET_EXTERNAL.map((f) => fetchExternalRSS(f.url, 8, f.pub)),
      ...sectorFeeds.map((f)   => fetchExternalRSS(f.url, 8, f.pub)),
    ];
    const yahooFetches = portfolioTkrs.map((t) => fetchRSSNews(t, 5));

    const [extResults, yahooResults] = await Promise.all([
      Promise.allSettled(externalFetches),
      Promise.allSettled(yahooFetches),
    ]);

    // Resolve market external feeds
    const marketItems: YFNewsItem[] = [];
    MARKET_EXTERNAL.forEach((_, i) => {
      if (extResults[i]?.status === "fulfilled") {
        marketItems.push(...(extResults[i] as PromiseFulfilledResult<YFNewsItem[]>).value);
      }
    });

    // Resolve sector external feeds
    const sectorItems: YFNewsItem[] = [];
    sectorFeeds.forEach((_, i) => {
      const idx = MARKET_EXTERNAL.length + i;
      if (extResults[idx]?.status === "fulfilled") {
        sectorItems.push(...(extResults[idx] as PromiseFulfilledResult<YFNewsItem[]>).value);
      }
    });

    // Resolve portfolio Yahoo Finance feeds
    const portfolioItems: YFNewsItem[] = [];
    yahooResults.forEach((r) => {
      if (r.status === "fulfilled") portfolioItems.push(...r.value);
    });

    const globalSeen = new Set<string>();

    const market = dedupe(marketItems.map(mapItem), globalSeen).slice(0, 12);
    const sectorNews = dedupe(sectorItems.map(mapItem), globalSeen).slice(0, 12);
    const portfolio  = dedupe(portfolioItems.map(mapItem), globalSeen).slice(0, 16);

    return NextResponse.json({
      market,
      sector: sectorNews,
      portfolio,
      lastUpdated: new Date().toISOString(),
    });
  } catch (err) {
    console.error("News fetch error:", err);
    return NextResponse.json({ error: "Failed to fetch news" }, { status: 500 });
  }
}
