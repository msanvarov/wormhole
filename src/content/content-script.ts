const MIN_SELECTION = 8
const BUTTON_ID = 'wormhole-capture-btn'

let currentButton: HTMLDivElement | null = null
let lastSelectionText = ''

function clearButton() {
  if (currentButton) {
    currentButton.remove()
    currentButton = null
  }
}

function send(text: string) {
  chrome.runtime
    .sendMessage({
      type: 'highlight',
      payload: {
        url: location.href,
        title: document.title,
        text,
      },
    })
    .catch(() => {
      // background not awake; the message API still queues it
    })
}

function flash(button: HTMLDivElement) {
  button.dataset.state = 'saved'
  button.innerHTML = ''

  const svgNS = 'http://www.w3.org/2000/svg'
  const svg = document.createElementNS(svgNS, 'svg')
  svg.setAttribute('width', '18')
  svg.setAttribute('height', '18')
  svg.setAttribute('viewBox', '0 0 40 40')

  const core = document.createElementNS(svgNS, 'circle')
  core.setAttribute('cx', '20')
  core.setAttribute('cy', '20')
  core.setAttribute('r', '3')
  core.setAttribute('fill', '#fff')

  for (let i = 0; i < 3; i++) {
    const ring = document.createElementNS(svgNS, 'circle')
    ring.setAttribute('cx', '20')
    ring.setAttribute('cy', '20')
    ring.setAttribute('r', '3')
    ring.setAttribute('fill', 'none')
    ring.setAttribute('stroke', '#fff')
    ring.setAttribute('stroke-width', '1.6')

    const animR = document.createElementNS(svgNS, 'animate')
    animR.setAttribute('attributeName', 'r')
    animR.setAttribute('from', '3')
    animR.setAttribute('to', '20')
    animR.setAttribute('dur', '0.9s')
    animR.setAttribute('begin', `${i * 0.18}s`)
    animR.setAttribute('fill', 'freeze')

    const animO = document.createElementNS(svgNS, 'animate')
    animO.setAttribute('attributeName', 'opacity')
    animO.setAttribute('from', '0.95')
    animO.setAttribute('to', '0')
    animO.setAttribute('dur', '0.9s')
    animO.setAttribute('begin', `${i * 0.18}s`)
    animO.setAttribute('fill', 'freeze')

    ring.append(animR, animO)
    svg.append(ring)
  }
  svg.append(core)

  const label = document.createElement('span')
  label.textContent = 'Captured'
  Object.assign(label.style, {
    fontSize: '12px',
    fontWeight: '500',
  } as Partial<CSSStyleDeclaration>)

  button.style.gap = '8px'
  button.append(svg)
  button.append(label)

  setTimeout(clearButton, 1100)
}

function showButton(x: number, y: number, text: string) {
  clearButton()

  const btn = document.createElement('div')
  btn.id = BUTTON_ID
  btn.setAttribute('role', 'button')
  btn.setAttribute('aria-label', 'Save highlight to Wormhole')
  btn.textContent = 'Save'

  Object.assign(btn.style, {
    position: 'fixed',
    top: `${y}px`,
    left: `${x}px`,
    zIndex: '2147483647',
    background: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)',
    color: '#fff',
    padding: '6px 12px',
    borderRadius: '999px',
    fontFamily:
      "'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
    fontSize: '12px',
    fontWeight: '500',
    letterSpacing: '-0.005em',
    boxShadow: '0 4px 14px rgba(124, 58, 237, 0.4), 0 1px 3px rgba(0, 0, 0, 0.2)',
    cursor: 'pointer',
    userSelect: 'none',
    transition: 'transform 120ms ease-out, opacity 120ms ease-out',
    opacity: '0',
    transform: 'translateY(4px)',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
  } as Partial<CSSStyleDeclaration>)

  const dot = document.createElement('span')
  Object.assign(dot.style, {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: 'radial-gradient(circle at center, #fff 0%, #c4b5fd 50%, #7c3aed 100%)',
    boxShadow: '0 0 6px rgba(255, 255, 255, 0.7)',
    flexShrink: '0',
  } as Partial<CSSStyleDeclaration>)
  btn.prepend(dot)

  btn.addEventListener('mousedown', (e) => {
    e.preventDefault()
    e.stopPropagation()
  })

  btn.addEventListener('click', (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (btn.dataset.state === 'saved') return
    send(text)
    flash(btn)
  })

  document.body.appendChild(btn)
  currentButton = btn

  requestAnimationFrame(() => {
    btn.style.opacity = '1'
    btn.style.transform = 'translateY(0)'
  })
}

document.addEventListener('mouseup', () => {
  setTimeout(() => {
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed) {
      clearButton()
      lastSelectionText = ''
      return
    }
    const text = sel.toString().trim()
    if (text.length < MIN_SELECTION) {
      clearButton()
      lastSelectionText = ''
      return
    }
    if (text === lastSelectionText && currentButton) return

    const range = sel.getRangeAt(0)
    const rect = range.getBoundingClientRect()
    if (!rect.width && !rect.height) return

    lastSelectionText = text
    const x = Math.min(window.innerWidth - 80, Math.max(8, rect.right - 40))
    const y = Math.max(8, rect.top - 36)
    showButton(x, y, text)
  }, 10)
})

document.addEventListener(
  'mousedown',
  (e) => {
    if (!currentButton) return
    if (e.target === currentButton || (currentButton.contains(e.target as Node) ?? false)) return
    if (currentButton.dataset.state === 'saved') return
    clearButton()
  },
  true,
)

document.addEventListener('scroll', () => clearButton(), { passive: true, capture: true })

chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === 'capture-selection') {
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed) return
    const text = sel.toString().trim()
    if (text.length < MIN_SELECTION) return
    send(text)
  }
})

export {}
