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
    ticker: "0P00000AWJ", // Yahoo Finance ticker for A2 USD share class
    isin: "LU0106831901",
    dataSource: "yahoo",
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
    dataSource: "yahoo",
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
    ticker: "0P00000AWU", // Yahoo Finance ticker for A2 USD share class
    isin: "LU0171307173",
    dataSource: "yahoo",
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
    id: "ishares-ai-tech",
    name: "iShares AI Innovation and Tech Active ETF",
    shortName: "iShares AI & Tech (BAI)",
    ticker: "BAI",
    dataSource: "yahoo",
    currency: "USD",
    description:
      "iShares AI Innovation and Tech Active ETF (BAI) — actively managed exposure to companies driving artificial intelligence and technology innovation. NYSE Arca.",
    color: "#7c3aed",
    sector: "technology",
    holdings: [
      { ticker: "NVDA",  name: "NVIDIA",            weight: 10.8 },
      { ticker: "MSFT",  name: "Microsoft",         weight: 9.2 },
      { ticker: "META",  name: "Meta Platforms",    weight: 7.4 },
      { ticker: "GOOGL", name: "Alphabet",          weight: 6.8 },
      { ticker: "AMZN",  name: "Amazon",            weight: 6.1 },
      { ticker: "AVGO",  name: "Broadcom",          weight: 5.3 },
      { ticker: "AMD",   name: "Advanced Micro Dev", weight: 4.7 },
      { ticker: "CRM",   name: "Salesforce",        weight: 3.9 },
      { ticker: "ORCL",  name: "Oracle",            weight: 3.5 },
      { ticker: "PLTR",  name: "Palantir",          weight: 3.1 },
    ],
  },

  // ── Healthcare ────────────────────────────────────────────────────────────
  {
    id: "bgf-world-healthscience",
    name: "BGF World Healthscience Fund",
    shortName: "BGF World Healthscience",
    ticker: "0P00000K03", // Yahoo Finance ticker for A2 USD share class
    isin: "LU0171307068",
    dataSource: "yahoo",
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
    id: "ishares-health-innovation",
    name: "iShares Health Innovation Active ETF",
    shortName: "iShares Health Innovation (BMED)",
    ticker: "BMED",
    dataSource: "yahoo",
    currency: "USD",
    description:
      "iShares Health Innovation Active ETF (BMED) — actively managed exposure to companies driving innovation across healthcare, genomics, medical devices and digital health. NYSE Arca.",
    color: "#0d9488",
    sector: "healthcare",
    holdings: [
      { ticker: "LLY",   name: "Eli Lilly",              weight: 9.1 },
      { ticker: "ISRG",  name: "Intuitive Surgical",     weight: 7.8 },
      { ticker: "DXCM",  name: "DexCom",                 weight: 6.4 },
      { ticker: "BSX",   name: "Boston Scientific",      weight: 5.9 },
      { ticker: "REGN",  name: "Regeneron Pharmaceuticals", weight: 5.3 },
      { ticker: "MRNA",  name: "Moderna",                weight: 4.8 },
      { ticker: "TMO",   name: "Thermo Fisher Scientific", weight: 4.2 },
      { ticker: "ILMN",  name: "Illumina",               weight: 3.7 },
      { ticker: "ABBV",  name: "AbbVie",                 weight: 3.3 },
      { ticker: "VEEV",  name: "Veeva Systems",          weight: 2.9 },
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

export const ANTHROPIC_MODEL = "claude-sonnet-4-6";
