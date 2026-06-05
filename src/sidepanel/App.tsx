import { useEffect, useMemo, useState } from "react";
import { Brand } from "@/components/Brand";
import { Chevron } from "@/components/Chevron";
import { Highlights } from "@/components/Highlights";
import { JourneyDetail } from "@/components/JourneyDetail";
import { JourneyList } from "@/components/JourneyList";
import { TunnelParticles, TunnelWalls } from "@/components/Tunnel";
import { WormholeMark } from "@/components/WormholeMark";
import { hostOf } from "@/lib/kinds";
import { Storage } from "@/lib/storage";
import {
  splitCategory,
  type Highlight,
  type Journey,
  type PageEntry,
  type PageKind,
  type Taxonomy,
} from "@/lib/types";
import "./App.css";

const PAGES_PER_SUB = 30;

interface Snapshot {
  entries: PageEntry[];
  taxonomy: Taxonomy;
  queueLength: number;
  lastFlush?: number;
  hasKey: boolean;
  enabled: boolean;
  journeys: Journey[];
  highlights: Highlight[];
  pulling: boolean;
}

async function loadSnapshot(): Promise<Snapshot> {
  const [r, journeys, highlights] = await Promise.all([
    chrome.storage.local.get(["entries", "taxonomy", "queue", "lastFlush", "settings", "pulling"]),
    Storage.getJourneys(),
    Storage.getHighlights(),
  ]);
  const settings = (r.settings ?? {}) as { apiKey?: string; enabled?: boolean };
  return {
    entries: (r.entries ?? []) as PageEntry[],
    taxonomy: (r.taxonomy ?? {}) as Taxonomy,
    queueLength: ((r.queue ?? []) as unknown[]).length,
    lastFlush: r.lastFlush as number | undefined,
    hasKey: !!settings.apiKey,
    enabled: settings.enabled !== false,
    journeys,
    highlights,
    pulling: !!r.pulling,
  };
}

type View = "tree" | "journeys" | "highlights" | "recent";

export default function App() {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [showAll, setShowAll] = useState<Record<string, boolean>>({});
  const [view, setView] = useState<View>("journeys");
  const [activeTopic, setActiveTopic] = useState<string | null>(null);
  const [flushing, setFlushing] = useState(false);

  useEffect(() => {
    void loadSnapshot().then(setSnap);
    const listener = (
      changes: Record<string, chrome.storage.StorageChange>,
      area: chrome.storage.AreaName,
    ) => {
      if (area !== "local") return;
      if (
        "entries" in changes ||
        "taxonomy" in changes ||
        "queue" in changes ||
        "lastFlush" in changes ||
        "settings" in changes ||
        "highlights" in changes ||
        "pulling" in changes
      ) {
        void loadSnapshot().then(setSnap);
      }
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  const filtered = useMemo<PageEntry[]>(() => {
    if (!snap) return [];
    const q = query.trim().toLowerCase();
    if (!q) return snap.entries;
    return snap.entries.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        e.url.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        (e.topic ?? "").toLowerCase().includes(q),
    );
  }, [snap, query]);

  if (!snap) return <div className="loading">Loading…</div>;

  const total = snap.entries.length;
  const tree = buildTree(filtered);
  const recent = [...filtered].sort((a, b) => b.visitedAt - a.visitedAt).slice(0, 200);
  const topEntries = Object.entries(tree).sort((a, b) => sumCount(b[1]) - sumCount(a[1]));
  const activeJourney = activeTopic ? snap.journeys.find((j) => j.topic === activeTopic) : null;
  const isPulling = snap.pulling || flushing;

  async function flushNow() {
    setFlushing(true);
    try {
      await chrome.runtime.sendMessage({ type: "flush" });
    } finally {
      setFlushing(false);
    }
  }

  async function exportJson() {
    const data = await chrome.storage.local.get(["entries", "taxonomy", "highlights", "summaries"]);
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `wormhole-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function clearAll() {
    if (!confirm("Delete all captured pages, highlights, and journeys? This cannot be undone."))
      return;
    await chrome.runtime.sendMessage({ type: "clear" });
    setActiveTopic(null);
  }

  if (activeJourney) {
    return (
      <div className="dash">
        <JourneyDetail journey={activeJourney} onBack={() => setActiveTopic(null)} />
      </div>
    );
  }

  return (
    <div className="dash">
      <header>
        <div className="title">
          <Brand active={isPulling} />
          <span
            className={"status-dot " + (snap.enabled ? "on" : "off")}
            title={snap.enabled ? "Capture on" : "Capture paused"}
          />
        </div>
        <div className="stats">
          <span>{total} captured</span>
          <span className="sep">·</span>
          <span>{snap.journeys.length} journeys</span>
          <span className="sep">·</span>
          <span>{snap.highlights.length} highlights</span>
          {snap.queueLength > 0 && (
            <>
              <span className="sep">·</span>
              <span className={isPulling ? "queued pulling" : "queued"}>
                {snap.queueLength} queued
              </span>
            </>
          )}
          <span className="sep">·</span>
          <span className="last-pulled">
            last pulled
            <span className="last-pulled-mark">
              <WormholeMark size={12} active={isPulling} />
            </span>
            {formatTime(snap.lastFlush)}
          </span>
        </div>
      </header>

      {!snap.hasKey && (
        <div className="warn">
          No API key.{" "}
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              chrome.runtime.openOptionsPage();
            }}
          >
            Open settings
          </a>
        </div>
      )}

      <div className="toolbar">
        <div className="tabs">
          <button
            className={view === "journeys" ? "active" : ""}
            onClick={() => setView("journeys")}
          >
            Wormholes
          </button>
          <button className={view === "tree" ? "active" : ""} onClick={() => setView("tree")}>
            Ontology
          </button>
          <button
            className={view === "highlights" ? "active" : ""}
            onClick={() => setView("highlights")}
          >
            Highlights
          </button>
          <button className={view === "recent" ? "active" : ""} onClick={() => setView("recent")}>
            Recent
          </button>
        </div>
        {view !== "highlights" && view !== "journeys" && (
          <input
            className="search"
            placeholder="Search…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        )}
      </div>

      {view === "journeys" && <JourneyList journeys={snap.journeys} onSelect={setActiveTopic} />}

      {view === "highlights" && (
        <Highlights
          highlights={snap.highlights}
          onChange={() => void loadSnapshot().then(setSnap)}
        />
      )}

      {view === "tree" && (
        <div className="tree-wrapper">
          <TunnelWalls />
          <TunnelParticles />
          <div className="tree">
            {topEntries.length === 0 && (
              <div className="empty">
                {total === 0 ? "Nothing categorized yet. Keep browsing." : "No matches."}
              </div>
            )}
            {topEntries.map(([top, subs]) => {
              const topOpen = expanded[top] ?? true;
              return (
                <div key={top} className="top">
                  <button
                    className="row"
                    onClick={() => setExpanded((p) => ({ ...p, [top]: !topOpen }))}
                  >
                    <Chevron open={topOpen} />
                    <span className="name">{top}</span>
                    <span className="count">{sumCount(subs)}</span>
                  </button>
                  {topOpen &&
                    Object.entries(subs)
                      .sort((a, b) => b[1].length - a[1].length)
                      .map(([sub, pages]) => {
                        const subKey = `${top}/${sub}`;
                        const subOpen = expanded[subKey] ?? false;
                        const visible = showAll[subKey] ? pages : pages.slice(0, PAGES_PER_SUB);
                        return (
                          <div key={subKey} className="sub">
                            <button
                              className="row sub-row"
                              onClick={() =>
                                setExpanded((p) => ({
                                  ...p,
                                  [subKey]: !subOpen,
                                }))
                              }
                            >
                              <Chevron open={subOpen} />
                              <span className="name">{sub}</span>
                              <span className="count">{pages.length}</span>
                            </button>
                            {subOpen && (
                              <ul className="pages">
                                {visible.map((p) => {
                                  const kind = (p.kind ?? "site") as PageKind;
                                  return (
                                    <li key={p.url + p.visitedAt} className="page-row">
                                      <span
                                        className={"page-portal kind-" + kind}
                                        aria-hidden="true"
                                      />
                                      <a
                                        href={p.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        title={p.url}
                                        className="page-title"
                                      >
                                        {p.title || p.url}
                                      </a>
                                      <span className="page-time">{formatTime(p.visitedAt)}</span>
                                    </li>
                                  );
                                })}
                                {!showAll[subKey] && pages.length > PAGES_PER_SUB && (
                                  <li>
                                    <button
                                      className="show-more"
                                      onClick={() =>
                                        setShowAll((p) => ({
                                          ...p,
                                          [subKey]: true,
                                        }))
                                      }
                                    >
                                      + Show {pages.length - PAGES_PER_SUB} more
                                    </button>
                                  </li>
                                )}
                              </ul>
                            )}
                          </div>
                        );
                      })}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {view === "recent" && (
        <div className="recent">
          {recent.length === 0 && <div className="empty">No pages.</div>}
          {recent.map((p) => (
            <div key={p.url + p.visitedAt} className="recent-item">
              <a href={p.url} target="_blank" rel="noreferrer" title={p.url}>
                {p.title || p.url}
              </a>
              <div className="recent-meta">
                <span className="cat">{p.category}</span>
                <span>
                  {hostOf(p.url)} · {formatTime(p.visitedAt)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <footer>
        <div className="footer-actions">
          <button onClick={flushNow} disabled={isPulling || !snap.hasKey}>
            {isPulling ? (
              <>
                <span className="footer-spinner">
                  <WormholeMark size={12} active />
                </span>
                Pulling…
              </>
            ) : (
              "Pull queue"
            )}
          </button>
          <button onClick={exportJson} disabled={total === 0}>
            Export
          </button>
          <button
            className="danger"
            onClick={clearAll}
            disabled={total === 0 && snap.highlights.length === 0}
          >
            Clear
          </button>
        </div>
        <div className="footer-credit">
          Built by{" "}
          <a href="https://sal-anvarov.com" target="_blank" rel="noreferrer">
            Sal
          </a>
        </div>
      </footer>
    </div>
  );
}

function buildTree(entries: PageEntry[]): Record<string, Record<string, PageEntry[]>> {
  const tree: Record<string, Record<string, PageEntry[]>> = {};
  for (const e of entries) {
    const [top, sub] = splitCategory(e.category);
    tree[top] ??= {};
    tree[top][sub] ??= [];
    tree[top][sub].push(e);
  }
  for (const subs of Object.values(tree)) {
    for (const pages of Object.values(subs)) {
      pages.sort((a, b) => b.visitedAt - a.visitedAt);
    }
  }
  return tree;
}

function sumCount(subs: Record<string, PageEntry[]>): number {
  let n = 0;
  for (const pages of Object.values(subs)) n += pages.length;
  return n;
}

function formatTime(t?: number): string {
  if (!t) return "never";
  const diff = Date.now() - t;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  const days = Math.floor(diff / 86_400_000);
  if (days < 7) return `${days}d ago`;
  const d = new Date(t);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
