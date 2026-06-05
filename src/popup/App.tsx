import { useEffect, useMemo, useState } from "react";
import { Brand } from "@/components/Brand";
import { Chevron } from "@/components/Chevron";
import { TunnelParticles, TunnelWalls } from "@/components/Tunnel";
import { formatRelative } from "@/lib/format";
import { Storage } from "@/lib/storage";
import { splitCategory, type PageEntry, type PageKind, type Taxonomy } from "@/lib/types";
import "./App.css";

const PAGES_PER_SUB = 25;

interface SnapshotData {
  entries: PageEntry[];
  taxonomy: Taxonomy;
  hasKey: boolean;
  enabled: boolean;
  queueLength: number;
}

async function loadData(): Promise<SnapshotData> {
  const r = await chrome.storage.local.get(["entries", "taxonomy", "settings", "queue"]);
  const settings = (r.settings ?? {}) as { apiKey?: string; enabled?: boolean };
  return {
    entries: (r.entries ?? []) as PageEntry[],
    taxonomy: (r.taxonomy ?? {}) as Taxonomy,
    hasKey: !!settings.apiKey,
    enabled: settings.enabled !== false,
    queueLength: ((r.queue ?? []) as unknown[]).length,
  };
}

export default function App() {
  const [data, setData] = useState<SnapshotData | null>(null);
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [showAll, setShowAll] = useState<Record<string, boolean>>({});

  useEffect(() => {
    void loadData().then(setData);
    const listener = (
      changes: Record<string, chrome.storage.StorageChange>,
      area: chrome.storage.AreaName,
    ) => {
      if (area !== "local") return;
      if (
        "entries" in changes ||
        "taxonomy" in changes ||
        "settings" in changes ||
        "queue" in changes
      ) {
        void loadData().then(setData);
      }
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  const filtered = useMemo<PageEntry[]>(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    if (!q) return data.entries;
    return data.entries.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        e.url.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        (e.topic ?? "").toLowerCase().includes(q),
    );
  }, [data, query]);

  if (!data) return <div className="loading">Loading…</div>;

  const tree = buildTree(filtered);
  const total = data.entries.length;
  const topEntries = Object.entries(tree).sort((a, b) => sumCount(b[1]) - sumCount(a[1]));

  async function togglePause() {
    if (!data) return;
    await Storage.patchSettings({ enabled: !data.enabled });
  }

  return (
    <div className="root">
      <header>
        <div className="title-row">
          <Brand />
          <span className="meta">
            {total} page{total === 1 ? "" : "s"}
          </span>
        </div>

        <button
          className={"capture-pill" + (data.enabled ? " on" : " off")}
          onClick={togglePause}
          title={data.enabled ? "Click to pause capture" : "Click to resume capture"}
        >
          <span className="capture-dot" />
          <span className="capture-label">{data.enabled ? "Capturing" : "Paused"}</span>
          {data.queueLength > 0 && data.enabled && (
            <span className="capture-queue">{data.queueLength} queued</span>
          )}
        </button>

        <nav>
          <button onClick={openDashboard}>Dashboard</button>
          <button onClick={() => chrome.runtime.openOptionsPage()}>Preferences</button>
        </nav>
      </header>

      {!data.hasKey && (
        <div className="warn">
          No API key.{" "}
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              chrome.runtime.openOptionsPage();
            }}
          >
            Configure
          </a>
        </div>
      )}

      <input
        className="search"
        placeholder="Search pages, topics, categories…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

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
            const topKey = top;
            const topOpen = expanded[topKey] ?? false;
            return (
              <div key={topKey} className="top">
                <button
                  className="row"
                  onClick={() => setExpanded((p) => ({ ...p, [topKey]: !p[topKey] }))}
                >
                  <Chevron open={topOpen} />
                  <span className="name">{top}</span>
                  <span className="count">{sumCount(subs)}</span>
                </button>
                {topOpen &&
                  Object.entries(subs)
                    .sort((a, b) => b[1].length - a[1].length)
                    .map(([sub, pages]) => {
                      const subKey = `${topKey}/${sub}`;
                      const subOpen = expanded[subKey] ?? false;
                      const visible = showAll[subKey] ? pages : pages.slice(0, PAGES_PER_SUB);
                      return (
                        <div key={subKey} className="sub">
                          <button
                            className="row sub-row"
                            onClick={() => setExpanded((p) => ({ ...p, [subKey]: !p[subKey] }))}
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
                                    <span className="page-time">{formatRelative(p.visitedAt)}</span>
                                  </li>
                                );
                              })}
                              {!showAll[subKey] && pages.length > PAGES_PER_SUB && (
                                <li>
                                  <button
                                    className="show-more"
                                    onClick={() => setShowAll((p) => ({ ...p, [subKey]: true }))}
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

async function openDashboard(): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.windowId !== undefined) {
    await chrome.sidePanel.open({ windowId: tab.windowId });
    window.close();
  }
}
