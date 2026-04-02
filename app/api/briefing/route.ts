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
  Price: ${q.currency} ${fmt(q.price)} | Change: ${pct(q.changePercent)} (${q.change >= 0 ? "+" : ""}${fmt(q.change)}) | As of: ${q.navDate ?? "today"}
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

  const fundDescriptions = data.fundData
    .map((fd, i) => `${i + 1}. ${fd.fund.name} — ${fd.fund.description}`)
    .join("\n");

  const fundNames = data.fundData.map((fd) => fd.fund.shortName).join(" · ");

  // Infer sector from fund data
  const sector = data.fundData[0]?.fund.sector ?? "equity";
  const sectorLabel = sector.charAt(0).toUpperCase() + sector.slice(1);

  return `You are a senior product specialist at an asset management firm preparing a sector intelligence briefing for ${today}.

Your coverage:
${fundDescriptions}

Think in three layers — work top-down:
1. What broad macro forces are shaping markets right now?
2. How do those forces specifically impact the ${sectorLabel} sector?
3. What does this mean for these specific funds and their holdings?

=== LIVE MARKET DATA ===
${formatIndices(data.indices)}

=== PERFORMANCE TABLE (Day / MTD / YTD) ===
${"Asset".padEnd(16)} ${"Price".padEnd(12)} ${"Day".padEnd(10)} ${"MTD".padEnd(10)} YTD
${formatMetrics(data.metrics)}

=== FUND DATA ===
${formatFundSummary(data.fundData)}

=== NEWS ===
${formatNewsSection(data.news.market, "Broad Market")}

${formatNewsSection(data.news.sector, `${sectorLabel} Sector`)}

${formatNewsSection(data.news.portfolio, "Portfolio Companies")}

=== OUTPUT FORMAT (follow exactly) ===

## ${sectorLabel} Sector Intelligence — ${today}

### What's Driving Markets
(2–3 sentences on the dominant macro theme right now — rates, risk sentiment, growth vs value, geopolitics. Be specific: cite actual index moves, yield levels, or macro data from the table above.)

### What's Driving ${sectorLabel}
(The 2–3 sector-specific catalysts or headwinds most relevant today. How does the macro above translate into this sector? Name the key themes — e.g. for Tech: AI capex cycle, semis pricing; for Healthcare: GLP-1 momentum, approval pipeline; for Financials: yield curve, credit spreads.)

### ${data.fundData[0]?.fund.shortName ?? "Fund 1"} — What to Watch
(Price context, key holdings driving performance, sector themes playing out in this fund. 3–5 sentences.)

### ${data.fundData[1]?.fund.shortName ?? "Fund 2"} — What to Watch
(Same structure as above for the second fund.)

### Holdings in Focus
(2–3 specific stocks from the holdings that are most relevant to the sector themes above — what's moving and why.)

### Risk Factors
(Top 2–3 risks to monitor: data releases, central bank, earnings, regulatory, geopolitical. Be specific and time-bound where possible.)

### Today's Priorities
- (Action item 1 — specific and tied to the data above)
- (Action item 2)
- (Action item 3)

Funds covered: ${fundNames}. Be concise, analytical, and directly tied to the data provided. Avoid generic observations.`;
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
