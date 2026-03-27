import { NextResponse } from "next/server";
import { FUNDS } from "@/lib/constants";
import { NewsItem } from "@/lib/types";

const FMP_BASE = "https://financialmodelingprep.com/api/v3";
const API_KEY = process.env.FMP_API_KEY;

interface FmpNewsItem {
  symbol?: string;
  publishedDate: string;
  publisher?: string;
  title: string;
  image?: string;
  site: string;
  text?: string;
  url: string;
}

function mapFmpNews(item: FmpNewsItem, idx: number): NewsItem {
  return {
    uuid: `${item.publishedDate}-${idx}`,
    title: item.title,
    link: item.url,
    publisher: item.site || item.publisher || "Unknown",
    publishedAt: item.publishedDate
      ? new Date(item.publishedDate).toISOString()
      : new Date().toISOString(),
    thumbnail: item.image,
    relatedTickers: item.symbol ? [item.symbol] : undefined,
  };
}

async function fetchStockNews(
  tickers: string[],
  limit = 10
): Promise<NewsItem[]> {
  try {
    const tickerStr = tickers.join(",");
    const res = await fetch(
      `${FMP_BASE}/stock_news?tickers=${tickerStr}&limit=${limit}&apikey=${API_KEY}`,
      { next: { revalidate: 900 } }
    );
    if (!res.ok) throw new Error(`FMP news ${res.status}`);
    const data: FmpNewsItem[] = await res.json();
    return data.map(mapFmpNews);
  } catch (err) {
    console.error("FMP stock news error:", err);
    return [];
  }
}

async function fetchGeneralNews(limit = 10): Promise<NewsItem[]> {
  try {
    // FMP general market news (available on free tier)
    const res = await fetch(
      `${FMP_BASE}/stock_news?limit=${limit}&apikey=${API_KEY}`,
      { next: { revalidate: 900 } }
    );
    if (!res.ok) throw new Error(`FMP general news ${res.status}`);
    const data: FmpNewsItem[] = await res.json();
    return data.map(mapFmpNews);
  } catch (err) {
    console.error("FMP general news error:", err);
    return [];
  }
}

function deduplicateNews(items: NewsItem[]): NewsItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.link || item.uuid;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function GET() {
  try {
    // Portfolio tickers: unique set across both funds (US-listed only for news)
    const portfolioTickers = [
      ...new Set(
        FUNDS.flatMap((f) =>
          f.holdings
            .map((h) => h.ticker)
            .filter((t) => !t.includes(".")) // skip non-US tickers
        )
      ),
    ];

    // Financial sector bellwether tickers for sector news
    const sectorTickers = ["XLF", "JPM", "GS", "V", "MA", "BAC", "PYPL", "SQ"];

    const [generalNews, sectorNews, portfolioNews] = await Promise.allSettled([
      fetchGeneralNews(12),
      fetchStockNews(sectorTickers, 12),
      fetchStockNews(portfolioTickers.slice(0, 8), 15),
    ]);

    // Broad market = general news minus obvious sector overlap
    const market =
      generalNews.status === "fulfilled"
        ? deduplicateNews(generalNews.value)
        : [];

    const sector =
      sectorNews.status === "fulfilled"
        ? deduplicateNews(sectorNews.value)
        : [];

    const portfolio =
      portfolioNews.status === "fulfilled"
        ? deduplicateNews(portfolioNews.value)
        : [];

    return NextResponse.json({
      market,
      sector,
      portfolio,
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
