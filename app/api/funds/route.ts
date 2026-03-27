import { NextResponse } from "next/server";
import yahooFinance from "yahoo-finance2";
import { FUNDS, MARKET_INDICES } from "@/lib/constants";
import {
  FundQuote,
  HoldingQuote,
  MarketIndex,
  HistoricalPoint,
  FundData,
} from "@/lib/types";

async function getQuote(ticker: string): Promise<FundQuote | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = (await yahooFinance.quote(ticker)) as any;
    if (!result) return null;
    return {
      ticker,
      name: result.longName || result.shortName || ticker,
      price: result.regularMarketPrice ?? 0,
      change: result.regularMarketChange ?? 0,
      changePercent: result.regularMarketChangePercent ?? 0,
      previousClose: result.regularMarketPreviousClose ?? 0,
      open: result.regularMarketOpen ?? 0,
      dayHigh: result.regularMarketDayHigh ?? 0,
      dayLow: result.regularMarketDayLow ?? 0,
      volume: result.regularMarketVolume ?? 0,
      marketCap: result.marketCap,
      currency: result.currency || "USD",
      exchange: result.fullExchangeName,
      ytdReturn: result.ytdReturn,
      expenseRatio: result.annualReportExpenseRatio,
    };
  } catch {
    return null;
  }
}

async function getHistory(ticker: string): Promise<HistoricalPoint[]> {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 90);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results: any[] = await (yahooFinance.historical as any)(ticker, {
      period1: thirtyDaysAgo.toISOString().split("T")[0],
      interval: "1d",
    });
    return results.map((r) => ({
      date: new Date(r.date).toISOString().split("T")[0],
      close: r.close,
    }));
  } catch {
    return [];
  }
}

async function getHoldingQuotes(
  holdings: { ticker: string; name: string; weight?: number }[]
): Promise<HoldingQuote[]> {
  const results = await Promise.allSettled(
    holdings.map(async (h) => {
      const q = await getQuote(h.ticker);
      if (!q) {
        return {
          ticker: h.ticker,
          name: h.name,
          price: 0,
          change: 0,
          changePercent: 0,
          previousClose: 0,
          open: 0,
          dayHigh: 0,
          dayLow: 0,
          volume: 0,
          currency: "USD",
          fundWeight: h.weight,
          error: "Data unavailable",
        } as HoldingQuote;
      }
      return { ...q, fundWeight: h.weight } as HoldingQuote;
    })
  );

  return results.map((r, i) => {
    if (r.status === "fulfilled") return r.value;
    return {
      ticker: holdings[i].ticker,
      name: holdings[i].name,
      price: 0,
      change: 0,
      changePercent: 0,
      previousClose: 0,
      open: 0,
      dayHigh: 0,
      dayLow: 0,
      volume: 0,
      currency: "USD",
      fundWeight: holdings[i].weight,
      error: "Fetch failed",
    } as HoldingQuote;
  });
}

async function getMarketIndices(): Promise<MarketIndex[]> {
  const results = await Promise.allSettled(
    MARKET_INDICES.map(async (idx) => {
      const q = await getQuote(idx.ticker);
      if (!q) {
        return {
          ticker: idx.ticker,
          name: idx.name,
          price: 0,
          change: 0,
          changePercent: 0,
          currency: "USD",
        } as MarketIndex;
      }
      return {
        ticker: idx.ticker,
        name: idx.name,
        price: q.price,
        change: q.change,
        changePercent: q.changePercent,
        currency: q.currency,
      } as MarketIndex;
    })
  );

  return results
    .filter((r) => r.status === "fulfilled")
    .map((r) => (r as PromiseFulfilledResult<MarketIndex>).value);
}

export async function GET() {
  try {
    const [indicesResult, ...fundResults] = await Promise.allSettled([
      getMarketIndices(),
      ...FUNDS.map(async (fund): Promise<FundData> => {
        const [quote, history, holdings] = await Promise.allSettled([
          getQuote(fund.ticker),
          getHistory(fund.ticker),
          getHoldingQuotes(fund.holdings),
        ]);

        return {
          fund,
          quote:
            quote.status === "fulfilled"
              ? (quote.value as FundQuote)
              : null,
          history:
            history.status === "fulfilled" ? history.value : [],
          holdings:
            holdings.status === "fulfilled" ? holdings.value : [],
        };
      }),
    ]);

    const indices =
      indicesResult.status === "fulfilled" ? indicesResult.value : [];

    const funds = fundResults.map((r, i) => {
      if (r.status === "fulfilled") return r.value as FundData;
      return {
        fund: FUNDS[i],
        quote: null,
        history: [],
        holdings: [],
      } as FundData;
    });

    return NextResponse.json({
      funds,
      indices,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Fund data fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch fund data" },
      { status: 500 }
    );
  }
}
