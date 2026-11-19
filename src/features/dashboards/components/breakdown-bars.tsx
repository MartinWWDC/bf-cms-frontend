"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import { useFormat } from "@/i18n/use-format";

import { metricLinkHref } from "../lib/links";
import type { BreakdownGroup } from "../types";

interface BreakdownBarsProps {
  groups: BreakdownGroup[];
  formatValue: (value: number) => string;
}

/** At most this many groups are drawn; the rest is summed up in one line. */
const MAX_GROUPS = 12;

/**
 * Parts of a whole as horizontal bars, largest first (the backend sorts them). One hue
 * for magnitude; every bar carries its label, value and share as text, so nothing is read
 * from colour alone. A group with a `link` opens the records behind it.
 */
export function BreakdownBars({ groups, formatValue }: BreakdownBarsProps) {
  const t = useTranslations("dashboards.chart");
  const format = useFormat();

  if (groups.length === 0) return <p className="py-8 text-center text-sm text-muted-foreground">{t("empty")}</p>;

  const shown = groups.slice(0, MAX_GROUPS);
  const rest = groups.slice(MAX_GROUPS);
  const max = Math.max(...shown.map((group) => group.value), 0) || 1;

  return (
    <ul className="flex flex-col gap-2">
      {shown.map((group) => {
        const href = metricLinkHref(group.link);
        const row = (
          <>
            <span className="flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 truncate">{group.label}</span>
              <span className="shrink-0 font-mono text-[0.8125rem] tabular-nums">
                {formatValue(group.value)}
                <span className="ml-2 text-xs text-muted-foreground">{format.percent(group.share)}</span>
              </span>
            </span>
            <span className="mt-1 block h-2 rounded-sm bg-muted">
              <span
                className="block h-full rounded-r-[4px] bg-brand"
                style={{ width: `${Math.max(0, Math.min(100, (group.value / max) * 100))}%` }}
              />
            </span>
            {group.previous !== null ? (
              <span className="mt-0.5 block font-mono text-[0.625rem] text-muted-foreground">
                {t("previous")}: {formatValue(group.previous)}
              </span>
            ) : null}
          </>
        );
        return (
          <li key={group.key}>
            {href ? (
              <Link
                href={href}
                title={t("openRecords")}
                className="-mx-1.5 block rounded-md px-1.5 py-1 outline-none hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring"
              >
                {row}
              </Link>
            ) : (
              <div className="py-1">{row}</div>
            )}
          </li>
        );
      })}
      {rest.length > 0 ? (
        <li className="flex justify-between gap-3 border-t pt-2 text-sm text-muted-foreground">
          <span>{t("otherGroups", { count: rest.length })}</span>
          <span className="font-mono text-[0.8125rem] tabular-nums">
            {formatValue(rest.reduce((total, group) => total + group.value, 0))}
          </span>
        </li>
      ) : null}
    </ul>
  );
}
