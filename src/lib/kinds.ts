import type { PageKind } from './types'

interface Rule {
  kind: PageKind
  test: (host: string, path: string) => boolean
}

const RULES: Rule[] = [
  {
    kind: 'conversation',
    test: (h) =>
      /(^|\.)slack\.com$/.test(h) ||
      /(^|\.)discord\.com$/.test(h) ||
      /(^|\.)web\.whatsapp\.com$/.test(h) ||
      /(^|\.)messenger\.com$/.test(h) ||
      /(^|\.)web\.telegram\.org$/.test(h) ||
      /(^|\.)telegram\.org$/.test(h) ||
      /(^|\.)messages\.google\.com$/.test(h) ||
      /(^|\.)teams\.microsoft\.com$/.test(h) ||
      /(^|\.)teams\.live\.com$/.test(h) ||
      /(^|\.)app\.element\.io$/.test(h) ||
      /(^|\.)chat\.openai\.com$/.test(h) ||
      /(^|\.)claude\.ai$/.test(h),
  },
  {
    kind: 'search',
    test: (h, p) =>
      (h.endsWith('google.com') && p.startsWith('/search')) ||
      /(^|\.)duckduckgo\.com$/.test(h) ||
      /(^|\.)bing\.com$/.test(h) ||
      /(^|\.)kagi\.com$/.test(h) ||
      /(^|\.)perplexity\.ai$/.test(h),
  },
  {
    kind: 'code',
    test: (h) =>
      /(^|\.)github\.com$/.test(h) ||
      /(^|\.)gitlab\.com$/.test(h) ||
      /(^|\.)bitbucket\.org$/.test(h) ||
      /(^|\.)stackoverflow\.com$/.test(h) ||
      /(^|\.)gist\.github\.com$/.test(h) ||
      /(^|\.)codepen\.io$/.test(h) ||
      /(^|\.)stackblitz\.com$/.test(h),
  },
  {
    kind: 'docs',
    test: (h) =>
      /(^|\.)docs\.google\.com$/.test(h) ||
      /(^|\.)sheets\.google\.com$/.test(h) ||
      /(^|\.)slides\.google\.com$/.test(h) ||
      /(^|\.)notion\.so$/.test(h) ||
      /(^|\.)notion\.site$/.test(h) ||
      /(^|\.)coda\.io$/.test(h) ||
      /(^|\.)figma\.com$/.test(h) ||
      /(^|\.)quip\.com$/.test(h) ||
      /(^|\.)office\.com$/.test(h) ||
      /(^|\.)sharepoint\.com$/.test(h) ||
      /(^|\.)linear\.app$/.test(h),
  },
  {
    kind: 'shopping',
    test: (h) =>
      /(^|\.)amazon\.[a-z.]+$/.test(h) ||
      /(^|\.)ebay\.[a-z.]+$/.test(h) ||
      /(^|\.)etsy\.com$/.test(h) ||
      /(^|\.)walmart\.com$/.test(h) ||
      /(^|\.)shopify\.com$/.test(h) ||
      /(^|\.)target\.com$/.test(h) ||
      /(^|\.)bestbuy\.com$/.test(h) ||
      /(^|\.)aliexpress\.com$/.test(h) ||
      /(^|\.)temu\.com$/.test(h) ||
      /(^|\.)autotrader\.com$/.test(h) ||
      /(^|\.)carmax\.com$/.test(h) ||
      /(^|\.)cars\.com$/.test(h) ||
      /(^|\.)edmunds\.com$/.test(h),
  },
  {
    kind: 'social',
    test: (h) =>
      /(^|\.)twitter\.com$/.test(h) ||
      /(^|\.)x\.com$/.test(h) ||
      /(^|\.)reddit\.com$/.test(h) ||
      /(^|\.)facebook\.com$/.test(h) ||
      /(^|\.)instagram\.com$/.test(h) ||
      /(^|\.)linkedin\.com$/.test(h) ||
      /(^|\.)tiktok\.com$/.test(h) ||
      /(^|\.)threads\.net$/.test(h) ||
      /(^|\.)bsky\.app$/.test(h) ||
      /(^|\.)mastodon\.social$/.test(h) ||
      /(^|\.)news\.ycombinator\.com$/.test(h),
  },
  {
    kind: 'media',
    test: (h) =>
      /(^|\.)youtube\.com$/.test(h) ||
      /(^|\.)youtu\.be$/.test(h) ||
      /(^|\.)spotify\.com$/.test(h) ||
      /(^|\.)soundcloud\.com$/.test(h) ||
      /(^|\.)netflix\.com$/.test(h) ||
      /(^|\.)hulu\.com$/.test(h) ||
      /(^|\.)twitch\.tv$/.test(h) ||
      /(^|\.)vimeo\.com$/.test(h),
  },
]

export function inferKind(url: string): PageKind {
  try {
    const u = new URL(url)
    const host = u.hostname.toLowerCase()
    const path = u.pathname.toLowerCase()
    for (const r of RULES) {
      if (r.test(host, path)) return r.kind
    }
    return 'site'
  } catch {
    return 'site'
  }
}

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}
