export interface HoldingConfig {
  ticker: string;
  name: string;
  weight?: number;
}

export interface FundConfig {
  id: string;
  name: string;
  shortName: string;
  /** Display ticker (e.g. "BPAY") or placeholder for UCITS-only funds */
  ticker: string;
  /** ISIN — present for UCITS funds */
  isin?: string;
  /** BlackRock product ID (the number in the product page URL) */
  blackrockProductId: string;
  /**
   * BlackRock regional site — 'us' for iShares US ETFs, 'uk' for UCITS.
   * Only affects the Referer header; the cache API path is the same.
   */
  blackrockRegion: "uk" | "us";
  currency: string;
  description: string;
  color: string;
  holdings: HoldingConfig[];
}

export interface Quote {
  ticker: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  previousClose: number;
  open: number;
  dayHigh: number;
  dayLow: number;
  volume: number;
  marketCap?: number;
  currency: string;
  exchange?: string;
  error?: string;
}

export interface FundQuote extends Quote {
  navDate?: string;
  ytdReturn?: number;
  expenseRatio?: number;
}

export interface HistoricalPoint {
  date: string;
  close: number;
}

export interface NewsItem {
  uuid: string;
  title: string;
  link: string;
  publisher: string;
  publishedAt: string;
  thumbnail?: string;
  relatedTickers?: string[];
}

export interface MarketIndex {
  ticker: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  currency: string;
}

export interface HoldingQuote extends Quote {
  fundWeight?: number;
}

export interface FundData {
  fund: FundConfig;
  quote: FundQuote | null;
  history: HistoricalPoint[];
  holdings: HoldingQuote[];
}

export interface DashboardData {
  funds: FundData[];
  indices: MarketIndex[];
  news: {
    market: NewsItem[];
    sector: NewsItem[];
    portfolio: NewsItem[];
  };
  lastUpdated: string;
}

export interface BriefingRequest {
  fundData: FundData[];
  indices: MarketIndex[];
  news: {
    market: NewsItem[];
    sector: NewsItem[];
    portfolio: NewsItem[];
  };
}
