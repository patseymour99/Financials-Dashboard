export type Sector = "financials" | "technology" | "healthcare";

export interface SectorConfig {
  id: Sector;
  name: string;
  color: string;
  description: string;
}

export interface HoldingConfig {
  ticker: string;
  name: string;
  weight?: number;
}

export interface FundConfig {
  id: string;
  name: string;
  shortName: string;
  ticker: string;
  isin?: string;
  /** "blackrock" = use performanceChart.json; "yahoo" = use Yahoo Finance quotes */
  dataSource?: "blackrock" | "yahoo";
  blackrockProductId?: string;
  blackrockRegion?: "uk" | "us";
  currency: string;
  description: string;
  color: string;
  sector: Sector;
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
  mtdReturn?: number;
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

export interface MetricAsset {
  id: string;
  ticker: string;
  name: string;
  label: string;
  price: number;
  change: number;
  changePercent: number;
  mtdReturn: number | null;
  ytdReturn: number | null;
  currency: string;
  /** If true, price is a % yield — display differently */
  isYield?: boolean;
  /** If true, price is a rate (BTC, commodities) — no $B suffix */
  isCrypto?: boolean;
}

export interface DashboardData {
  funds: FundData[];
  indices: MarketIndex[];
  metrics: MetricAsset[];
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
  metrics: MetricAsset[];
  news: {
    market: NewsItem[];
    sector: NewsItem[];
    portfolio: NewsItem[];
  };
}
