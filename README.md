# Wormhole

A Chrome extension that quietly captures every page you visit and organizes
them into a two-level ontology (TopLevel / SubLevel) using an LLM.

Built with React + Vite + CRXJS, MV3.

## How it works

1. The background service worker listens to `chrome.webNavigation.onCompleted`
   and queues `{ url, title, visitedAt }` for each new main-frame navigation.
2. Every 30 seconds (or when the queue hits 10 pages, whichever comes first)
   the queue is flushed to your chosen LLM provider (Anthropic or OpenAI)
   along with the current taxonomy, so the model reuses existing TopLevel /
   SubLevel labels and only invents new ones when nothing fits.
3. The categorized entries are stored in `chrome.storage.local`. The popup
   gives a quick category tree, the side panel a richer dashboard.

Only the URL and page title are sent to the provider — never page content.
URLs already categorized within the last 30 days are skipped. You can
blacklist sensitive hostnames in Settings.

## Develop

```bash
npm install
npm run dev
```

Open `chrome://extensions`, enable Developer Mode, choose **Load unpacked**,
and point at the `dist/` directory that `vite` produces.

## Build

```bash
npm run build
```

Produces `dist/` and a zip in `release/`.

## Project structure

```
src/
├── background/     service worker — capture, batch, categorize
├── lib/            types, storage wrapper, LLM categorizer
├── popup/          extension popup — category tree
├── sidepanel/      side-panel dashboard
└── options/        settings page — API key, provider, blacklist
manifest.config.ts  MV3 manifest
```

## First-run

After loading the unpacked extension the options page will open
automatically. Pick a provider, paste an API key, save. Then just browse —
the extension batches and categorizes in the background.
