const MIN_SELECTION = 8;
const BUTTON_ID = "wormhole-capture-btn";

let currentButton: HTMLDivElement | null = null;
let lastSelectionText = "";

function clearButton() {
  if (currentButton) {
    try {
      const el = currentButton as HTMLDivElement & { hidePopover?: () => void };
      if (typeof el.hidePopover === "function") el.hidePopover();
    } catch {
      // not open, ignore
    }
    currentButton.remove();
    currentButton = null;
  }
}

function send(text: string) {
  chrome.runtime
    .sendMessage({
      type: "highlight",
      payload: {
        url: location.href,
        title: document.title,
        text,
      },
    })
    .catch(() => {
      // background not awake; the message API still queues it
    });
}

function flash(button: HTMLDivElement) {
  button.dataset.state = "saved";
  button.innerHTML = "";

  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("width", "18");
  svg.setAttribute("height", "18");
  svg.setAttribute("viewBox", "0 0 40 40");

  const core = document.createElementNS(svgNS, "circle");
  core.setAttribute("cx", "20");
  core.setAttribute("cy", "20");
  core.setAttribute("r", "3");
  core.setAttribute("fill", "#fff");

  for (let i = 0; i < 3; i++) {
    const ring = document.createElementNS(svgNS, "circle");
    ring.setAttribute("cx", "20");
    ring.setAttribute("cy", "20");
    ring.setAttribute("r", "3");
    ring.setAttribute("fill", "none");
    ring.setAttribute("stroke", "#fff");
    ring.setAttribute("stroke-width", "1.6");

    const animR = document.createElementNS(svgNS, "animate");
    animR.setAttribute("attributeName", "r");
    animR.setAttribute("from", "3");
    animR.setAttribute("to", "20");
    animR.setAttribute("dur", "0.9s");
    animR.setAttribute("begin", `${i * 0.18}s`);
    animR.setAttribute("fill", "freeze");

    const animO = document.createElementNS(svgNS, "animate");
    animO.setAttribute("attributeName", "opacity");
    animO.setAttribute("from", "0.95");
    animO.setAttribute("to", "0");
    animO.setAttribute("dur", "0.9s");
    animO.setAttribute("begin", `${i * 0.18}s`);
    animO.setAttribute("fill", "freeze");

    ring.append(animR, animO);
    svg.append(ring);
  }
  svg.append(core);

  const label = document.createElement("span");
  label.textContent = "Captured";
  Object.assign(label.style, {
    fontSize: "12px",
    fontWeight: "500",
  } as Partial<CSSStyleDeclaration>);

  button.style.gap = "8px";
  button.append(svg);
  button.append(label);

  setTimeout(clearButton, 1100);
}

function showButton(x: number, y: number, text: string) {
  clearButton();

  const btn = document.createElement("div");
  btn.id = BUTTON_ID;
  btn.setAttribute("role", "button");
  btn.setAttribute("aria-label", "Save highlight to Wormhole");
  btn.textContent = "Save";

  try {
    btn.setAttribute("popover", "manual");
  } catch {
    // popover not supported; high z-index alone will have to do
  }

  Object.assign(btn.style, {
    position: "fixed",
    top: `${y}px`,
    left: `${x}px`,
    right: "auto",
    bottom: "auto",
    inset: "auto",
    margin: "0",
    zIndex: "2147483647",
    isolation: "isolate",
    contain: "layout",
    background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
    color: "#fff",
    padding: "6px 12px",
    border: "none",
    borderRadius: "999px",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
    fontSize: "12px",
    fontWeight: "500",
    letterSpacing: "-0.005em",
    boxShadow: "0 4px 14px rgba(37, 99, 235, 0.4), 0 1px 3px rgba(0, 0, 0, 0.2)",
    cursor: "pointer",
    userSelect: "none",
    pointerEvents: "auto",
    transition: "transform 120ms ease-out, opacity 120ms ease-out",
    opacity: "0",
    transform: "translateY(4px)",
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    width: "auto",
    height: "auto",
    overflow: "visible",
  } as Partial<CSSStyleDeclaration>);

  const dot = document.createElement("span");
  Object.assign(dot.style, {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    background: "radial-gradient(circle at center, #fff 0%, #93c5fd 50%, #2563eb 100%)",
    boxShadow: "0 0 6px rgba(255, 255, 255, 0.7)",
    flexShrink: "0",
  } as Partial<CSSStyleDeclaration>);
  btn.prepend(dot);

  btn.addEventListener("mousedown", (e) => {
    e.preventDefault();
    e.stopPropagation();
  });

  btn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (btn.dataset.state === "saved") return;
    send(text);
    flash(btn);
  });

  const host = document.documentElement || document.body;
  host.appendChild(btn);
  currentButton = btn;

  try {
    if (typeof (btn as HTMLDivElement & { showPopover?: () => void }).showPopover === "function") {
      (btn as HTMLDivElement & { showPopover: () => void }).showPopover();
    }
  } catch {
    // popover already open or feature unavailable
  }

  requestAnimationFrame(() => {
    btn.style.opacity = "1";
    btn.style.transform = "translateY(0)";
  });
}

let selectionCheckTimer: number | undefined;
let isMouseDown = false;

function maybeShowChip() {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed) {
    clearButton();
    lastSelectionText = "";
    return;
  }
  const text = sel.toString().trim();
  if (text.length < MIN_SELECTION) {
    clearButton();
    lastSelectionText = "";
    return;
  }
  if (text === lastSelectionText && currentButton) return;

  let range: Range;
  try {
    range = sel.getRangeAt(0);
  } catch {
    return;
  }
  const rect = range.getBoundingClientRect();
  if (!rect.width && !rect.height) return;

  lastSelectionText = text;
  const x = Math.min(window.innerWidth - 80, Math.max(8, rect.right - 40));
  const y = Math.max(8, rect.top - 36);
  showButton(x, y, text);
}

function scheduleCheck(delay = 80) {
  if (selectionCheckTimer !== undefined) clearTimeout(selectionCheckTimer);
  selectionCheckTimer = window.setTimeout(() => {
    selectionCheckTimer = undefined;
    if (isMouseDown) return;
    maybeShowChip();
  }, delay);
}

document.addEventListener("selectionchange", () => scheduleCheck(120), true);

document.addEventListener(
  "mousedown",
  () => {
    isMouseDown = true;
  },
  true,
);

document.addEventListener(
  "mouseup",
  () => {
    isMouseDown = false;
    scheduleCheck(20);
  },
  true,
);

document.addEventListener(
  "pointerup",
  () => {
    isMouseDown = false;
    scheduleCheck(20);
  },
  true,
);

document.addEventListener(
  "keyup",
  (e) => {
    if (
      e.shiftKey ||
      e.ctrlKey ||
      e.metaKey ||
      e.key === "ArrowUp" ||
      e.key === "ArrowDown" ||
      e.key === "ArrowLeft" ||
      e.key === "ArrowRight"
    ) {
      scheduleCheck(20);
    }
  },
  true,
);

document.addEventListener(
  "mousedown",
  (e) => {
    if (!currentButton) return;
    if (e.target === currentButton || (currentButton.contains(e.target as Node) ?? false)) return;
    if (currentButton.dataset.state === "saved") return;
    clearButton();
  },
  true,
);

document.addEventListener("scroll", () => clearButton(), { passive: true, capture: true });

chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === "capture-selection") {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return;
    const text = sel.toString().trim();
    if (text.length < MIN_SELECTION) return;
    send(text);
  }
});

export {};
