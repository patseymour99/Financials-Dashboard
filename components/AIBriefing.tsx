"use client";

import { useState, useRef } from "react";
import { BriefingRequest } from "@/lib/types";

interface Props { data: BriefingRequest | null }

function renderMarkdown(text: string): React.ReactNode[] {
  const elements: React.ReactNode[] = [];
  const lines = text.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith("## ")) {
      elements.push(
        <h2 key={i} className="text-base font-bold mt-5 mb-2 pb-1.5 border-b first:mt-0"
          style={{ color: "var(--text-1)", borderColor: "var(--border-2)" }}>
          {line.slice(3)}
        </h2>
      );
    } else if (line.startsWith("### ")) {
      elements.push(
        <h3 key={i} className="text-sm font-semibold mt-4 mb-1.5" style={{ color: "var(--indigo)" }}>
          {line.slice(4)}
        </h3>
      );
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      const bullets: string[] = [line.slice(2)];
      while (i + 1 < lines.length && (lines[i + 1].startsWith("- ") || lines[i + 1].startsWith("* "))) {
        i++;
        bullets.push(lines[i].slice(2));
      }
      elements.push(
        <ul key={i} className="space-y-1 my-1.5">
          {bullets.map((b, j) => (
            <li key={j} className="flex gap-2 text-xs leading-relaxed" style={{ color: "var(--text-2)" }}>
              <span className="mt-1 shrink-0" style={{ color: "var(--indigo)" }}>›</span>
              <span dangerouslySetInnerHTML={{ __html: inlineFormat(b) }} />
            </li>
          ))}
        </ul>
      );
    } else if (line.trim() === "") {
      elements.push(<div key={i} className="h-0.5" />);
    } else if (line.trim()) {
      elements.push(
        <p key={i} className="text-xs leading-relaxed my-1" style={{ color: "var(--text-2)" }}
          dangerouslySetInnerHTML={{ __html: inlineFormat(line) }} />
      );
    }
    i++;
  }
  return elements;
}

function inlineFormat(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, `<strong style="color:var(--text-1)">$1</strong>`)
    .replace(/\*(.+?)\*/g, `<em style="color:var(--text-2)">$1</em>`)
    .replace(/`(.+?)`/g,
      `<code style="background:var(--surface-3);color:#86efac;padding:0 4px;border-radius:3px;font-size:11px">$1</code>`);
}

export function AIBriefing({ data }: Props) {
  const [briefing, setBriefing] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [expanded, setExpanded] = useState(true);
  const [generated, setGenerated] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  async function generate() {
    if (loading) { abortRef.current?.abort(); return; }
    if (!data)   return;

    setLoading(true); setError(""); setBriefing(""); setExpanded(true); setGenerated(false);
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const res = await fetch("/api/briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        signal: ctrl.signal,
      });
      if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const dec = new TextDecoder();
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        setBriefing(acc);
      }
      setGenerated(true);
    } catch (e) {
      if ((e as Error).name !== "AbortError") setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-5 py-3.5 border-b"
        style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}
      >
        {/* Icon */}
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-sm"
          style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)" }}
        >
          ✦
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>AI Morning Briefing</p>
          <p className="text-xs" style={{ color: "var(--text-3)" }}>
            Powered by Claude · Full fund analysis, news synthesis &amp; daily agenda
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {generated && (
            <button
              onClick={() => setExpanded((e) => !e)}
              className="text-xs px-2.5 py-1 rounded border transition-colors"
              style={{ color: "var(--text-3)", borderColor: "var(--border-2)", background: "var(--surface-3)" }}
            >
              {expanded ? "Collapse ↑" : "Expand ↓"}
            </button>
          )}
          <button
            onClick={generate}
            className="text-xs font-semibold px-3.5 py-1.5 rounded transition-all"
            style={
              loading
                ? { background: "rgba(239,68,68,0.12)", color: "var(--red)", border: "1px solid rgba(239,68,68,0.3)" }
                : { background: "linear-gradient(135deg,#4f46e5,#7c3aed)", color: "#fff", border: "1px solid transparent" }
            }
          >
            {loading ? "■ Stop" : generated ? "↺ Regenerate" : "Generate Briefing"}
          </button>
        </div>
      </div>

      {/* Body */}
      {!briefing && !loading && !error && (
        <div className="flex flex-col items-center justify-center py-10 gap-2">
          <p className="text-2xl opacity-20">✦</p>
          <p className="text-xs text-center max-w-xs" style={{ color: "var(--text-3)" }}>
            Click <strong style={{ color: "var(--text-2)" }}>Generate Briefing</strong> to get a comprehensive
            AI analysis of your funds, portfolio companies, market conditions, and a daily agenda.
          </p>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 px-5 py-4 text-xs" style={{ color: "var(--red)" }}>
          <span>⚠</span>
          <div>
            <p className="font-medium">Failed to generate briefing</p>
            <p className="mt-0.5 opacity-70">{error}</p>
          </div>
        </div>
      )}

      {(briefing || loading) && expanded && (
        <div className="px-6 py-5 max-h-[70vh] overflow-y-auto">
          {renderMarkdown(briefing)}
          {loading && (
            <span
              className="inline-block w-0.5 h-3.5 ml-0.5 animate-pulse rounded-full"
              style={{ background: "var(--indigo)" }}
            />
          )}
        </div>
      )}

      {briefing && !expanded && (
        <div
          className="px-5 py-2.5 text-xs cursor-pointer hover:opacity-80 transition-opacity"
          style={{ color: "var(--text-3)" }}
          onClick={() => setExpanded(true)}
        >
          Click to read briefing ↓
        </div>
      )}
    </div>
  );
}
