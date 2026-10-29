import { useId, type ReactNode } from "react";

import { cn } from "@/lib/utils";

// Each medal is a small metal ramp: a highlight, the body colour and the
// shadow. Rings, crown and step numerals all draw from the same three stops
// so the podium reads as one material.
export type Metal = {
  label: string;
  light: string;
  base: string;
  dark: string;
};

export const METALS: Metal[] = [
  { label: "Золото", light: "#fff4c7", base: "#f5c451", dark: "#a8690f" },
  { label: "Серебро", light: "#ffffff", base: "#c7d0dc", dark: "#5f6b7d" },
  { label: "Бронза", light: "#ffd9b8", base: "#e0915a", dark: "#7f421c" },
];

// Hex colour plus alpha.
export const tint = (hex: string, alpha: number) =>
  hex +
  Math.round(alpha * 255)
    .toString(16)
    .padStart(2, "0");

const ringGradient = ({ light, base, dark }: Metal) =>
  `conic-gradient(from 200deg, ${light}, ${base} 22%, ${dark} 42%, ${base} 58%, ${light} 72%, ${base} 86%, ${light})`;

// An unbroken metal ring around the avatar with a soft glow of the same metal.
export function MedalRing({
  metal,
  glow,
  children,
}: {
  metal: Metal;
  glow: number;
  children: ReactNode;
}) {
  return (
    <div
      className="rounded-full p-[3px]"
      style={{
        background: ringGradient(metal),
        boxShadow: `0 0 0 1px ${tint(metal.dark, 0.5)}, 0 10px ${glow}px ${tint(metal.base, 0.35)}`,
      }}
    >
      <div className="rounded-full bg-card p-[3px]">{children}</div>
    </div>
  );
}

// A drawn crown for first place: five pearl-tipped points over a curved
// band set with a ruby between two sapphires. Side shading on the points
// and band gives it a rounded, metal body. Gradient ids are per instance so
// several crowns on one page don't share defs.
const CROWN_POINTS =
  "M17 62 L9 27 L25 45 L31 19 L41 41 L50 9 L59 41 L69 19 L75 45 L91 27 L83 62 Q50 72 17 62 Z";
const CROWN_BAND = "M15 60 Q50 71 85 60 L83 75 Q50 86 17 75 Z";
const CROWN_PEARLS = [
  [9, 25.5, 4.4],
  [31, 17, 4.4],
  [50, 7, 5.2],
  [69, 17, 4.4],
  [91, 25.5, 4.4],
];

export function CrownMark({ className }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  const ref = (name: string) => `url(#${name}-${id})`;

  return (
    <svg
      viewBox="0 0 100 86"
      className={cn("overflow-visible", className)}
      style={{ filter: "drop-shadow(0 3px 8px rgba(245, 196, 81, 0.45))" }}
      role="img"
      aria-label="Корона"
    >
      <defs>
        <linearGradient id={`gold-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff3c2" />
          <stop offset="0.3" stopColor="#ffd95a" />
          <stop offset="0.68" stopColor="#e3a21f" />
          <stop offset="1" stopColor="#9c5d0b" />
        </linearGradient>
        <linearGradient id={`band-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe17a" />
          <stop offset="0.5" stopColor="#e2a024" />
          <stop offset="1" stopColor="#8a4f08" />
        </linearGradient>
        <linearGradient id={`curve-${id}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#5a2e00" stopOpacity="0.55" />
          <stop offset="0.3" stopColor="#5a2e00" stopOpacity="0" />
          <stop offset="0.7" stopColor="#5a2e00" stopOpacity="0" />
          <stop offset="1" stopColor="#5a2e00" stopOpacity="0.55" />
        </linearGradient>
        <radialGradient id={`pearl-${id}`} cx="0.35" cy="0.3" r="0.75">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.45" stopColor="#fff1c9" />
          <stop offset="1" stopColor="#c28d2c" />
        </radialGradient>
        <radialGradient id={`ruby-${id}`} cx="0.38" cy="0.32" r="0.8">
          <stop offset="0" stopColor="#ffb3c1" />
          <stop offset="0.35" stopColor="#f0284f" />
          <stop offset="1" stopColor="#6e0418" />
        </radialGradient>
        <radialGradient id={`sapphire-${id}`} cx="0.38" cy="0.32" r="0.8">
          <stop offset="0" stopColor="#cfe6ff" />
          <stop offset="0.35" stopColor="#2f7bf0" />
          <stop offset="1" stopColor="#0a2463" />
        </radialGradient>
      </defs>

      <g stroke="#6b3a05" strokeWidth="1.6" strokeLinejoin="round">
        <path d={CROWN_POINTS} fill={ref("gold")} />
        <path d={CROWN_POINTS} fill={ref("curve")} stroke="none" />
        <path d={CROWN_BAND} fill={ref("band")} />
        <path d={CROWN_BAND} fill={ref("curve")} stroke="none" />
      </g>

      <g stroke="#fffbe6" strokeLinecap="round" fill="none">
        <path d="M48 15 L43 38" strokeOpacity="0.75" strokeWidth="2.2" />
        <path d="M12.5 33 L18 55" strokeOpacity="0.45" strokeWidth="1.8" />
        <path d="M30 24 L27 40" strokeOpacity="0.5" strokeWidth="1.6" />
        <path
          d="M20 64 Q50 73.5 80 64"
          stroke="#fff3b8"
          strokeOpacity="0.8"
          strokeWidth="1.4"
        />
      </g>

      <g stroke="#5c3204" strokeWidth="1">
        <ellipse cx="50" cy="74" rx="6" ry="5" fill={ref("ruby")} />
        <circle cx="31" cy="71.2" r="3.6" fill={ref("sapphire")} />
        <circle cx="69" cy="71.2" r="3.6" fill={ref("sapphire")} />
      </g>
      <g fill="#ffffff">
        <circle cx="48" cy="72" r="1.5" fillOpacity="0.9" />
        <circle cx="30" cy="69.8" r="1" fillOpacity="0.85" />
        <circle cx="68" cy="69.8" r="1" fillOpacity="0.85" />
      </g>

      <g stroke="#7a4a0c" strokeWidth="1">
        {CROWN_PEARLS.map(([cx, cy, r]) => (
          <circle key={cx} cx={cx} cy={cy} r={r} fill={ref("pearl")} />
        ))}
      </g>
    </svg>
  );
}

// The place number cut into its podium step, in the medal's metal.
export function StepNumeral({
  metal,
  place,
  className,
}: {
  metal: Metal;
  place: number;
  className?: string;
}) {
  return (
    <span
      className={cn("block font-black leading-none", className)}
      style={{
        backgroundImage: `linear-gradient(180deg, ${metal.light}, ${metal.base} 55%, ${metal.dark})`,
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        color: "transparent",
      }}
    >
      {place}
    </span>
  );
}

// Players without a Telegram photo get a two-tone gradient picked from their
// name, so the same player always wears the same colours.
export function initialsBackground(name: string) {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.codePointAt(0)!) | 0;
  const hue = Math.abs(hash) % 360;
  return `linear-gradient(140deg, hsl(${hue} 55% 46%), hsl(${(hue + 40) % 360} 60% 28%))`;
}
