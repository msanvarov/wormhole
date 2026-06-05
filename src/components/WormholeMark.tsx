import { useId } from "react";
import "./WormholeMark.css";

interface Props {
  size?: number;
  animated?: boolean;
  active?: boolean;
  detailed?: boolean;
  className?: string;
}

const ARM_PATH =
  "M 100 8 Q 192 8 192 100 Q 192 162 132 168 Q 100 168 100 136 Q 100 110 132 110 Q 150 110 144 132";

export function WormholeMark({
  size = 18,
  animated = true,
  active = false,
  detailed = false,
  className = "",
}: Props) {
  const raw = useId().replace(/:/g, "");
  const bgId = `wh-bg-${raw}`;
  const armId = `wh-arm-${raw}`;
  const glowId = `wh-glow-${raw}`;

  const cls =
    "wh-mark" +
    (animated ? " animated" : "") +
    (active ? " active" : "") +
    (detailed ? " detailed" : "") +
    (className ? " " + className : "");

  return (
    <span className={cls} style={{ width: size, height: size }} aria-hidden="true">
      <svg viewBox="0 0 200 200" width="100%" height="100%">
        <defs>
          <radialGradient id={bgId} cx="50%" cy="50%" r="55%">
            <stop offset="0%" stopColor="#1e3a8a" />
            <stop offset="65%" stopColor="#1d4ed8" />
            <stop offset="100%" stopColor="#3b82f6" />
          </radialGradient>
          <linearGradient id={armId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f5f9ff" />
            <stop offset="55%" stopColor="#dbeafe" />
            <stop offset="100%" stopColor="#93c5fd" />
          </linearGradient>
          <radialGradient id={glowId} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.6" />
            <stop offset="70%" stopColor="#1d4ed8" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#1e3a8a" stopOpacity="0" />
          </radialGradient>
        </defs>

        <circle cx="100" cy="100" r="98" fill={`url(#${glowId})`} />
        <circle cx="100" cy="100" r="94" fill={`url(#${bgId})`} />

        <g className="wh-swirl">
          <path
            d={ARM_PATH}
            fill="none"
            stroke={`url(#${armId})`}
            strokeWidth="18"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d={ARM_PATH}
            fill="none"
            stroke={`url(#${armId})`}
            strokeWidth="18"
            strokeLinecap="round"
            strokeLinejoin="round"
            transform="rotate(180 100 100)"
          />
        </g>

        <circle cx="100" cy="100" r="7" fill="#ffffff" opacity="0.92" />
        <circle cx="100" cy="100" r="3" fill="#ffffff" />

        {detailed && (
          <circle
            cx="100"
            cy="100"
            r="96"
            fill="none"
            stroke="#dbeafe"
            strokeWidth="1.2"
            strokeOpacity="0.45"
          />
        )}
      </svg>
    </span>
  );
}
