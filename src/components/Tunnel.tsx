import { useId } from "react";
import "./Tunnel.css";

export function TunnelWalls() {
  const raw = useId().replace(/:/g, "");
  const gradId = `tw-${raw}`;
  return (
    <svg
      className="tunnel-walls"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="50%" y1="100%" x2="50%" y2="0%">
          <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.45" />
          <stop offset="60%" stopColor="#3b82f6" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#1e3a8a" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g stroke={`url(#${gradId})`} fill="none">
        <line x1="0" y1="100" x2="44" y2="0" strokeWidth="0.45" />
        <line x1="100" y1="100" x2="56" y2="0" strokeWidth="0.45" />
        <line x1="14" y1="100" x2="46" y2="0" strokeWidth="0.32" />
        <line x1="86" y1="100" x2="54" y2="0" strokeWidth="0.32" />
        <line x1="28" y1="100" x2="48" y2="0" strokeWidth="0.22" />
        <line x1="72" y1="100" x2="52" y2="0" strokeWidth="0.22" />
      </g>
      <g stroke={`url(#${gradId})`} fill="none" opacity="0.55">
        <ellipse cx="50" cy="-2" rx="46" ry="6" strokeWidth="0.25" />
        <ellipse cx="50" cy="4" rx="48" ry="9" strokeWidth="0.2" />
      </g>
    </svg>
  );
}

export function TunnelParticles() {
  return (
    <div className="tunnel-particles" aria-hidden="true">
      <span className="tp tp-1" />
      <span className="tp tp-2" />
      <span className="tp tp-3" />
      <span className="tp tp-4" />
      <span className="tp tp-5" />
    </div>
  );
}
