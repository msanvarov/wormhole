import { useEffect, useMemo, useState } from "react";
import { hostOf } from "@/lib/kinds";
import { Storage } from "@/lib/storage";
import type { Highlight, Journey, JourneySummary, PageKind } from "@/lib/types";
import "./Journey.css";
import { WormholeMark } from "./WormholeMark";

interface Props {
  journey: Journey;
  onBack: () => void;
}

export function JourneyDetail({ journey, onBack }: Props) {
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [summary, setSummary] = useState<JourneySummary | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void Promise.all([Storage.getHighlights(), Storage.getSummaries()]).then(([h, summaries]) => {
      if (!active) return;
      setHighlights(h);
      setSummary(summaries[journey.topic] ?? null);
    });
    return () => {
      active = false;
    };
  }, [journey.topic]);

  const highlightsByUrl = useMemo(() => {
    const m = new Map<string, Highlight[]>();
    for (const h of highlights) {
      const arr = m.get(h.url) ?? [];
      arr.push(h);
      m.set(h.url, arr);
    }
    return m;
  }, [highlights]);

  const span = useMemo(
    () => formatSpan(journey.firstSeen, journey.lastSeen),
    [journey.firstSeen, journey.lastSeen],
  );

  async function summarize() {
    setGenerating(true);
    setError(null);
    try {
      const res = await chrome.runtime.sendMessage({
        type: "summarize-topic",
        payload: { topic: journey.topic },
      });
      if (res?.ok && typeof res.text === "string") {
        setSummary({
          topic: journey.topic,
          text: res.text,
          generatedAt: Date.now(),
        });
      } else {
        setError(res?.error ?? "Failed to generate summary");
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="journey-detail">
      <div className="journey-detail-head">
        <button className="back-btn" onClick={onBack} aria-label="Back to journeys">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path
              d="M8.5 3L4.5 7L8.5 11"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>Wormholes</span>
        </button>
      </div>

      <div className="wh-hero">
        <WormholeMark size={160} />
      </div>

      <h1 className="journey-title">{journey.topic}</h1>
      <div className="journey-summary-stats">
        <span>
          {journey.entries.length} stop{journey.entries.length === 1 ? "" : "s"}
        </span>
        {journey.people.length > 0 && (
          <>
            <span className="sep">·</span>
            <span>
              {journey.people.length} {journey.people.length === 1 ? "person" : "people"}
            </span>
          </>
        )}
        {span && (
          <>
            <span className="sep">·</span>
            <span>{span}</span>
          </>
        )}
      </div>

      {journey.people.length > 0 && (
        <div className="people-row">
          {journey.people.map((p) => (
            <span className="person-chip" key={p}>
              <span className="person-initials">{initials(p)}</span>
              <span>{p}</span>
            </span>
          ))}
        </div>
      )}

      <div className="summary-block">
        {summary ? (
          <div className="summary-card">
            <div className="summary-card-head">
              <span className="summary-label">Summary</span>
              <button
                className="text-btn"
                onClick={summarize}
                disabled={generating}
                title="Regenerate"
              >
                {generating ? (
                  <span className="inline-spinner">
                    <WormholeMark size={11} active /> Pulling…
                  </span>
                ) : (
                  "Refresh"
                )}
              </button>
            </div>
            <p className="summary-text">{summary.text}</p>
          </div>
        ) : (
          <button className="summarize-btn" onClick={summarize} disabled={generating}>
            {generating ? (
              <span className="inline-spinner">
                <WormholeMark size={14} active /> Drawing from the wormhole…
              </span>
            ) : (
              "Generate summary"
            )}
          </button>
        )}
        {error && <div className="summary-error">{error}</div>}
      </div>

      <div className="wormhole-tunnel">
        <div className="tunnel-haze" aria-hidden="true" />
        <div className="journey-timeline">
          {journey.entries.map((entry, i) => {
            const kind = (entry.kind ?? "site") as PageKind;
            const entryHighlights = highlightsByUrl.get(entry.url) ?? [];
            const isLast = i === journey.entries.length - 1;
            const isFirst = i === 0;
            return (
              <div
                className={"timeline-item" + (isFirst ? " first" : "") + (isLast ? " last" : "")}
                key={entry.url + entry.visitedAt}
              >
                <div className="timeline-rail">
                  <span className={"timeline-portal kind-" + kind} aria-hidden="true">
                    <svg width="22" height="22" viewBox="0 0 24 24">
                      <circle
                        cx="12"
                        cy="12"
                        r="11"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="0.8"
                        strokeOpacity="0.32"
                      />
                      <circle
                        cx="12"
                        cy="12"
                        r="8"
                        fill="rgba(5, 10, 32, 0.65)"
                        stroke="currentColor"
                        strokeWidth="1"
                        strokeOpacity="0.72"
                      />
                      <circle cx="12" cy="12" r="4" fill="#020010" />
                      <circle cx="12" cy="12" r="1.6" fill="currentColor" opacity="0.95" />
                    </svg>
                  </span>
                  {!isLast && (
                    <span className="timeline-spine" aria-hidden="true">
                      <span className="spine-particle" />
                      <span className="spine-particle delay" />
                    </span>
                  )}
                </div>
                <div className="timeline-branch" aria-hidden="true" />
                <div className="timeline-body">
                  <a
                    href={entry.url}
                    target="_blank"
                    rel="noreferrer"
                    className="timeline-title"
                    title={entry.url}
                  >
                    {entry.title || entry.url}
                  </a>
                  <div className="timeline-meta">
                    <span className="timeline-host">{hostOf(entry.url)}</span>
                    <span className="sep">·</span>
                    <span className="timeline-when">{formatRelative(entry.visitedAt)}</span>
                    <span className={"kind-chip kind-" + kind}>{kindLabel(kind)}</span>
                  </div>
                  {(entry.people?.length ?? 0) > 0 && (
                    <div className="timeline-people">
                      {entry.people!.map((p) => (
                        <span className="person-chip small" key={p}>
                          <span className="person-initials">{initials(p)}</span>
                          <span>{p}</span>
                        </span>
                      ))}
                    </div>
                  )}
                  {entryHighlights.length > 0 && (
                    <ul className="timeline-highlights">
                      {entryHighlights.map((h) => (
                        <li key={h.id}>"{h.text}"</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function kindLabel(k: PageKind): string {
  return k.charAt(0).toUpperCase() + k.slice(1);
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

function formatSpan(firstSeen: number, lastSeen: number): string {
  const days = Math.max(1, Math.round((lastSeen - firstSeen) / 86_400_000));
  if (days === 1) return "over 1 day";
  return `over ${days} days`;
}
