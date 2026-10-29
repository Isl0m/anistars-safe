"use client";

import { useEffect, useRef, useState } from "react";

import { fmt, fmtCompact } from "./ui";

// Validated against the dark card surface (#020817): lightness band, chroma
// and 3:1 contrast all pass. Every chart here is a single series, so one hue.
const SERIES = "#3987e5";
const GRID = "hsl(217.2 32.6% 17.5%)";
const AXIS_TEXT = "hsl(215 20.2% 65.1%)";

export type Point = { day: string; value: number };

const dayLabel = (day: string) =>
  new Date(`${day}T00:00:00`).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
  });

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(320);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) =>
      setWidth(Math.max(200, Math.floor(entry.contentRect.width)))
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return { ref, width };
}

function niceMax(v: number) {
  if (v <= 0) return 1;
  const pow = 10 ** Math.floor(Math.log10(v));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * pow >= v) ?? 10;
  return step * pow;
}

/** Column with a 4px rounded data end and a square foot on the baseline. */
function columnPath(x: number, y: number, w: number, base: number) {
  const h = base - y;
  if (h <= 0) return "";
  const r = Math.min(4, w / 2, h);
  return `M${x},${base}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${base}Z`;
}

/**
 * Daily values as columns (up to 45 days) or a 2px line with a soft area
 * (longer ranges, where columns would be slivers). Hover or tap shows the day.
 */
export function TimeChart({
  points,
  format = fmt,
  height = 150,
  unit,
}: {
  points: Point[];
  format?: (v: number) => string;
  height?: number;
  unit?: string;
}) {
  const { ref, width } = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);

  const pad = { top: 8, right: 4, bottom: 20, left: 40 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const base = pad.top + plotH;
  const max = niceMax(Math.max(0, ...points.map((p) => p.value)));
  const n = points.length || 1;
  const slot = plotW / n;
  const asLine = n > 45;
  const yOf = (v: number) => base - (v / max) * plotH;
  const xCenter = (i: number) => pad.left + slot * i + slot / 2;
  const barW = Math.max(1, Math.min(24, slot - 2));

  const ticks = [0, max / 2, max];
  const labelIdx = Array.from(new Set([0, Math.floor((n - 1) / 2), n - 1]));

  const linePath = points
    .map((p, i) => `${i ? "L" : "M"}${xCenter(i)},${yOf(p.value)}`)
    .join("");
  const areaPath = points.length
    ? `${linePath}L${xCenter(n - 1)},${base}L${xCenter(0)},${base}Z`
    : "";

  const pick = (clientX: number, rect: DOMRect) => {
    const i = Math.floor((clientX - rect.left - pad.left) / slot);
    setActive(i >= 0 && i < n ? i : null);
  };

  const hovered = active !== null ? points[active] : null;
  const tipLeft =
    active !== null ? Math.min(Math.max(xCenter(active), 60), width - 60) : 0;

  return (
    <div ref={ref} className="relative select-none">
      <svg
        width={width}
        height={height}
        role="img"
        aria-label="График по дням"
        className="block touch-pan-y"
        onPointerMove={(e) =>
          pick(e.clientX, e.currentTarget.getBoundingClientRect())
        }
        onPointerDown={(e) =>
          pick(e.clientX, e.currentTarget.getBoundingClientRect())
        }
        onPointerLeave={() => setActive(null)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={pad.left}
              x2={width - pad.right}
              y1={yOf(t)}
              y2={yOf(t)}
              stroke={GRID}
              strokeWidth={1}
            />
            <text
              x={pad.left - 6}
              y={yOf(t)}
              dy="0.32em"
              textAnchor="end"
              fontSize={10}
              fill={AXIS_TEXT}
            >
              {fmtCompact(t)}
            </text>
          </g>
        ))}

        {active !== null && (
          <rect
            x={pad.left + slot * active}
            y={pad.top}
            width={slot}
            height={plotH}
            fill="white"
            opacity={0.06}
          />
        )}

        {asLine ? (
          <>
            <path d={areaPath} fill={SERIES} opacity={0.15} />
            <path
              d={linePath}
              fill="none"
              stroke={SERIES}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {hovered && active !== null && (
              <circle
                cx={xCenter(active)}
                cy={yOf(hovered.value)}
                r={4}
                fill={SERIES}
                stroke="hsl(222.2 84% 4.9%)"
                strokeWidth={2}
              />
            )}
          </>
        ) : (
          points.map((p, i) => (
            <path
              key={p.day}
              d={columnPath(xCenter(i) - barW / 2, yOf(p.value), barW, base)}
              fill={SERIES}
              opacity={active === null || active === i ? 1 : 0.55}
            />
          ))
        )}

        {labelIdx.map((i) =>
          points[i] ? (
            <text
              key={i}
              x={xCenter(i)}
              y={height - 6}
              textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"}
              fontSize={10}
              fill={AXIS_TEXT}
            >
              {dayLabel(points[i].day)}
            </text>
          ) : null
        )}
      </svg>

      {hovered && (
        <div
          className="pointer-events-none absolute top-0 -translate-x-1/2 rounded-md border bg-popover px-2 py-1 text-xs shadow"
          style={{ left: tipLeft }}
        >
          <span className="text-muted-foreground">
            {dayLabel(hovered.day)}:{" "}
          </span>
          <span className="font-semibold tabular-nums">
            {format(hovered.value)}
            {unit ? ` ${unit}` : ""}
          </span>
        </div>
      )}

      <details className="mt-1 text-xs text-muted-foreground">
        <summary className="cursor-pointer">Таблица</summary>
        <table className="mt-1 w-full tabular-nums">
          <tbody>
            {[...points].reverse().map((p) => (
              <tr key={p.day} className="border-b border-border/50">
                <td className="py-0.5">{dayLabel(p.day)}</td>
                <td className="py-0.5 text-right text-foreground">
                  {format(p.value)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}

/** Ranked horizontal bars with the value written at the end. */
export function BarList({
  items,
  format = fmt,
}: {
  items: { key: string; label: React.ReactNode; value: number }[];
  format?: (v: number) => string;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.key} className="space-y-1">
          <div className="flex items-baseline justify-between gap-2 text-sm">
            <span className="min-w-0 truncate">{item.label}</span>
            <span className="shrink-0 tabular-nums text-muted-foreground">
              {format(item.value)}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-muted">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.max(1, (item.value / max) * 100)}%`,
                background: SERIES,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
