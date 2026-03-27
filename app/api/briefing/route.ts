import Anthropic from "@anthropic-ai/sdk";
import { ANTHROPIC_MODEL } from "@/lib/constants";
import { BriefingRequest, FundData, MarketIndex, NewsItem } from "@/lib/types";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

function formatFundSummary(fundData: FundData[]): string {
  return fundData
    .map((fd) => {
      const q = fd.quote;
      const holdingsSummary = fd.holdings
        .slice(0, 5)
        .map(
          (h) =>
            `  - ${h.name} (${h.ticker}): $${h.price.toFixed(2)} ${h.changePercent >= 0 ? "+" : ""}${h.changePercent.toFixed(2)}%`
        )
        .join("\n");

      if (!q) {
        return `${fd.fund.name} (${fd.fund.ticker}): Data unavailable`;
      }

      return `${fd.fund.name} (${fd.fund.ticker}):
  Price: ${q.currency} ${q.price.toFixed(2)} | Change: ${q.changePercent >= 0 ? "+" : ""}${q.changePercent.toFixed(2)}% (${q.change >= 0 ? "+" : ""}${q.change.toFixed(2)})
  Day Range: ${q.dayLow.toFixed(2)} – ${q.dayHigh.toFixed(2)}${q.ytdReturn ? ` | YTD Return: ${(q.ytdReturn * 100).toFixed(2)}%` : ""}
  Top Holdings:
${holdingsSummary}`;
    })
    .join("\n\n");
}

function formatIndices(indices: MarketIndex[]): string {
  return indices
    .map(
      (i) =>
        `${i.name}: ${i.price.toFixed(2)} (${i.changePercent >= 0 ? "+" : ""}${i.changePercent.toFixed(2)}%)`
    )
    .join(" | ");
}

function formatNewsSection(news: NewsItem[], label: string): string {
  if (!news.length) return `${label}: No recent news available.`;
  return `${label}:\n${news
    .slice(0, 6)
    .map((n) => `  - [${n.publisher}] ${n.title}`)
    .join("\n")}`;
}

function buildPrompt(data: BriefingRequest): string {
  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `You are a senior financial analyst preparing a morning briefing for a portfolio manager who covers two funds:
1. BGF World Financials Fund — a global financials equity fund
2. iShares Fintech Active ETF — an actively managed fintech equity ETF

Today is ${today}. Using the data below, produce a structured morning briefing. Be concise, insightful, and actionable. Focus on what matters for these specific funds.

=== MARKET DATA ===
${formatIndices(data.indices)}

=== FUND PERFORMANCE ===
${formatFundSummary(data.fundData)}

=== NEWS ===
${formatNewsSection(data.news.market, "Broad Market News")}

${formatNewsSection(data.news.sector, "Financial Sector News")}

${formatNewsSection(data.news.portfolio, "Portfolio Company News")}

=== BRIEFING FORMAT ===
Please structure your response as follows:

## Morning Briefing — ${today}

### Executive Summary
(2–3 sentences capturing the most important things to know right now)

### Market Overview
(Key market conditions and macro themes affecting financials and fintech)

### BGF World Financials — Fund Update
(Performance context, key drivers, holdings of note, risks)

### iShares Fintech Active ETF — Fund Update
(Performance context, key drivers, holdings of note, risks)

### Key News & Themes
(The most important news stories and their implications for these funds)

### Portfolio Companies in Focus
(Any notable moves or news from holdings that deserve attention today)

### Risk Factors & Watch List
(What to monitor closely today — macro risks, earnings, data releases, etc.)

### Today's Agenda
(Suggested talking points or action items for the portfolio manager)`;
}

export async function POST(req: Request) {
  try {
    const data: BriefingRequest = await req.json();

    if (!process.env.ANTHROPIC_API_KEY) {
      return new Response("ANTHROPIC_API_KEY is not configured", {
        status: 500,
      });
    }

    const prompt = buildPrompt(data);

    const stream = await client.messages.stream({
      model: ANTHROPIC_MODEL,
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });

    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          if (
            chunk.type === "content_block_delta" &&
            chunk.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(chunk.delta.text));
          }
        }
        controller.close();
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Briefing generation error:", error);
    return new Response("Failed to generate briefing", { status: 500 });
  }
}
