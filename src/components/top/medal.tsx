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

// A drawn crown: five points with jewelled tips over a banded base, shaded
// in the gold ramp. Gradient ids are per instance so several crowns on one
// page don't share defs.
export function CrownMark({
  metal = METALS[0],
  className,
}: {
  metal?: Metal;
  className?: string;
}) {
  const id = useId().replace(/:/g, "");
  const body = `crown-body-${id}`;
  const band = `crown-band-${id}`;
  const { light, base, dark } = metal;

  return (
    <svg
      viewBox="0 0 64 46"
      className={cn("overflow-visible", className)}
      style={{ filter: `drop-shadow(0 3px 6px ${tint(base, 0.45)})` }}
      role="img"
      aria-label="Корона"
    >
      <defs>
        <linearGradient id={body} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={light} />
          <stop offset="0.45" stopColor={base} />
          <stop offset="1" stopColor={dark} />
        </linearGradient>
        <linearGradient id={band} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={base} />
          <stop offset="1" stopColor={dark} />
        </linearGradient>
      </defs>

      <path
        d="M9 34 6.5 14.5c-.3-2.3 1.9-3.4 3.6-2L20 21 29.6 6.6c1.2-1.8 3.6-1.8 4.8 0L44 21l9.9-8.5c1.7-1.4 3.9-.3 3.6 2L55 34Z"
        fill={`url(#${body})`}
        stroke={dark}
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path
        d="M11 31.5 9 16.5M32 9.5 23 23"
        stroke={light}
        strokeOpacity="0.55"
        strokeWidth="1.4"
        strokeLinecap="round"
        fill="none"
      />
      <rect
        x="7.5"
        y="33"
        width="49"
        height="9"
        rx="3"
        fill={`url(#${band})`}
        stroke={dark}
        strokeWidth="1.2"
      />
      <path
        d="M32 34.6 35 37.5 32 40.4 29 37.5Z"
        fill={light}
        stroke={dark}
        strokeWidth="0.8"
      />
      <circle cx="20" cy="37.5" r="1.6" fill={light} fillOpacity="0.85" />
      <circle cx="44" cy="37.5" r="1.6" fill={light} fillOpacity="0.85" />
      {[
        [8.2, 11.5, 3],
        [32, 4.2, 3.6],
        [55.8, 11.5, 3],
      ].map(([cx, cy, r]) => (
        <circle
          key={cx}
          cx={cx}
          cy={cy}
          r={r}
          fill={light}
          stroke={dark}
          strokeWidth="1"
        />
      ))}
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
