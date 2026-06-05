import { inferKind } from "./kinds";
import type { PageEntry, QueueItem, Settings, Taxonomy } from "./types";

const SYSTEM_PROMPT = `You categorize web pages into a two-level ontology AND identify the narrative thread (topic) and people involved.

For each input page return:
- "category": "TopLevel/SubLevel" — broad domain over specific subdomain. Examples: "Software Development/Python Libraries", "News/Politics", "Research/Machine Learning", "Shopping/Luxury Cars".
- "topic": a specific, concrete narrative the user is investigating (e.g. "Shopping for Mercedes S63", "Planning Tahoe trip", "Wormhole extension dev"). Reuse existing topics aggressively. Use null if the page does not clearly belong to an ongoing thread.
- "people": array of distinct people names you can confidently extract from the URL or title (e.g. a Slack DM title "Direct message with Mike Chen" → ["Mike Chen"]). Empty array if none.

Rules:
- Both category levels are 1-3 words, Title Case, no slashes inside a level.
- REUSE existing TopLevel/SubLevel and existing topics whenever they reasonably fit.
- Be conservative with "topic": only set it when the page is part of a clear ongoing thread; otherwise null.
- Be conservative with "people": only include real human names you can extract from the title/URL.
- Base everything on URL + title only.

Respond with ONLY a JSON object:
{"results": [{"url": "...", "category": "Top/Sub", "topic": "..." | null, "people": [...]}]}

One entry per input, same order. No other text.`;

const CHUNK_SIZE = 25;
const CHUNK_DELAY_MS = 250;

export interface CategorizeOptions {
  onChunk?: (results: PageEntry[], totalDone: number, totalAll: number) => void | Promise<void>;
}

interface LLMResult {
  url: string;
  category: string;
  topic?: string | null;
  people?: string[];
}

export const Categorizer = {
  async categorize(
    items: QueueItem[],
    taxonomy: Taxonomy,
    settings: Settings,
    opts: CategorizeOptions = {},
  ): Promise<PageEntry[]> {
    if (items.length === 0) return [];

    const all: PageEntry[] = [];
    const knownTopics = new Set<string>();

    for (let i = 0; i < items.length; i += CHUNK_SIZE) {
      const chunk = items.slice(i, i + CHUNK_SIZE);
      const results = await categorizeChunk(chunk, taxonomy, knownTopics, settings);

      for (const r of results) {
        if (r.topic) knownTopics.add(r.topic);
        const [top, sub] = r.category.split("/");
        if (top && sub) {
          taxonomy[top] ??= {};
          taxonomy[top][sub] = (taxonomy[top][sub] ?? 0) + 1;
        }
      }

      all.push(...results);

      if (opts.onChunk) {
        await opts.onChunk(results, all.length, items.length);
      }

      if (i + CHUNK_SIZE < items.length) {
        await sleep(CHUNK_DELAY_MS);
      }
    }

    return all;
  },

  async summarize(prompt: string, settings: Settings): Promise<string> {
    if (settings.provider === "openai") {
      return callOpenAI(
        "You write concise, factual summaries. Reply in plain prose under 220 words.",
        prompt,
        settings,
        { jsonMode: false },
      );
    }
    return callAnthropic(
      "You write concise, factual summaries. Reply in plain prose under 220 words.",
      prompt,
      settings,
    );
  },
};

async function categorizeChunk(
  items: QueueItem[],
  taxonomy: Taxonomy,
  knownTopics: Set<string>,
  settings: Settings,
): Promise<PageEntry[]> {
  const taxonomyBlock = buildTaxonomyHint(taxonomy);
  const topicsBlock = knownTopics.size
    ? `Existing topics (reuse when possible): ${[...knownTopics].join(" | ")}\n\n`
    : "";

  const input = items.map((i) => ({ url: i.url, title: truncate(i.title, 200) }));
  const userMessage = `${taxonomyBlock}${topicsBlock}Categorize these pages:\n${JSON.stringify(input, null, 2)}`;

  const raw =
    settings.provider === "openai"
      ? await callOpenAI(SYSTEM_PROMPT, userMessage, settings, { jsonMode: true })
      : await callAnthropic(SYSTEM_PROMPT, userMessage, settings);

  const parsed = extractResults(raw);
  if (!parsed.length) return [];

  const byUrl = new Map(items.map((i) => [i.url, i] as const));
  const out: PageEntry[] = [];
  for (const r of parsed) {
    const src = byUrl.get(r.url);
    if (!src || !r.category) continue;
    out.push({
      url: r.url,
      title: src.title,
      category: r.category,
      topic: r.topic ?? null,
      people: Array.isArray(r.people)
        ? r.people.filter((p) => typeof p === "string" && p.trim())
        : [],
      kind: inferKind(r.url),
      visitedAt: src.visitedAt,
    });
  }
  return out;
}

function buildTaxonomyHint(taxonomy: Taxonomy): string {
  const tops = Object.keys(taxonomy);
  if (tops.length === 0) return "";
  const detail = tops
    .map((top) => `  ${top}: ${Object.keys(taxonomy[top]).join(", ") || "(none yet)"}`)
    .join("\n");
  return `Existing TopLevel categories (reuse when possible): ${tops.join(", ")}\nExisting SubLevels per Top:\n${detail}\n\n`;
}

function truncate(s: string, max: number): string {
  if (!s) return "";
  return s.length > max ? s.slice(0, max) : s;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function callAnthropic(system: string, user: string, settings: Settings): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": settings.apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: settings.model,
      max_tokens: 4096,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!res.ok) {
    throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as { content?: Array<{ text?: string }> };
  return data.content?.[0]?.text ?? "";
}

async function callOpenAI(
  system: string,
  user: string,
  settings: Settings,
  opts: { jsonMode: boolean },
): Promise<string> {
  const body: Record<string, unknown> = {
    model: settings.model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  };
  if (opts.jsonMode) body.response_format = { type: "json_object" };

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${settings.apiKey}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content ?? "";
}

function extractResults(text: string): LLMResult[] {
  const tryParse = (s: string): unknown => {
    try {
      return JSON.parse(s);
    } catch {
      return undefined;
    }
  };

  let parsed: unknown = tryParse(text);

  if (parsed === undefined) {
    const objMatch = text.match(/\{[\s\S]*\}/);
    if (objMatch) parsed = tryParse(objMatch[0]);
  }
  if (parsed === undefined) {
    const arrMatch = text.match(/\[[\s\S]*\]/);
    if (arrMatch) parsed = tryParse(arrMatch[0]);
  }
  if (parsed === undefined) return [];

  const asResults = (v: unknown): LLMResult[] => {
    if (!Array.isArray(v)) return [];
    return v
      .filter(
        (x): x is LLMResult =>
          !!x &&
          typeof x === "object" &&
          typeof (x as LLMResult).url === "string" &&
          typeof (x as LLMResult).category === "string",
      )
      .map((x) => ({
        url: x.url,
        category: x.category,
        topic: typeof x.topic === "string" && x.topic.trim() ? x.topic.trim() : null,
        people: Array.isArray(x.people) ? x.people : [],
      }));
  };

  if (Array.isArray(parsed)) return asResults(parsed);
  if (parsed && typeof parsed === "object") {
    const obj = parsed as Record<string, unknown>;
    if (Array.isArray(obj.results)) return asResults(obj.results);
    if (Array.isArray(obj.items)) return asResults(obj.items);
    for (const v of Object.values(obj)) {
      if (Array.isArray(v)) {
        const r = asResults(v);
        if (r.length) return r;
      }
    }
  }
  return [];
}
