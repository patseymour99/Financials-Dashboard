import Anthropic from "@anthropic-ai/sdk";
import { ANTHROPIC_MODEL } from "@/lib/constants";
import { BriefingRequest, FundData, MarketIndex, MetricAsset, NewsItem } from "@/lib/types";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function fmt(n: number, dp = 2) {
  return n.toFixed(dp);
}
function pct(n: number) {
  return `${n >= 0 ? "+" : ""}${fmt(n)}%`;
}

function formatFundSummary(fundData: FundData[]): string {
  return fundData
    .map((fd) => {
      const q = fd.quote;
      if (!q) return `${fd.fund.name}: Data unavailable`;
      const top5 = fd.holdings
        .slice(0, 5)
        .map((h) => `  - ${h.name} (${h.ticker}): $${fmt(h.price)} ${pct(h.changePercent)}`)
        .join("\n");
      return `${fd.fund.name}:
  NAV: ${q.currency} ${fmt(q.price)} | Change: ${pct(q.changePercent)} (${q.change >= 0 ? "+" : ""}${fmt(q.change)}) | As of: ${q.navDate ?? "today"}
  Top Holdings:\n${top5}`;
    })
    .join("\n\n");
}

function formatIndices(indices: MarketIndex[]): string {
  return indices
    .map((i) => `${i.name}: ${fmt(i.price)} (${pct(i.changePercent)})`)
    .join("  |  ");
}

function formatMetrics(metrics: MetricAsset[]): string {
  if (!metrics.length) return "Not available";
  return metrics
    .map((m) => {
      const mtd = m.mtdReturn != null ? pct(m.mtdReturn) : "—";
      const ytd = m.ytdReturn != null ? pct(m.ytdReturn) : "—";
      const price = m.isYield
        ? `${fmt(m.price)}%`
        : `${m.price > 1000 ? m.price.toLocaleString("en-US", { maximumFractionDigits: 0 }) : fmt(m.price)}`;
      return `  ${m.name.padEnd(16)} ${price.padEnd(12)} Day: ${pct(m.changePercent).padEnd(10)} MTD: ${mtd.padEnd(10)} YTD: ${ytd}`;
    })
    .join("\n");
}

function formatNewsSection(news: NewsItem[], label: string): string {
  if (!news.length) return `${label}: No recent news.`;
  return `${label}:\n${news.slice(0, 6).map((n) => `  - [${n.publisher}] ${n.title}`).join("\n")}`;
}

function buildPrompt(data: BriefingRequest): string {
  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  return `You are a senior portfolio analyst preparing a morning briefing for a fund manager covering:
1. BGF World Financials Fund — global financials equity (UCITS)
2. iShares FinTech Active ETF (BPAY) — actively managed fintech (NYSE Arca)

Today is ${today}. Be concise, insightful, and directly actionable.

=== LIVE MARKET DATA ===
${formatIndices(data.indices)}

=== PERFORMANCE TABLE ===
${"Asset".padEnd(16)} ${"Price".padEnd(12)} ${"Day".padEnd(10)} ${"MTD".padEnd(10)} YTD
${formatMetrics(data.metrics)}

=== FUND NAVs ===
${formatFundSummary(data.fundData)}

=== NEWS ===
${formatNewsSection(data.news.market, "Broad Market")}

${formatNewsSection(data.news.sector, "Financial Sector")}

${formatNewsSection(data.news.portfolio, "Portfolio Companies")}

=== REQUIRED OUTPUT FORMAT ===

## Morning Briefing — ${today}

### Executive Summary
(2–3 sentences — the single most important thing to know right now)

### Market Conditions
(Key macro themes, rate/yield moves, risk sentiment affecting financials & fintech)

### BGF World Financials — Update
(NAV context, sector drivers, holdings of note, risk factors)

### iShares FinTech Active ETF (BPAY) — Update
(NAV context, fintech themes, holdings of note, risk factors)

### Performance Context
(How MTD/YTD numbers compare to broad market; any notable divergence)

### Key News & Themes
(Top 3–4 stories with direct implications for these funds)

### Portfolio Companies in Focus
(Any notable moves, earnings, or news from holdings worth acting on)

### Risk Watch
(What to monitor today — data releases, central bank, earnings, geopolitics)

### Today's Priorities
(3 bullet-point action items for the fund manager)`;
}

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response("ANTHROPIC_API_KEY not configured", { status: 500 });
  }

  try {
    const data: BriefingRequest = await req.json();
    const stream = await client.messages.stream({
      model: ANTHROPIC_MODEL,
      max_tokens: 2048,
      messages: [{ role: "user", content: buildPrompt(data) }],
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
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
      },
    });
  } catch (err) {
    console.error("Briefing error:", err);
    return new Response("Failed to generate briefing", { status: 500 });
  }
}
