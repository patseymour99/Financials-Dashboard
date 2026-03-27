"use client";

import { useState, useRef } from "react";
import { Sparkles, RefreshCw, ChevronDown, ChevronUp, AlertCircle } from "lucide-react";
import { BriefingRequest } from "@/lib/types";

interface Props {
  data: BriefingRequest;
}

// Simple markdown renderer for the briefing output
function renderMarkdown(text: string) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith("## ")) {
      elements.push(
        <h2
          key={i}
          className="text-xl font-bold text-white mt-6 mb-3 pb-2 border-b border-gray-700 first:mt-0"
        >
          {line.slice(3)}
        </h2>
      );
    } else if (line.startsWith("### ")) {
      elements.push(
        <h3
          key={i}
          className="text-base font-semibold text-indigo-300 mt-5 mb-2"
        >
          {line.slice(4)}
        </h3>
      );
    } else if (line.startsWith("#### ")) {
      elements.push(
        <h4
          key={i}
          className="text-sm font-semibold text-gray-300 mt-4 mb-1.5"
        >
          {line.slice(5)}
        </h4>
      );
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      const items = [line.slice(2)];
      while (
        i + 1 < lines.length &&
        (lines[i + 1].startsWith("- ") || lines[i + 1].startsWith("* "))
      ) {
        i++;
        items.push(lines[i].slice(2));
      }
      elements.push(
        <ul key={i} className="list-none space-y-1.5 my-2 ml-0">
          {items.map((item, j) => (
            <li
              key={j}
              className="flex gap-2 text-gray-300 text-sm leading-relaxed"
            >
              <span className="text-indigo-400 mt-1.5 flex-shrink-0">▸</span>
              <span dangerouslySetInnerHTML={{ __html: applyInline(item) }} />
            </li>
          ))}
        </ul>
      );
    } else if (line.startsWith("**") && line.endsWith("**") && line.length > 4) {
      elements.push(
        <p key={i} className="font-semibold text-white text-sm my-1">
          {line.slice(2, -2)}
        </p>
      );
    } else if (line.trim() === "") {
      elements.push(<div key={i} className="h-1" />);
    } else if (line.trim()) {
      elements.push(
        <p
          key={i}
          className="text-gray-300 text-sm leading-relaxed my-1"
          dangerouslySetInnerHTML={{ __html: applyInline(line) }}
        />
      );
    }
    i++;
  }
  return elements;
}

function applyInline(text: string): string {
  // Bold
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong class="text-white">$1</strong>');
  // Italic
  text = text.replace(/\*(.+?)\*/g, '<em class="text-gray-200">$1</em>');
  // Backticks
  text = text.replace(
    /`(.+?)`/g,
    '<code class="bg-gray-700 text-emerald-300 px-1 py-0.5 rounded text-xs font-mono">$1</code>'
  );
  return text;
}

export function AIBriefing({ data }: Props) {
  const [briefing, setBriefing] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(true);
  const [generated, setGenerated] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  async function generateBriefing() {
    if (loading) {
      abortRef.current?.abort();
      return;
    }

    setLoading(true);
    setError("");
    setBriefing("");
    setExpanded(true);
    setGenerated(false);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        signal: controller.signal,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setBriefing(acc);
      }
      setGenerated(true);
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError((err as Error).message || "Failed to generate briefing");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-800">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-white font-semibold text-sm">
            AI Morning Briefing
          </h2>
          <p className="text-gray-500 text-xs">
            Powered by Claude — full analysis of your funds & market context
          </p>
        </div>
        <div className="flex items-center gap-2">
          {generated && (
            <button
              onClick={() => setExpanded((e) => !e)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            >
              {expanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          )}
          <button
            onClick={generateBriefing}
            disabled={false}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              loading
                ? "bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30"
                : "bg-indigo-500 hover:bg-indigo-600 text-white"
            }`}
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
            />
            {loading
              ? "Stop"
              : generated
                ? "Regenerate"
                : "Generate Briefing"}
          </button>
        </div>
      </div>

      {/* Content */}
      {!briefing && !loading && !error && (
        <div className="px-6 py-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-gray-800 flex items-center justify-center mx-auto mb-3">
            <Sparkles className="w-6 h-6 text-gray-600" />
          </div>
          <p className="text-gray-500 text-sm">
            Click &quot;Generate Briefing&quot; to get a comprehensive AI
            analysis of your funds, portfolio companies, and market conditions.
          </p>
        </div>
      )}

      {error && (
        <div className="px-6 py-4 flex items-start gap-2 text-red-400">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium">Failed to generate briefing</p>
            <p className="text-xs text-red-500 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {(briefing || loading) && expanded && (
        <div className="px-6 py-5">
          {renderMarkdown(briefing)}
          {loading && (
            <span className="inline-block w-0.5 h-4 bg-indigo-400 animate-pulse ml-0.5 rounded-full" />
          )}
        </div>
      )}

      {briefing && !expanded && (
        <div
          className="px-6 py-3 text-gray-500 text-xs cursor-pointer hover:text-gray-400 transition-colors"
          onClick={() => setExpanded(true)}
        >
          Click to expand briefing ↓
        </div>
      )}
    </div>
  );
}
