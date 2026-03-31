import { FundConfig, SectorConfig } from "./types";

export const SECTORS: SectorConfig[] = [
  {
    id: "financials",
    name: "Financials",
    color: "#f59e0b",
    description: "Global financial sector equities — banks, insurers, payments & fintech",
  },
  {
    id: "technology",
    name: "Technology",
    color: "#3b82f6",
    description: "Global technology equities — semiconductors, software, platforms & AI",
  },
  {
    id: "healthcare",
    name: "Healthcare",
    color: "#22c55e",
    description: "Global healthcare equities — pharmaceuticals, biotech, medical devices & services",
  },
];

export const FUNDS: FundConfig[] = [
  // ── Financials ────────────────────────────────────────────────────────────
  {
    id: "bgf-world-financials",
    name: "BGF World Financials Fund",
    shortName: "BGF World Financials",
    ticker: "BGF-WFIN",
    isin: "LU0106831901", // A2 USD share class
    dataSource: "blackrock",
    // Override with BGF_PRODUCT_ID env var to switch share class:
    //   A2 EUR: 229935  |  A2 USD: 229936  |  D2 USD: 229939
    blackrockProductId: process.env.BGF_PRODUCT_ID || "229936",
    blackrockRegion: "uk",
    currency: "USD",
    description:
      "BlackRock Global Funds World Financials Fund — actively managed exposure to global financial sector equities.",
    color: "#f59e0b",
    sector: "financials",
    holdings: [
      { ticker: "JPM",   name: "JPMorgan Chase",       weight: 9.2 },
      { ticker: "BRK-B", name: "Berkshire Hathaway",   weight: 7.8 },
      { ticker: "V",     name: "Visa",                 weight: 6.1 },
      { ticker: "MA",    name: "Mastercard",           weight: 5.4 },
      { ticker: "BAC",   name: "Bank of America",      weight: 4.9 },
      { ticker: "WFC",   name: "Wells Fargo",          weight: 3.8 },
      { ticker: "GS",    name: "Goldman Sachs",        weight: 3.5 },
      { ticker: "MS",    name: "Morgan Stanley",       weight: 3.2 },
      { ticker: "AXP",   name: "American Express",     weight: 2.9 },
      { ticker: "C",     name: "Citigroup",            weight: 2.7 },
    ],
  },
  {
    id: "ishares-fintech",
    name: "iShares FinTech Active ETF",
    shortName: "iShares FinTech",
    ticker: "BPAY",
    dataSource: "blackrock",
    blackrockProductId: "329128",
    blackrockRegion: "us",
    currency: "USD",
    description:
      "iShares FinTech Active ETF (BPAY) — actively managed exposure to companies driving financial technology innovation. NYSE Arca.",
    color: "#6366f1",
    sector: "financials",
    holdings: [
      { ticker: "V",     name: "Visa",                    weight: 8.5 },
      { ticker: "MA",    name: "Mastercard",              weight: 7.9 },
      { ticker: "PYPL",  name: "PayPal",                  weight: 5.2 },
      { ticker: "SQ",    name: "Block",                   weight: 4.8 },
      { ticker: "FISV",  name: "Fiserv",                  weight: 4.3 },
      { ticker: "FIS",   name: "Fidelity National Info",  weight: 4.0 },
      { ticker: "GPN",   name: "Global Payments",         weight: 3.6 },
      { ticker: "NU",    name: "Nu Holdings",             weight: 3.3 },
      { ticker: "AFRM",  name: "Affirm",                  weight: 2.8 },
      { ticker: "SOFI",  name: "SoFi Technologies",       weight: 2.5 },
    ],
  },

  // ── Technology ────────────────────────────────────────────────────────────
  {
    id: "bgf-world-technology",
    name: "BGF World Technology Fund",
    shortName: "BGF World Technology",
    ticker: "BGF-WTECH",
    // ISIN: LU0171307173 (A2 USD share class)
    isin: "LU0171307173",
    dataSource: "blackrock",
    // Set BGF_TECH_PRODUCT_ID env var with the correct BlackRock product ID.
    // Visit blackrock.com/uk → Products → search "BGF World Technology" to find it.
    blackrockProductId: process.env.BGF_TECH_PRODUCT_ID || "229979",
    blackrockRegion: "uk",
    currency: "USD",
    description:
      "BlackRock Global Funds World Technology Fund — actively managed exposure to global technology sector equities.",
    color: "#3b82f6",
    sector: "technology",
    holdings: [
      { ticker: "NVDA",  name: "NVIDIA",            weight: 10.2 },
      { ticker: "AAPL",  name: "Apple",             weight: 9.8 },
      { ticker: "MSFT",  name: "Microsoft",         weight: 9.1 },
      { ticker: "META",  name: "Meta Platforms",    weight: 6.3 },
      { ticker: "AMZN",  name: "Amazon",            weight: 5.9 },
      { ticker: "GOOGL", name: "Alphabet",          weight: 5.4 },
      { ticker: "TSLA",  name: "Tesla",             weight: 4.2 },
      { ticker: "AVGO",  name: "Broadcom",          weight: 3.8 },
      { ticker: "ASML",  name: "ASML Holding",      weight: 3.3 },
      { ticker: "AMD",   name: "Advanced Micro Dev", weight: 2.9 },
    ],
  },
  {
    id: "ishares-expanded-tech",
    name: "iShares Expanded Tech Sector ETF",
    shortName: "iShares Tech (IGM)",
    ticker: "IGM",
    dataSource: "yahoo",
    currency: "USD",
    description:
      "iShares Expanded Tech Sector ETF (IGM) — broad exposure to US technology and internet companies. NYSE Arca.",
    color: "#7c3aed",
    sector: "technology",
    holdings: [
      { ticker: "NVDA",  name: "NVIDIA",            weight: 9.5 },
      { ticker: "AAPL",  name: "Apple",             weight: 8.9 },
      { ticker: "MSFT",  name: "Microsoft",         weight: 8.4 },
      { ticker: "META",  name: "Meta Platforms",    weight: 5.8 },
      { ticker: "AMZN",  name: "Amazon",            weight: 5.2 },
      { ticker: "GOOGL", name: "Alphabet",          weight: 4.9 },
      { ticker: "TSLA",  name: "Tesla",             weight: 3.8 },
      { ticker: "AVGO",  name: "Broadcom",          weight: 3.4 },
      { ticker: "ORCL",  name: "Oracle",            weight: 3.1 },
      { ticker: "AMD",   name: "Advanced Micro Dev", weight: 2.7 },
    ],
  },

  // ── Healthcare ────────────────────────────────────────────────────────────
  {
    id: "bgf-world-healthscience",
    name: "BGF World Healthscience Fund",
    shortName: "BGF World Healthscience",
    ticker: "BGF-WHLT",
    isin: "LU0171307068", // A2 USD share class
    dataSource: "blackrock",
    // Set BGF_HEALTH_PRODUCT_ID env var with the correct BlackRock product ID.
    // Visit blackrock.com/uk → Products → search "BGF World Healthscience" to find it.
    blackrockProductId: process.env.BGF_HEALTH_PRODUCT_ID || "229937",
    blackrockRegion: "uk",
    currency: "USD",
    description:
      "BlackRock Global Funds World Healthscience Fund — actively managed exposure to global healthcare and life sciences equities.",
    color: "#22c55e",
    sector: "healthcare",
    holdings: [
      { ticker: "LLY",   name: "Eli Lilly",              weight: 9.4 },
      { ticker: "UNH",   name: "UnitedHealth Group",     weight: 8.1 },
      { ticker: "NVO",   name: "Novo Nordisk",           weight: 7.6 },
      { ticker: "JNJ",   name: "Johnson & Johnson",      weight: 6.2 },
      { ticker: "ABBV",  name: "AbbVie",                 weight: 5.8 },
      { ticker: "MRK",   name: "Merck",                  weight: 5.3 },
      { ticker: "TMO",   name: "Thermo Fisher Scientific", weight: 4.4 },
      { ticker: "ABT",   name: "Abbott Laboratories",    weight: 3.9 },
      { ticker: "PFE",   name: "Pfizer",                 weight: 3.5 },
      { ticker: "AMGN",  name: "Amgen",                  weight: 3.1 },
    ],
  },
  {
    id: "ishares-global-healthcare",
    name: "iShares Global Healthcare ETF",
    shortName: "iShares Healthcare (IXJ)",
    ticker: "IXJ",
    dataSource: "yahoo",
    currency: "USD",
    description:
      "iShares Global Healthcare ETF (IXJ) — exposure to global healthcare equipment, services, pharmaceuticals and biotech. NYSE Arca.",
    color: "#0d9488",
    sector: "healthcare",
    holdings: [
      { ticker: "LLY",   name: "Eli Lilly",              weight: 8.7 },
      { ticker: "UNH",   name: "UnitedHealth Group",     weight: 7.9 },
      { ticker: "JNJ",   name: "Johnson & Johnson",      weight: 7.2 },
      { ticker: "NVO",   name: "Novo Nordisk",           weight: 6.8 },
      { ticker: "ABBV",  name: "AbbVie",                 weight: 5.6 },
      { ticker: "MRK",   name: "Merck",                  weight: 5.1 },
      { ticker: "TMO",   name: "Thermo Fisher Scientific", weight: 4.3 },
      { ticker: "ABT",   name: "Abbott Laboratories",    weight: 3.8 },
      { ticker: "SYK",   name: "Stryker",                weight: 3.4 },
      { ticker: "BSX",   name: "Boston Scientific",      weight: 3.0 },
    ],
  },
];

// News queries per sector
export const SECTOR_NEWS: Record<string, { sector: string; portfolio: string }> = {
  financials: {
    sector: "financial sector banking fintech payments",
    portfolio: "JPMorgan Visa Mastercard PayPal fintech banking earnings",
  },
  technology: {
    sector: "technology sector AI semiconductors software cloud",
    portfolio: "NVIDIA Apple Microsoft Meta Amazon Google AI chips earnings",
  },
  healthcare: {
    sector: "healthcare pharmaceutical biotech medical devices",
    portfolio: "Eli Lilly UnitedHealth Novo Nordisk AbbVie Merck drug approval earnings",
  },
};

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

export const ANTHROPIC_MODEL = "claude-sonnet-4-6";
