import { FundConfig } from "./types";

export const FUNDS: FundConfig[] = [
  {
    id: "bgf-world-financials",
    name: "BGF World Financials Fund",
    shortName: "BGF World Financials",
    // Yahoo Finance ticker — set BGF_TICKER env var to override
    // Common format for UCITS: fund ISIN + exchange suffix
    // e.g. "0P000062R2.L" (London), or check Yahoo Finance for your share class
    ticker: process.env.BGF_TICKER || "0P000062R2.L",
    currency: "USD",
    description:
      "BlackRock Global Funds World Financials Fund — actively managed exposure to global financial sector equities.",
    color: "#f59e0b",
    holdings: [
      { ticker: "JPM", name: "JPMorgan Chase", weight: 9.2 },
      { ticker: "BRK-B", name: "Berkshire Hathaway", weight: 7.8 },
      { ticker: "V", name: "Visa", weight: 6.1 },
      { ticker: "MA", name: "Mastercard", weight: 5.4 },
      { ticker: "BAC", name: "Bank of America", weight: 4.9 },
      { ticker: "WFC", name: "Wells Fargo", weight: 3.8 },
      { ticker: "GS", name: "Goldman Sachs", weight: 3.5 },
      { ticker: "MS", name: "Morgan Stanley", weight: 3.2 },
      { ticker: "AXP", name: "American Express", weight: 2.9 },
      { ticker: "HSBA.L", name: "HSBC", weight: 2.7 },
    ],
  },
  {
    id: "ishares-fintech",
    name: "iShares Fintech Active ETF",
    shortName: "iShares Fintech",
    // Verify ticker on Yahoo Finance — set FINTECH_TICKER env var to override
    ticker: process.env.FINTECH_TICKER || "IACF",
    currency: "USD",
    description:
      "iShares Fintech Active ETF — actively managed exposure to companies driving financial technology innovation.",
    color: "#6366f1",
    holdings: [
      { ticker: "V", name: "Visa", weight: 8.5 },
      { ticker: "MA", name: "Mastercard", weight: 7.9 },
      { ticker: "PYPL", name: "PayPal", weight: 5.2 },
      { ticker: "SQ", name: "Block", weight: 4.8 },
      { ticker: "FISV", name: "Fiserv", weight: 4.3 },
      { ticker: "FIS", name: "Fidelity National Info", weight: 4.0 },
      { ticker: "GPN", name: "Global Payments", weight: 3.6 },
      { ticker: "NU", name: "Nu Holdings", weight: 3.3 },
      { ticker: "AFRM", name: "Affirm", weight: 2.8 },
      { ticker: "SOFI", name: "SoFi Technologies", weight: 2.5 },
    ],
  },
];

export const MARKET_INDICES = [
  { ticker: "^GSPC", name: "S&P 500" },
  { ticker: "^DJI", name: "Dow Jones" },
  { ticker: "^IXIC", name: "Nasdaq" },
  { ticker: "^VIX", name: "VIX" },
  { ticker: "^FTSE", name: "FTSE 100" },
  { ticker: "EURUSD=X", name: "EUR/USD" },
];

export const FINANCIAL_SECTOR_TICKERS = ["XLF", "KBE", "KRE", "IAI"];

export const NEWS_QUERIES = {
  market: "stock market financial news today",
  sector: "financial sector banking fintech news",
  portfolio: "JPMorgan Visa Mastercard PayPal fintech banking earnings",
};

export const ANTHROPIC_MODEL = "claude-sonnet-4-6";
