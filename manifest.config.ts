import { defineManifest } from "@crxjs/vite-plugin";
import pkg from "./package.json";

export default defineManifest({
  manifest_version: 3,
  name: "Wormhole",
  description: "Quietly captures your browsing and organizes it into an emergent ontology.",
  version: pkg.version,
  icons: {
    16: "public/icon-16.png",
    32: "public/icon-32.png",
    48: "public/icon-48.png",
    128: "public/icon-128.png",
  },
  action: {
    default_icon: {
      16: "public/icon-16.png",
      32: "public/icon-32.png",
      48: "public/icon-48.png",
      128: "public/icon-128.png",
    },
    default_popup: "src/popup/index.html",
    default_title: "Wormhole",
  },
  options_page: "src/options/index.html",
  background: {
    service_worker: "src/background/service-worker.ts",
    type: "module",
  },
  side_panel: {
    default_path: "src/sidepanel/index.html",
  },
  content_scripts: [
    {
      js: ["src/content/content-script.ts"],
      matches: ["<all_urls>"],
      run_at: "document_idle",
      all_frames: true,
      match_about_blank: true,
    },
  ],
  commands: {
    "capture-selection": {
      suggested_key: {
        default: "Ctrl+Shift+H",
        mac: "Command+Shift+H",
      },
      description: "Capture the current text selection as a highlight",
    },
    "toggle-capture": {
      suggested_key: {
        default: "Ctrl+Shift+P",
        mac: "Command+Shift+P",
      },
      description: "Toggle auto-capture on/off",
    },
  },
  permissions: ["webNavigation", "tabs", "storage", "unlimitedStorage", "alarms", "sidePanel"],
  host_permissions: ["https://api.anthropic.com/*", "https://api.openai.com/*"],
});
