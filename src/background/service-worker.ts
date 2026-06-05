import { Categorizer } from "@/lib/categorizer";
import { hostOf } from "@/lib/kinds";
import { Storage } from "@/lib/storage";
import type { Highlight } from "@/lib/types";

const FLUSH_ALARM = "wormhole-flush";
const FLUSH_DELAY_MINUTES = 0.5;
const BATCH_THRESHOLD = 10;

const SKIP_PROTOCOLS = new Set([
  "chrome:",
  "chrome-extension:",
  "about:",
  "edge:",
  "brave:",
  "file:",
  "view-source:",
  "data:",
  "javascript:",
]);

chrome.runtime.onInstalled.addListener(async () => {
  const settings = await Storage.getSettings();
  if (!settings.apiKey) {
    chrome.runtime.openOptionsPage();
  }
});

chrome.webNavigation.onCompleted.addListener(async (details) => {
  if (details.frameId !== 0) return;
  const { url, tabId } = details;

  const settings = await Storage.getSettings();
  if (!settings.enabled) return;
  if (!isCapturable(url, settings.blacklist)) return;

  let title = "";
  try {
    const tab = await chrome.tabs.get(tabId);
    title = tab.title ?? "";
  } catch {
    // tab may have closed before we got here
  }

  const queueLength = await Storage.enqueue({ url, title, visitedAt: Date.now() });
  if (queueLength >= BATCH_THRESHOLD) {
    void flush();
  } else if (queueLength > 0) {
    scheduleFlush();
  }
});

function isCapturable(url: string, blacklist: string[]): boolean {
  try {
    const u = new URL(url);
    if (SKIP_PROTOCOLS.has(u.protocol)) return false;
    for (const b of blacklist) {
      const trimmed = b.trim();
      if (trimmed && u.hostname.includes(trimmed)) return false;
    }
    return true;
  } catch {
    return false;
  }
}

function scheduleFlush(): void {
  chrome.alarms.create(FLUSH_ALARM, { delayInMinutes: FLUSH_DELAY_MINUTES });
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === FLUSH_ALARM) {
    void flush();
  }
});

let flushing = false;

async function flush(): Promise<void> {
  if (flushing) return;
  flushing = true;
  await Storage.setPulling(true);
  try {
    const queue = await Storage.drainQueue();
    if (queue.length === 0) return;

    const settings = await Storage.getSettings();
    if (!settings.apiKey) {
      await Storage.setQueue(queue);
      console.warn("Wormhole: no API key configured; skipping categorization.");
      return;
    }

    const taxonomy = await Storage.getTaxonomy();

    try {
      await Categorizer.categorize(queue, taxonomy, settings, {
        onChunk: async (results) => {
          if (results.length) {
            await Storage.recordResults(results);
          }
        },
      });
    } catch (err) {
      console.error("Wormhole categorization failed:", err);
      const current = await Storage.getQueue();
      await Storage.setQueue([...queue, ...current]);
      scheduleFlush();
    }
  } finally {
    flushing = false;
    await Storage.setPulling(false);
  }
}

async function handleHighlight(payload: {
  url: string;
  title: string;
  text: string;
}): Promise<void> {
  const settings = await Storage.getSettings();
  if (!isCapturable(payload.url, settings.blacklist)) return;
  const text = (payload.text ?? "").trim();
  if (text.length < 4) return;

  const h: Highlight = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    url: payload.url,
    title: payload.title || hostOf(payload.url),
    text: text.length > 2000 ? text.slice(0, 2000) + "…" : text,
    capturedAt: Date.now(),
  };
  await Storage.addHighlight(h);
}

chrome.commands.onCommand.addListener(async (command) => {
  if (command === "capture-selection") {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id !== undefined) {
      try {
        await chrome.tabs.sendMessage(tab.id, { type: "capture-selection" });
      } catch {
        // content script not loaded on this page (e.g., chrome:// pages)
      }
    }
  } else if (command === "toggle-capture") {
    const settings = await Storage.getSettings();
    await Storage.patchSettings({ enabled: !settings.enabled });
  }
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (!msg || typeof msg !== "object") return false;
  const { type, payload } = msg as { type?: string; payload?: unknown };

  if (type === "flush") {
    flush().then(() => sendResponse({ ok: true }));
    return true;
  }
  if (type === "clear") {
    Storage.clearAll().then(() => sendResponse({ ok: true }));
    return true;
  }
  if (type === "highlight") {
    handleHighlight(payload as { url: string; title: string; text: string }).then(() =>
      sendResponse({ ok: true }),
    );
    return true;
  }
  if (type === "summarize-topic") {
    summarizeTopic(payload as { topic: string }).then(
      (text) => sendResponse({ ok: true, text }),
      (err) => sendResponse({ ok: false, error: String(err) }),
    );
    return true;
  }
  return false;
});

async function summarizeTopic({ topic }: { topic: string }): Promise<string> {
  const settings = await Storage.getSettings();
  if (!settings.apiKey) throw new Error("No API key configured");

  const journeys = await Storage.getJourneys();
  const journey = journeys.find((j) => j.topic === topic);
  if (!journey) throw new Error("Journey not found");

  const allHighlights = await Storage.getHighlights();
  const urlsInJourney = new Set(journey.entries.map((e) => e.url));
  const relevantHighlights = allHighlights.filter((h) => urlsInJourney.has(h.url));

  const stops = journey.entries
    .map((e, i) => {
      const ts = new Date(e.visitedAt).toISOString().slice(0, 10);
      return `${i + 1}. [${ts}] ${e.title || hostOf(e.url)} — ${hostOf(e.url)} (${e.kind ?? "site"})`;
    })
    .join("\n");

  const highlights = relevantHighlights.length
    ? "\n\nUser-highlighted excerpts:\n" +
      relevantHighlights
        .map((h, i) => `[${i + 1}] from ${hostOf(h.url)}: "${h.text.slice(0, 400)}"`)
        .join("\n")
    : "";

  const peopleLine = journey.people.length ? `\nPeople involved: ${journey.people.join(", ")}` : "";

  const prompt =
    `Summarize the user's journey on the topic "${topic}".${peopleLine}\n\n` +
    `Pages visited (chronological):\n${stops}${highlights}\n\n` +
    `Write a brief narrative (4-8 sentences) covering: what the user is trying to learn or decide, key findings or open questions, and any next obvious step. Plain prose, no headings.`;

  const text = await Categorizer.summarize(prompt, settings);
  await Storage.saveSummary(topic, {
    topic,
    text,
    generatedAt: Date.now(),
  });
  return text;
}
