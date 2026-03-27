import { FundConfig } from "./types";

export const FUNDS: FundConfig[] = [
  {
    id: "bgf-world-financials",
    name: "BGF World Financials Fund",
    shortName: "BGF World Financials",
    ticker: "BGF-WFIN",
    isin: "LU0106831901", // A2 USD share class
    // Override with BGF_PRODUCT_ID env var to switch share class:
    //   A2 EUR: 229935  |  A2 USD: 229936  |  D2 USD: 229939
    blackrockProductId: process.env.BGF_PRODUCT_ID || "229936",
    blackrockRegion: "uk",
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
    name: "iShares FinTech Active ETF",
    shortName: "iShares FinTech",
    ticker: "BPAY",
    // No ISIN — this is a US-listed ETF on NYSE Arca
    blackrockProductId: "329128",
    blackrockRegion: "us",
    currency: "USD",
    description:
      "iShares FinTech Active ETF (BPAY) — actively managed exposure to companies driving financial technology innovation. NYSE Arca.",
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

// Yahoo Finance ticker formats:
//   forex  → "EURUSD=X"   (=X suffix required)
//   crypto → "BTC-USD"    (hyphen, not no separator)
//   futures→ "CL=F"       (=F suffix)
//   index  → "^GSPC" etc. (caret prefix)
export const MARKET_INDICES = [
  { ticker: "^GSPC",     name: "S&P 500"   },
  { ticker: "^DJI",      name: "Dow Jones"  },
  { ticker: "^IXIC",     name: "Nasdaq"     },
  { ticker: "^FTSE",     name: "FTSE 100"   },
  { ticker: "^TNX",      name: "10Y Yield"  },
  { ticker: "BTC-USD",   name: "Bitcoin"    },
  { ticker: "GC=F",      name: "Gold"       },
  { ticker: "EURUSD=X",  name: "EUR/USD"    },
  { ticker: "^VIX",      name: "VIX"        },
];

export const NEWS_QUERIES = {
  market: "stock market financial news today",
  sector: "financial sector banking fintech news",
  portfolio: "JPMorgan Visa Mastercard PayPal fintech banking earnings",
};

export const ANTHROPIC_MODEL = "claude-sonnet-4-6";
