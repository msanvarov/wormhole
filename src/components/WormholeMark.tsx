import { useId } from 'react'
import './WormholeMark.css'

interface Props {
  size?: number
  animated?: boolean
  active?: boolean
  className?: string
}

export function WormholeMark({
  size = 18,
  animated = true,
  active = false,
  className = '',
}: Props) {
  const id = 'wh-' + useId().replace(/:/g, '')
  const cls =
    'wh-mark' +
    (animated ? ' animated' : '') +
    (active ? ' active' : '') +
    (className ? ' ' + className : '')
  return (
    <span className={cls} style={{ width: size, height: size }} aria-hidden="true">
      <svg viewBox="0 0 100 100" width="100%" height="100%">
        <defs>
          <radialGradient id={id} cx="50%" cy="50%" r="55%">
            <stop offset="0%" stopColor="#050507" />
            <stop offset="25%" stopColor="#2e1065" />
            <stop offset="55%" stopColor="#6d28d9" />
            <stop offset="85%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#c4b5fd" />
          </radialGradient>
        </defs>
        <circle cx="50" cy="50" r="48" fill={`url(#${id})`} />
        <g fill="none" strokeLinecap="round">
          <circle
            className="wh-ring r1"
            cx="50"
            cy="50"
            r="40"
            stroke="rgba(255,255,255,0.12)"
            strokeWidth="1.2"
            strokeDasharray="3 6"
          />
          <circle
            className="wh-ring r2"
            cx="50"
            cy="50"
            r="28"
            stroke="rgba(255,255,255,0.2)"
            strokeWidth="1"
            strokeDasharray="2 5"
          />
          <circle
            className="wh-ring r3"
            cx="50"
            cy="50"
            r="17"
            stroke="rgba(255,255,255,0.34)"
            strokeWidth="0.8"
            strokeDasharray="2 4"
          />
          <circle
            className="wh-ring r4"
            cx="50"
            cy="50"
            r="9"
            stroke="rgba(255,255,255,0.55)"
            strokeWidth="0.6"
            strokeDasharray="1.5 3"
          />
        </g>
        <circle cx="50" cy="50" r="3" fill="#fff" opacity="0.92" />
      </svg>
    </span>
  )
}
