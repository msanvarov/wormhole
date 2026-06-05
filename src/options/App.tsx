import { useEffect, useState } from "react";
import { WormholeMark } from "@/components/WormholeMark";
import { Storage } from "@/lib/storage";
import { DEFAULT_MODELS, type Provider, type Settings } from "@/lib/types";
import "./App.css";

export default function App() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [blacklistText, setBlacklistText] = useState("");
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [revealKey, setRevealKey] = useState(false);

  useEffect(() => {
    void Storage.getSettings().then((s) => {
      setSettings(s);
      setBlacklistText(s.blacklist.join("\n"));
    });
  }, []);

  if (!settings) return <div className="loading">Loading…</div>;

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function save() {
    if (!settings) return;
    const blacklist = blacklistText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const next: Settings = { ...settings, blacklist };
    await Storage.setSettings(next);
    setSettings(next);
    setSavedAt(Date.now());
    window.setTimeout(() => setSavedAt(null), 2400);
  }

  async function clearAll() {
    if (!confirm("Delete all captured pages and the ontology? This cannot be undone.")) return;
    await chrome.runtime.sendMessage({ type: "clear" });
    alert("Cleared.");
  }

  function onProviderChange(p: Provider) {
    if (!settings) return;
    const shouldUpdateModel =
      settings.model === DEFAULT_MODELS.anthropic || settings.model === DEFAULT_MODELS.openai;
    setSettings((prev) =>
      prev
        ? {
            ...prev,
            provider: p,
            model: shouldUpdateModel ? DEFAULT_MODELS[p] : prev.model,
          }
        : prev,
    );
  }

  return (
    <div className="page">
      <div className="brand">
        <WormholeMark size={28} detailed />
        <span className="brand-name">Wormhole</span>
      </div>

      <p className="lede">
        Wormhole quietly observes your browsing and organizes pages into an emergent two-level
        ontology using an LLM. Only the URL and page title are sent to the provider you configure
        below — never page content.
      </p>

      <section>
        <div className="toggle-row">
          <div>
            <div className="label">
              Enable capture
              <span className="sublabel">
                When off, no navigations are recorded or categorized.
              </span>
            </div>
          </div>
          <label className="toggle">
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(e) => update("enabled", e.target.checked)}
            />
            <span className="toggle-track" />
          </label>
        </div>
      </section>

      <section>
        <h2>Provider</h2>
        <p className="section-hint">
          Choose where categorization requests are sent. Your API key is stored locally in this
          browser only.
        </p>

        <div className="segmented" role="radiogroup" aria-label="Provider">
          <label>
            <input
              type="radio"
              name="provider"
              checked={settings.provider === "anthropic"}
              onChange={() => onProviderChange("anthropic")}
            />
            <span>Anthropic</span>
          </label>
          <label>
            <input
              type="radio"
              name="provider"
              checked={settings.provider === "openai"}
              onChange={() => onProviderChange("openai")}
            />
            <span>OpenAI</span>
          </label>
        </div>

        <div className="field">
          <span className="label">API key</span>
          <div className="key-input">
            <input
              type={revealKey ? "text" : "password"}
              value={settings.apiKey}
              onChange={(e) => update("apiKey", e.target.value)}
              placeholder={settings.provider === "anthropic" ? "sk-ant-…" : "sk-…"}
              spellCheck={false}
              autoComplete="off"
            />
            <button type="button" className="reveal-btn" onClick={() => setRevealKey((v) => !v)}>
              {revealKey ? "Hide" : "Show"}
            </button>
          </div>
          <small>
            Get a key from{" "}
            {settings.provider === "anthropic" ? (
              <a href="https://console.anthropic.com/" target="_blank" rel="noreferrer">
                console.anthropic.com
              </a>
            ) : (
              <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer">
                platform.openai.com
              </a>
            )}
            .
          </small>
        </div>

        <div className="field">
          <span className="label">Model</span>
          <input
            type="text"
            value={settings.model}
            onChange={(e) => update("model", e.target.value)}
            spellCheck={false}
          />
          <small>
            Default: <code>{DEFAULT_MODELS[settings.provider]}</code>
          </small>
        </div>
      </section>

      <section>
        <h2>Domains to skip</h2>
        <p className="section-hint">
          One hostname substring per line. Any URL whose hostname contains one of these is never
          captured — useful for banking, health portals, and other sensitive sites.
        </p>
        <textarea
          rows={5}
          value={blacklistText}
          onChange={(e) => setBlacklistText(e.target.value)}
          placeholder={"bank.com\nmail.google.com"}
        />
      </section>

      <div className="actions">
        <button className="primary" onClick={save}>
          Save changes
        </button>
        {savedAt && <span className="saved">Saved</span>}
        <button className="ghost" onClick={clearAll}>
          Clear all captured data
        </button>
      </div>

      <div className="page-credit">
        Built by{" "}
        <a href="https://sal-anvarov.com" target="_blank" rel="noreferrer">
          Sal
        </a>
      </div>
    </div>
  );
}
