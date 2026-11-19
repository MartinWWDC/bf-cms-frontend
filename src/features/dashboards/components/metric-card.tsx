"use client";

import Link from "next/link";
import { ArrowDownRightIcon, ArrowRightIcon, ArrowUpRightIcon, DownloadIcon, LoaderIcon, MinusIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "cn";

import { Button } from "@/components/ui/button";
import { useFormat } from "@/i18n/use-format";
import { useErrorToast } from "@/lib/api/use-error-message";

import { useMetricFormat } from "../hooks/use-metric-format";
import { metricLinkHref } from "../lib/links";
import { useExportMetric } from "../mutations";
import type { DashboardCard, MetricParams } from "../types";
import { BreakdownBars } from "./breakdown-bars";
import { MetricTable } from "./metric-table";
import { TrendChart } from "./trend-chart";

const SPAN: Record<number, string> = {
  1: "lg:col-span-1",
  2: "lg:col-span-2",
  3: "lg:col-span-3",
  4: "lg:col-span-4",
};

interface MetricCardProps {
  card: DashboardCard;
  /** Range and filters of the dashboard, for the export. */
  params: MetricParams;
  /** The dashboard asked for this range; a card that does not offer it uses its own. */
  requestedRange: string | null;
}

/** Change against the previous period. Direction only: whether up is good depends on the metric. */
function Change({ value }: { value: number | null }) {
  const t = useTranslations("dashboards.card");
  const format = useFormat();
  if (value === null) return null;
  const Icon = value > 0 ? ArrowUpRightIcon : value < 0 ? ArrowDownRightIcon : MinusIcon;
  return (
    <span className="inline-flex items-center gap-1 rounded-sm border bg-card px-1.5 py-0.5 font-mono text-xs tabular-nums" title={t("changeHint")}>
      <Icon aria-hidden className="size-3" />
      {value > 0 ? "+" : ""}
      {format.percent(value)}
    </span>
  );
}

/** One metric of a dashboard: its headline, its chart by result type, and the way to the records behind it. */
export function MetricCard({ card, params, requestedRange }: MetricCardProps) {
  const t = useTranslations("dashboards.card");
  const tRanges = useTranslations("dashboards.ranges");
  const format = useFormat();
  const toastError = useErrorToast();
  const exportMetric = useExportMetric();
  const { metric, value, error } = card;
  const formatValue = useMetricFormat(metric);
  const result = value?.result ?? null;
  const href = metricLinkHref(value?.link);
  const usedRange = value?.range.key;
  const ownRange = usedRange && requestedRange && usedRange !== requestedRange && usedRange !== "now";

  const headline = (() => {
    if (!result) return null;
    if (result.type === "value") return { main: result.value, previous: result.previous, change: result.change };
    if (result.type === "trend") return { main: result.total, previous: result.previous_total, change: result.change };
    if (result.type === "breakdown") return { main: result.total, previous: result.previous_total, change: result.change };
    return null;
  })();

  return (
    <article
      className={cn(
        "flex min-w-0 flex-col gap-3 rounded-lg border bg-card p-4",
        SPAN[Math.min(4, Math.max(1, card.width))],
      )}
    >
      <header className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h2 className="font-mono text-[0.6875rem] tracking-wider text-muted-foreground uppercase" title={metric.description ?? undefined}>
            {metric.label}
          </h2>
          {ownRange ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{t("ownRange", { range: tRanges(usedRange) })}</p>
          ) : null}
        </div>
        {metric.exportable && value?.status === "ready" ? (
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={t("export", { metric: metric.label })}
            title={t("export", { metric: metric.label })}
            disabled={exportMetric.isPending}
            onClick={() =>
              exportMetric.mutate(
                { metric: metric.key, params: { ...params, range: usedRange ?? params.range } },
                { onError: toastError },
              )
            }
          >
            <DownloadIcon />
          </Button>
        ) : null}
      </header>

      {error ? (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error.message}
        </p>
      ) : !value || value.status === "pending" || !result ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-sm text-muted-foreground" aria-busy>
          <LoaderIcon aria-hidden className="size-4 animate-spin" />
          {t("pending")}
        </div>
      ) : (
        <>
          {headline ? (
            <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
              <p className="font-heading text-3xl leading-none font-semibold tracking-tight tabular-nums">
                {formatValue(headline.main)}
              </p>
              <Change value={headline.change} />
              {headline.previous !== null ? (
                <p className="text-xs text-muted-foreground">{t("previous", { value: formatValue(headline.previous) })}</p>
              ) : null}
            </div>
          ) : null}

          {result.type === "trend" ? (
            <TrendChart
              series={result.series}
              previous={result.previous_series}
              formatValue={formatValue}
              label={metric.label}
            />
          ) : null}
          {result.type === "breakdown" ? <BreakdownBars groups={result.groups} formatValue={formatValue} /> : null}
          {result.type === "table" ? <MetricTable metric={metric} result={result} /> : null}
        </>
      )}

      <footer className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {href ? (
          <Link
            href={href}
            className="inline-flex items-center gap-1 text-foreground underline decoration-border underline-offset-4 outline-none hover:decoration-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            {t("openRecords")}
            <ArrowRightIcon aria-hidden className="size-3" />
          </Link>
        ) : null}
        {value?.calculated_at ? (
          <span className="ml-auto font-mono text-[0.625rem]" title={format.dateTime(value.calculated_at)}>
            {value.cached
              ? t("cachedAt", { time: format.time(value.calculated_at) })
              : t("calculatedAt", { time: format.time(value.calculated_at) })}
          </span>
        ) : null}
      </footer>
    </article>
  );
}
