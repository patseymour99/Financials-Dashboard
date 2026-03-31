import { NextRequest, NextResponse } from "next/server";
import { fetchNews, YFNewsItem } from "@/lib/yahoo";
import { SECTOR_NEWS } from "@/lib/constants";
import { NewsItem, Sector } from "@/lib/types";

function mapNewsItem(item: YFNewsItem, idx: number): NewsItem {
  return {
    uuid: item.uuid || `${item.providerPublishTime}-${idx}`,
    title: item.title,
    link: item.link,
    publisher: item.publisher,
    publishedAt: item.providerPublishTime
      ? new Date(item.providerPublishTime * 1000).toISOString()
      : new Date().toISOString(),
    thumbnail: item.thumbnail?.resolutions?.[0]?.url,
    relatedTickers: item.relatedTickers,
  };
}

function dedupe(items: NewsItem[], seen: Set<string> = new Set()): NewsItem[] {
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

    const sectorQueries = SECTOR_NEWS[sector] ?? SECTOR_NEWS.financials;

    // Fetch broad market, sector-specific, and per-ticker holding news in parallel.
    // Portfolio tickers come directly from the sector's SECTOR_NEWS list so they
    // are guaranteed to be holdings of that sector's funds only.
    const portfolioTickers = sectorQueries.portfolio.slice(0, 8);

    const [marketRes, sectorRes, ...portfolioRes] = await Promise.allSettled([
      fetchNews("global stock market equities today", 12),
      fetchNews(sectorQueries.sector, 12),
      ...portfolioTickers.map((t) => fetchNews(t, 3)),
    ]);

    // Use a shared seen-set so no story appears in more than one panel
    const globalSeen = new Set<string>();

    const market = dedupe(
      (marketRes.status === "fulfilled" ? marketRes.value : []).map(mapNewsItem),
      globalSeen
    );

    const sectorNews = dedupe(
      (sectorRes.status === "fulfilled" ? sectorRes.value : []).map(mapNewsItem),
      globalSeen
    );

    const portfolio = dedupe(
      portfolioRes
        .filter((r) => r.status === "fulfilled")
        .flatMap((r, i) =>
          (r as PromiseFulfilledResult<YFNewsItem[]>).value.map((n, j) =>
            mapNewsItem(n, i * 10 + j)
          )
        ),
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
