import { useMemo } from "react";
import { hostOf } from "@/lib/kinds";
import { Storage } from "@/lib/storage";
import type { Highlight } from "@/lib/types";
import "./Journey.css";

interface Props {
  highlights: Highlight[];
  onChange: () => void;
}

export function Highlights({ highlights, onChange }: Props) {
  const grouped = useMemo(() => {
    const m = new Map<string, { title: string; url: string; items: Highlight[] }>();
    for (const h of highlights) {
      const entry = m.get(h.url) ?? { title: h.title, url: h.url, items: [] };
      entry.items.push(h);
      m.set(h.url, entry);
    }
    const list = Array.from(m.values());
    for (const g of list) g.items.sort((a, b) => b.capturedAt - a.capturedAt);
    list.sort((a, b) => b.items[0].capturedAt - a.items[0].capturedAt);
    return list;
  }, [highlights]);

  async function remove(id: string) {
    await Storage.deleteHighlight(id);
    onChange();
  }

  if (!highlights.length) {
    return (
      <div className="journey-empty">
        <p>No highlights yet.</p>
        <p className="hint">
          Highlight any text on a page — a small Save chip appears. Click it (or press ⌘⇧H / Ctrl⇧H)
          to capture the snippet here.
        </p>
      </div>
    );
  }

  return (
    <div className="highlights-list">
      {grouped.map((g) => (
        <div className="highlight-group" key={g.url}>
          <a href={g.url} target="_blank" rel="noreferrer" className="highlight-group-title">
            {g.title || g.url}
          </a>
          <div className="highlight-group-host">{hostOf(g.url)}</div>
          <ul>
            {g.items.map((h) => (
              <li key={h.id}>
                <blockquote>{h.text}</blockquote>
                <div className="highlight-actions">
                  <span className="highlight-when">{formatRelative(h.capturedAt)}</span>
                  <button className="text-btn danger" onClick={() => remove(h.id)}>
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function formatRelative(t: number): string {
  const diff = Date.now() - t;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  const days = Math.floor(diff / 86_400_000);
  if (days < 7) return `${days}d ago`;
  const d = new Date(t);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
