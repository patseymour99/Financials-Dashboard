"use client";

import { NewsItem } from "@/lib/types";
import { ExternalLink, Clock } from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";

interface NewsPanelProps {
  title: string;
  items: NewsItem[];
  accentColor: string;
}

function NewsPanel({ title, items, accentColor }: NewsPanelProps) {
  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <span
          className="w-1 h-5 rounded-full"
          style={{ backgroundColor: accentColor }}
        />
        <h3 className="text-white font-semibold text-sm">{title}</h3>
        <span className="ml-auto text-gray-600 text-xs">{items.length} stories</span>
      </div>
      <div className="flex flex-col gap-3">
        {items.length === 0 && (
          <p className="text-gray-600 text-sm">No news available</p>
        )}
        {items.map((item) => (
          <a
            key={item.uuid}
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col gap-1 hover:bg-gray-800/50 rounded-xl p-2.5 -mx-2.5 transition-colors"
          >
            <p className="text-white text-sm font-medium leading-snug group-hover:text-blue-400 transition-colors line-clamp-3">
              {item.title}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-gray-500 text-xs font-medium">
                {item.publisher}
              </span>
              <span className="text-gray-700">·</span>
              <span className="flex items-center gap-1 text-gray-600 text-xs">
                <Clock className="w-3 h-3" />
                {(() => {
                  try {
                    return formatDistanceToNow(parseISO(item.publishedAt), {
                      addSuffix: true,
                    });
                  } catch {
                    return "recently";
                  }
                })()}
              </span>
              <ExternalLink className="w-3 h-3 text-gray-700 group-hover:text-gray-500 ml-auto transition-colors" />
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

interface Props {
  news: {
    market: NewsItem[];
    sector: NewsItem[];
    portfolio: NewsItem[];
  };
}

export function NewsSection({ news }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <NewsPanel
        title="Broad Market"
        items={news.market}
        accentColor="#3b82f6"
      />
      <NewsPanel
        title="Financial Sector"
        items={news.sector}
        accentColor="#f59e0b"
      />
      <NewsPanel
        title="Portfolio Companies"
        items={news.portfolio}
        accentColor="#6366f1"
      />
    </div>
  );
}
