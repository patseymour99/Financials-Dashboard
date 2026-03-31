import { NextRequest, NextResponse } from "next/server";
import { fetchRSSNews, YFNewsItem } from "@/lib/yahoo";
import { NewsItem, Sector } from "@/lib/types";

// Sector ETF tickers used as RSS news proxies for each sector.
// XLF / XLK / XLV are the SPDR sector ETFs — their RSS feeds surface
// sector-specific stories without any auth.
const SECTOR_ETF: Record<Sector, string[]> = {
  financials: ["XLF", "KBE"],       // Financials + Banks
  technology: ["XLK", "SOXX"],      // Tech + Semiconductors
  healthcare: ["XLV", "IBB"],       // Healthcare + Biotech
};

// Per-sector holding tickers for the Portfolio Companies panel.
// These should match the top holdings across both funds in each sector.
const PORTFOLIO_TICKERS: Record<Sector, string[]> = {
  financials: ["JPM", "V", "MA", "PYPL", "GS", "BAC", "MS", "AXP"],
  technology: ["NVDA", "MSFT", "META", "GOOGL", "AMZN", "AMD", "AVGO", "PLTR"],
  healthcare: ["LLY", "ISRG", "REGN", "MRNA", "DXCM", "NVO", "UNH", "ABBV"],
};

// Broad-market tickers: S&P 500 + Nasdaq + global markets ETF
const MARKET_TICKERS = ["SPY", "QQQ", "VT"];

function mapItem(item: YFNewsItem): NewsItem {
  return {
    uuid: item.uuid,
    title: item.title,
    link: item.link,
    publisher: item.publisher,
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
    const sector = (searchParams.get("sector") as Sector | null) ?? "financials";

    const sectorEtfs   = SECTOR_ETF[sector]       ?? SECTOR_ETF.financials;
    const portfolioTkr = PORTFOLIO_TICKERS[sector] ?? PORTFOLIO_TICKERS.financials;

    // Fetch all RSS feeds in parallel
    const allTickers = [...MARKET_TICKERS, ...sectorEtfs, ...portfolioTkr];
    const results = await Promise.allSettled(
      allTickers.map((t) => fetchRSSNews(t, 6))
    );

    const byTicker = new Map<string, YFNewsItem[]>();
    allTickers.forEach((t, i) => {
      byTicker.set(
        t,
        results[i].status === "fulfilled"
          ? (results[i] as PromiseFulfilledResult<YFNewsItem[]>).value
          : []
      );
    });

    // Use a shared seen-set so no story appears in more than one panel
    const globalSeen = new Set<string>();

    const market = dedupe(
      MARKET_TICKERS.flatMap((t) => byTicker.get(t)!.map(mapItem)),
      globalSeen
    ).slice(0, 12);

    const sectorNews = dedupe(
      sectorEtfs.flatMap((t) => byTicker.get(t)!.map(mapItem)),
      globalSeen
    ).slice(0, 12);

    const portfolio = dedupe(
      portfolioTkr.flatMap((t) => byTicker.get(t)!.map(mapItem)),
      globalSeen
    ).slice(0, 16);

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
