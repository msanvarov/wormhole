import { inferKind } from './kinds'
import type {
  Highlight,
  Journey,
  JourneySummary,
  PageEntry,
  QueueItem,
  Settings,
  Taxonomy,
} from './types'
import { DEFAULT_SETTINGS, splitCategory } from './types'

const K = {
  settings: 'settings',
  entries: 'entries',
  taxonomy: 'taxonomy',
  seen: 'seen',
  queue: 'queue',
  lastFlush: 'lastFlush',
  highlights: 'highlights',
  summaries: 'summaries',
  pulling: 'pulling',
} as const

const SEEN_TTL_MS = 30 * 24 * 60 * 60 * 1000
const MAX_ENTRIES = 25000
const MAX_HIGHLIGHTS = 5000

async function get<T>(key: string): Promise<T | undefined> {
  const r = await chrome.storage.local.get(key)
  return r[key] as T | undefined
}

async function set(key: string, value: unknown): Promise<void> {
  await chrome.storage.local.set({ [key]: value })
}

export const Storage = {
  async getSettings(): Promise<Settings> {
    const s = await get<Partial<Settings>>(K.settings)
    return { ...DEFAULT_SETTINGS, ...(s ?? {}) }
  },

  async setSettings(s: Settings): Promise<void> {
    await set(K.settings, s)
  },

  async patchSettings(patch: Partial<Settings>): Promise<Settings> {
    const cur = await this.getSettings()
    const next = { ...cur, ...patch }
    await this.setSettings(next)
    return next
  },

  async getTaxonomy(): Promise<Taxonomy> {
    return (await get<Taxonomy>(K.taxonomy)) ?? {}
  },

  async getEntries(): Promise<PageEntry[]> {
    return (await get<PageEntry[]>(K.entries)) ?? []
  },

  async getQueue(): Promise<QueueItem[]> {
    return (await get<QueueItem[]>(K.queue)) ?? []
  },

  async setQueue(q: QueueItem[]): Promise<void> {
    await set(K.queue, q)
  },

  async getLastFlush(): Promise<number | undefined> {
    return await get<number>(K.lastFlush)
  },

  async setPulling(pulling: boolean): Promise<void> {
    await set(K.pulling, pulling)
  },

  async hasSeen(url: string): Promise<boolean> {
    const seen = (await get<Record<string, number>>(K.seen)) ?? {}
    const t = seen[url]
    return !!t && Date.now() - t <= SEEN_TTL_MS
  },

  async enqueue(item: QueueItem): Promise<number> {
    const q = await this.getQueue()
    if (q.some((i) => i.url === item.url)) return q.length
    if (await this.hasSeen(item.url)) return q.length
    q.push(item)
    await this.setQueue(q)
    return q.length
  },

  async drainQueue(): Promise<QueueItem[]> {
    const q = await this.getQueue()
    await this.setQueue([])
    return q
  },

  async recordResults(results: PageEntry[]): Promise<void> {
    const entries = await this.getEntries()
    const taxonomy = await this.getTaxonomy()
    const seenObj = (await get<Record<string, number>>(K.seen)) ?? {}

    const now = Date.now()
    for (const r of results) {
      const enriched: PageEntry = { ...r, kind: r.kind ?? inferKind(r.url) }
      entries.push(enriched)
      const [top, sub] = splitCategory(enriched.category)
      taxonomy[top] ??= {}
      taxonomy[top][sub] = (taxonomy[top][sub] ?? 0) + 1
      seenObj[enriched.url] = now
    }

    const trimmed = entries.length > MAX_ENTRIES ? entries.slice(-MAX_ENTRIES) : entries

    await chrome.storage.local.set({
      [K.entries]: trimmed,
      [K.taxonomy]: taxonomy,
      [K.seen]: seenObj,
      [K.lastFlush]: now,
    })
  },

  async getHighlights(): Promise<Highlight[]> {
    return (await get<Highlight[]>(K.highlights)) ?? []
  },

  async addHighlight(h: Highlight): Promise<void> {
    const list = await this.getHighlights()
    list.push(h)
    const trimmed = list.length > MAX_HIGHLIGHTS ? list.slice(-MAX_HIGHLIGHTS) : list
    await set(K.highlights, trimmed)
  },

  async deleteHighlight(id: string): Promise<void> {
    const list = await this.getHighlights()
    await set(
      K.highlights,
      list.filter((h) => h.id !== id),
    )
  },

  async getSummaries(): Promise<Record<string, JourneySummary>> {
    return (await get<Record<string, JourneySummary>>(K.summaries)) ?? {}
  },

  async saveSummary(topic: string, summary: JourneySummary): Promise<void> {
    const map = await this.getSummaries()
    map[topic] = summary
    await set(K.summaries, map)
  },

  async getJourneys(): Promise<Journey[]> {
    const [entries, highlights] = await Promise.all([this.getEntries(), this.getHighlights()])
    const byTopic = new Map<string, Journey>()

    const highlightCountsByUrl = new Map<string, number>()
    for (const h of highlights) {
      highlightCountsByUrl.set(h.url, (highlightCountsByUrl.get(h.url) ?? 0) + 1)
    }

    for (const e of entries) {
      const topic = (e.topic ?? '').trim()
      if (!topic) continue
      let j = byTopic.get(topic)
      if (!j) {
        j = {
          topic,
          entries: [],
          people: [],
          firstSeen: e.visitedAt,
          lastSeen: e.visitedAt,
          highlightCount: 0,
        }
        byTopic.set(topic, j)
      }
      j.entries.push(e)
      j.firstSeen = Math.min(j.firstSeen, e.visitedAt)
      j.lastSeen = Math.max(j.lastSeen, e.visitedAt)
      j.highlightCount += highlightCountsByUrl.get(e.url) ?? 0
      for (const p of e.people ?? []) {
        if (p && !j.people.includes(p)) j.people.push(p)
      }
    }

    const out = Array.from(byTopic.values())
    for (const j of out) j.entries.sort((a, b) => a.visitedAt - b.visitedAt)
    out.sort((a, b) => b.lastSeen - a.lastSeen)
    return out
  },

  async clearAll(): Promise<void> {
    await chrome.storage.local.remove([
      K.entries,
      K.taxonomy,
      K.seen,
      K.queue,
      K.lastFlush,
      K.highlights,
      K.summaries,
      K.pulling,
    ])
  },
}
