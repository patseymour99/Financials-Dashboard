import { NextResponse } from "next/server";
import { fetchNews, YFNewsItem } from "@/lib/yahoo";
import { FUNDS } from "@/lib/constants";
import { NewsItem } from "@/lib/types";

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

function dedupe(items: NewsItem[]): NewsItem[] {
  const seen = new Set<string>();
  return items.filter(({ link, uuid }) => {
    const key = link || uuid;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function GET() {
  try {
    // Unique US-listed holding tickers for portfolio news
    const portfolioTickers = [
      ...new Set(
        FUNDS.flatMap((f) =>
          f.holdings.map((h) => h.ticker).filter((t) => !t.includes("."))
        )
      ),
    ];

    const [marketRes, sectorRes, ...portfolioRes] = await Promise.allSettled([
      fetchNews("stock market financial news", 12, 900),
      fetchNews("financial sector banking fintech", 12, 900),
      // Fetch news per portfolio ticker (top 6 unique ones)
      ...portfolioTickers.slice(0, 6).map((t) => fetchNews(t, 4, 900)),
    ]);

    const market    = marketRes.status  === "fulfilled" ? dedupe(marketRes.value.map(mapNewsItem))  : [];
    const sector    = sectorRes.status  === "fulfilled" ? dedupe(sectorRes.value.map(mapNewsItem))  : [];
    const portfolio = dedupe(
      portfolioRes
        .filter((r) => r.status === "fulfilled")
        .flatMap((r, i) =>
          (r as PromiseFulfilledResult<YFNewsItem[]>).value.map((n, j) => mapNewsItem(n, i * 10 + j))
        )
    ).slice(0, 14);

    return NextResponse.json({ market, sector, portfolio, lastUpdated: new Date().toISOString() });
  } catch (err) {
    console.error("News fetch error:", err);
    return NextResponse.json({ error: "Failed to fetch news" }, { status: 500 });
  }
}
