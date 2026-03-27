"use client";

import { NewsItem } from "@/lib/types";
import { formatDistanceToNow, parseISO } from "date-fns";

interface PanelProps {
  title: string;
  accentColor: string;
  items: NewsItem[];
}

function NewsPanel({ title, accentColor, items }: PanelProps) {
  return (
    <div
      className="rounded-xl border flex flex-col overflow-hidden"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2.5 px-4 py-3 border-b"
        style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}
      >
        <span className="w-1 h-4 rounded-full" style={{ background: accentColor }} />
        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-2)" }}>
          {title}
        </span>
        <span
          className="ml-auto text-xs tabnum px-1.5 py-0.5 rounded"
          style={{ color: "var(--text-3)", background: "var(--surface-3)" }}
        >
          {items.length}
        </span>
      </div>

      {/* Items */}
      <div className="flex-1 divide-y" style={{ borderColor: "var(--border)" }}>
        {items.length === 0 && (
          <p className="px-4 py-6 text-xs text-center" style={{ color: "var(--text-3)" }}>
            No stories available
          </p>
        )}
        {items.map((item) => (
          <a
            key={item.uuid}
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col gap-1.5 px-4 py-3 transition-colors group"
            style={{ borderColor: "var(--border)" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "")}
          >
            <p
              className="text-xs font-medium leading-snug line-clamp-3 group-hover:text-white transition-colors"
              style={{ color: "var(--text-1)" }}
            >
              {item.title}
            </p>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium" style={{ color: accentColor }}>
                {item.publisher}
              </span>
              <span style={{ color: "var(--text-3)" }}>·</span>
              <span className="text-xs" style={{ color: "var(--text-3)" }}>
                {(() => {
                  try {
                    return formatDistanceToNow(parseISO(item.publishedAt), { addSuffix: true });
                  } catch { return "recently"; }
                })()}
              </span>
              <span className="ml-auto text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ color: "var(--text-3)" }}>
                ↗
              </span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

interface Props {
  news: { market: NewsItem[]; sector: NewsItem[]; portfolio: NewsItem[] };
}

export function NewsSection({ news }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <NewsPanel title="Broad Market"        accentColor="#3b82f6" items={news.market} />
      <NewsPanel title="Financial Sector"    accentColor="#f59e0b" items={news.sector} />
      <NewsPanel title="Portfolio Companies" accentColor="#818cf8" items={news.portfolio} />
    </div>
  );
}
