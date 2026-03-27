import { FundConfig } from "./types";

export const FUNDS: FundConfig[] = [
  {
    id: "bgf-world-financials",
    name: "BGF World Financials Fund",
    shortName: "BGF World Financials",
    ticker: "BGF-WORLD-FINANCIALS", // display only — data comes from BlackRock NAV
    isin: "LU0171307068", // A2 USD share class
    // Set BGF_BLACKROCK_URL env var to override, or find it at:
    // https://www.blackrock.com/uk/individual/products/229115/
    // The slug is the path segment after /products/
    blackrockProductUrl:
      process.env.BGF_BLACKROCK_URL || "229115/bgf-world-financials-fund",
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
      { ticker: "C", name: "Citigroup", weight: 2.7 },
    ],
  },
  {
    id: "ishares-fintech",
    name: "iShares Fintech Active ETF",
    shortName: "iShares Fintech",
    // If this is a US-listed ETF, set FINTECH_TICKER to the exact exchange ticker.
    // If it is a UCITS ETF, set the ISIN instead via FINTECH_ISIN.
    ticker: process.env.FINTECH_TICKER || "IACF",
    isin: process.env.FINTECH_ISIN || undefined, // set if UCITS
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
  { ticker: "EURUSD", name: "EUR/USD" },
];

export const NEWS_QUERIES = {
  market: "stock market financial news today",
  sector: "financial sector banking fintech news",
  portfolio: "JPMorgan Visa Mastercard PayPal fintech banking earnings",
};

export const ANTHROPIC_MODEL = "claude-sonnet-4-6";
