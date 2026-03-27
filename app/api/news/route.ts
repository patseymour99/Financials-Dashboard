import { NextResponse } from "next/server";
import yahooFinance from "yahoo-finance2";
import { FUNDS, NEWS_QUERIES } from "@/lib/constants";
import { NewsItem } from "@/lib/types";

interface YahooNewsItem {
  uuid: string;
  title: string;
  link: string;
  publisher: string;
  providerPublishTime?: number | Date;
  thumbnail?: { resolutions?: { url: string }[] };
  relatedTickers?: string[];
}

function mapNewsItem(item: YahooNewsItem): NewsItem {
  return {
    uuid: item.uuid,
    title: item.title,
    link: item.link,
    publisher: item.publisher,
    publishedAt: item.providerPublishTime
      ? new Date(
          typeof item.providerPublishTime === "number"
            ? item.providerPublishTime * 1000
            : item.providerPublishTime
        ).toISOString()
      : new Date().toISOString(),
    thumbnail: item.thumbnail?.resolutions?.[0]?.url,
    relatedTickers: item.relatedTickers,
  };
}

async function fetchNews(query: string, count = 8): Promise<NewsItem[]> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await (yahooFinance.search as any)(query, {
      newsCount: count,
      quotesCount: 0,
    });
    return (result.news || []).map(mapNewsItem);
  } catch {
    return [];
  }
}

async function fetchTickerNews(ticker: string, count = 5): Promise<NewsItem[]> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await (yahooFinance.search as any)(ticker, {
      newsCount: count,
      quotesCount: 0,
    });
    return (result.news || []).map(mapNewsItem);
  } catch {
    return [];
  }
}

function deduplicateNews(items: NewsItem[]): NewsItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.uuid)) return false;
    seen.add(item.uuid);
    return true;
  });
}

export async function GET() {
  try {
    // Portfolio tickers: unique set across both funds
    const portfolioTickers = [
      ...new Set(FUNDS.flatMap((f) => f.holdings.map((h) => h.ticker))),
    ].slice(0, 6);

    const [marketNews, sectorNews, ...portfolioNewsArrays] =
      await Promise.allSettled([
        fetchNews(NEWS_QUERIES.market, 10),
        fetchNews(NEWS_QUERIES.sector, 10),
        ...portfolioTickers.map((t) => fetchTickerNews(t, 3)),
      ]);

    const portfolioNews = deduplicateNews(
      portfolioNewsArrays
        .filter((r) => r.status === "fulfilled")
        .flatMap((r) => (r as PromiseFulfilledResult<NewsItem[]>).value)
    ).slice(0, 12);

    return NextResponse.json({
      market:
        marketNews.status === "fulfilled"
          ? deduplicateNews(marketNews.value)
          : [],
      sector:
        sectorNews.status === "fulfilled"
          ? deduplicateNews(sectorNews.value)
          : [],
      portfolio: portfolioNews,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error("News fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch news" },
      { status: 500 }
    );
  }
}
