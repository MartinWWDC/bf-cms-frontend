"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";

import { useFormat } from "@/i18n/use-format";

import type { TrendPoint } from "../types";

interface TrendChartProps {
  series: TrendPoint[];
  /** The period just before, with the same number of points. Drawn dashed and muted. */
  previous: TrendPoint[] | null;
  formatValue: (value: number) => string;
  /** Name of the metric, for the chart's accessible label. */
  label: string;
}

// Drawing space. The SVG stretches to its box; strokes keep their width.
const W = 600;
const H = 160;
const PAD_TOP = 8;
const PAD_BOTTOM = 4;

/**
 * One measure over time: a 2px line on a soft area, the previous period as a dashed muted
 * line on the same axis, a recessive grid, and a crosshair with a tooltip on hover.
 * A single series, so there is no legend box: the card title names it and the tooltip
 * labels both periods.
 */
export function TrendChart({ series, previous, formatValue, label }: TrendChartProps) {
  const t = useTranslations("dashboards.chart");
  const format = useFormat();
  const gradientId = useId();
  const [active, setActive] = useState<number | null>(null);

  if (series.length === 0) return <p className="py-8 text-center text-sm text-muted-foreground">{t("empty")}</p>;

  const values = [...series.map((point) => point.value), ...(previous ?? []).map((point) => point.value)];
  // One axis, anchored at zero, with a little headroom.
  const max = Math.max(...values, 0) * 1.08 || 1;
  const min = Math.min(...values, 0);
  const span = max - min || 1;
  const x = (index: number, count: number) => (count <= 1 ? W / 2 : (index / (count - 1)) * W);
  const y = (value: number) => PAD_TOP + (1 - (value - min) / span) * (H - PAD_TOP - PAD_BOTTOM);
  const path = (points: TrendPoint[]) =>
    points.map((point, index) => `${index === 0 ? "M" : "L"}${x(index, points.length).toFixed(1)},${y(point.value).toFixed(1)}`).join(" ");

  const line = path(series);
  const area = `${line} L${x(series.length - 1, series.length).toFixed(1)},${y(min).toFixed(1)} L${x(0, series.length).toFixed(1)},${y(min).toFixed(1)} Z`;
  const periodLabel = (iso: string) => format.date(iso);
  const point = active === null ? null : series[active];
  const previousPoint = active === null ? null : (previous?.[active] ?? null);
  const activeLeft = active === null ? 0 : (x(active, series.length) / W) * 100;

  const pick = (clientX: number, element: HTMLElement) => {
    const box = element.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - box.left) / box.width));
    setActive(Math.round(ratio * (series.length - 1)));
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-2">
        {/* Axis: the top of the scale and zero, in text tokens. */}
        <div className="flex w-14 shrink-0 flex-col justify-between py-0.5 text-right font-mono text-[0.625rem] text-muted-foreground tabular-nums">
          <span>{formatValue(max / 1.08)}</span>
          <span>{formatValue(min)}</span>
        </div>
        <div
          className="relative h-40 min-w-0 flex-1 touch-none"
          role="img"
          aria-label={t("trendLabel", { metric: label, count: series.length })}
          tabIndex={0}
          onPointerMove={(event) => pick(event.clientX, event.currentTarget)}
          onPointerDown={(event) => pick(event.clientX, event.currentTarget)}
          onPointerLeave={() => setActive(null)}
          onBlur={() => setActive(null)}
          onKeyDown={(event) => {
            if (event.key === "ArrowRight") setActive(Math.min(series.length - 1, (active ?? -1) + 1));
            else if (event.key === "ArrowLeft") setActive(Math.max(0, (active ?? series.length) - 1));
            else if (event.key === "Escape") setActive(null);
          }}
        >
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible" aria-hidden>
            <defs>
              <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.22" />
                <stop offset="100%" stopColor="var(--brand)" stopOpacity="0" />
              </linearGradient>
            </defs>
            {[0, 0.5, 1].map((ratio) => (
              <line
                key={ratio}
                x1="0"
                x2={W}
                y1={PAD_TOP + ratio * (H - PAD_TOP - PAD_BOTTOM)}
                y2={PAD_TOP + ratio * (H - PAD_TOP - PAD_BOTTOM)}
                stroke="var(--border)"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
            ))}
            <path d={area} fill={`url(#${gradientId})`} />
            {previous && previous.length > 0 ? (
              <path
                d={path(previous)}
                fill="none"
                stroke="var(--tone-neutral)"
                strokeWidth="1.5"
                strokeDasharray="4 4"
                vectorEffect="non-scaling-stroke"
              />
            ) : null}
            <path
              d={line}
              fill="none"
              stroke="var(--brand)"
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          {point ? (
            <>
              <span aria-hidden className="pointer-events-none absolute inset-y-0 w-px bg-foreground/30" style={{ left: `${activeLeft}%` }} />
              <span
                aria-hidden
                className="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand ring-2 ring-card"
                style={{ left: `${activeLeft}%`, top: `${(y(point.value) / H) * 100}%` }}
              />
              <div
                role="status"
                className="pointer-events-none absolute top-0 z-10 w-max max-w-56 rounded-md bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-md ring-1 ring-foreground/10"
                style={activeLeft > 60 ? { right: `${100 - activeLeft + 2}%` } : { left: `${activeLeft + 2}%` }}
              >
                <p className="font-mono text-muted-foreground">{periodLabel(point.period)}</p>
                <p className="flex items-center gap-1.5 font-medium">
                  <span aria-hidden className="h-0.5 w-3 rounded-full bg-brand" />
                  {formatValue(point.value)}
                </p>
                {previousPoint ? (
                  <p className="flex items-center gap-1.5 text-muted-foreground">
                    <span aria-hidden className="h-0 w-3 border-t border-dashed border-tone-neutral" />
                    {t("previous")}: {formatValue(previousPoint.value)}
                  </p>
                ) : null}
              </div>
            </>
          ) : null}
        </div>
      </div>
      <div className="flex justify-between pl-16 font-mono text-[0.625rem] text-muted-foreground">
        <span>{periodLabel(series[0].period)}</span>
        {series.length > 1 ? <span>{periodLabel(series[series.length - 1].period)}</span> : null}
      </div>
      {previous && previous.length > 0 ? (
        <ul className="flex gap-4 pl-16 text-xs text-muted-foreground">
          <li className="flex items-center gap-1.5">
            <span aria-hidden className="h-0.5 w-3 rounded-full bg-brand" />
            {t("current")}
          </li>
          <li className="flex items-center gap-1.5">
            <span aria-hidden className="h-0 w-3 border-t border-dashed border-tone-neutral" />
            {t("previous")}
          </li>
        </ul>
      ) : null}
    </div>
  );
}
