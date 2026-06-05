export type PageKind =
  | "site"
  | "conversation"
  | "social"
  | "shopping"
  | "media"
  | "docs"
  | "search"
  | "code";

export interface PageEntry {
  url: string;
  title: string;
  category: string;
  topic?: string | null;
  people?: string[];
  kind?: PageKind;
  visitedAt: number;
}

export interface QueueItem {
  url: string;
  title: string;
  visitedAt: number;
}

export interface Highlight {
  id: string;
  url: string;
  title: string;
  text: string;
  capturedAt: number;
}

export interface JourneySummary {
  topic: string;
  text: string;
  generatedAt: number;
}

export interface Journey {
  topic: string;
  entries: PageEntry[];
  people: string[];
  firstSeen: number;
  lastSeen: number;
  highlightCount: number;
}

export type Taxonomy = Record<string, Record<string, number>>;

export type Provider = "anthropic" | "openai";

export interface Settings {
  apiKey: string;
  provider: Provider;
  model: string;
  blacklist: string[];
  enabled: boolean;
}

export const DEFAULT_MODELS: Record<Provider, string> = {
  anthropic: "claude-haiku-4-5-20251001",
  openai: "gpt-4o-mini",
};

export const DEFAULT_SETTINGS: Settings = {
  apiKey: "",
  provider: "anthropic",
  model: DEFAULT_MODELS.anthropic,
  blacklist: [],
  enabled: true,
};

export function splitCategory(category: string): [string, string] {
  const slash = category.indexOf("/");
  const top = (slash === -1 ? category : category.slice(0, slash)).trim() || "Other";
  const sub = (slash === -1 ? "General" : category.slice(slash + 1)).trim() || "General";
  return [top, sub];
}
