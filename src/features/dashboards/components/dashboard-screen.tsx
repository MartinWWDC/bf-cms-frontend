"use client";

import { useState } from "react";
import Link from "next/link";
import { PencilIcon, RotateCwIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "cn";

import { ErrorState } from "@/components/error-state";
import { PageHeader } from "@/components/layout/page-header";
import { SimpleSelect } from "@/components/simple-select";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useFormat } from "@/i18n/use-format";
import { routes } from "@/lib/routes";

import { useDashboardState } from "../hooks/use-dashboard-state";
import { useDashboard } from "../queries";
import type { MetricFilter, MetricRangeKey } from "../types";
import { MetricCard } from "./metric-card";

/** `now` is the range of snapshot metrics; it cannot be chosen. */
const HIDDEN_RANGES: ReadonlySet<MetricRangeKey> = new Set(["now"]);

/** Page key of the personal dashboards manager. */
export const PERSONAL_DASHBOARDS = "personal";

interface DashboardScreenProps {
  /** Built-in key or `personal_{id}`. */
  dashboard: string;
}

/**
 * One dashboard: its cards on a 4-column grid, with one range and one set of filters for
 * all of them. Must be rendered inside `<Suspense>`: range and filters live in the URL.
 */
export function DashboardScreen({ dashboard: key }: DashboardScreenProps) {
  const t = useTranslations("dashboards");
  const tRanges = useTranslations("dashboards.ranges");
  const [params, setState] = useDashboardState();
  // A custom range is only asked for once both dates are set.
  const ready = params.range !== "custom" || Boolean(params.from && params.to);
  const dashboard = useDashboard(ready ? key : null, params);
  const data = dashboard.data;

  if (dashboard.isError && !data) {
    return <ErrorState title={t("loadFailed")} error={dashboard.error} onRetry={() => dashboard.refetch()} />;
  }

  const ranges = (data?.ranges ?? []).filter((range) => !HIDDEN_RANGES.has(range));

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader title={data?.label ?? <Skeleton className="h-9 w-56" />}>
        {data?.type === "personal" ? (
          <Link
            href={`${routes.dashboard(PERSONAL_DASHBOARDS)}?edit=${data.key}`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <PencilIcon />
            {t("edit")}
          </Link>
        ) : null}
        <Button
          variant="outline"
          size="icon-sm"
          aria-label={t("refresh")}
          disabled={dashboard.isFetching}
          onClick={() => dashboard.refetch()}
        >
          <RotateCwIcon className={cn(dashboard.isFetching && "animate-spin")} />
        </Button>
      </PageHeader>

      {/* Filters sit in one row above the cards and apply to all of them. */}
      <div className="flex shrink-0 flex-wrap items-end gap-x-4 gap-y-2 border-b px-4 pt-1 pb-3 sm:px-6">
        {ranges.length > 0 ? (
          <Labelled label={t("range")}>
            <SimpleSelect
              size="sm"
              className="w-48"
              aria-label={t("range")}
              value={params.range ?? ""}
              options={[
                { value: "", label: t("defaultRange") },
                ...ranges.map((range) => ({ value: range, label: tRanges(range) })),
              ]}
              onChange={(next) => setState({ range: next === "" ? null : (next as MetricRangeKey) })}
            />
          </Labelled>
        ) : null}
        {params.range === "custom" ? (
          <>
            <Labelled label={t("from")}>
              <Input
                type="date"
                aria-label={t("from")}
                value={params.from ?? ""}
                max={params.to ?? undefined}
                onChange={(event) => setState({ from: event.target.value || null })}
                className="h-7 w-40 bg-card"
              />
            </Labelled>
            <Labelled label={t("to")}>
              <Input
                type="date"
                aria-label={t("to")}
                value={params.to ?? ""}
                min={params.from ?? undefined}
                onChange={(event) => setState({ to: event.target.value || null })}
                className="h-7 w-40 bg-card"
              />
            </Labelled>
          </>
        ) : null}
        {(data?.filters ?? []).map((filter) => (
          <DashboardFilter
            key={filter.key}
            filter={filter}
            value={params.filters?.[filter.key] ?? ""}
            onChange={(value) => setState({ filter: { key: filter.key, value: value || null } })}
          />
        ))}
        <label className="flex h-7 items-center gap-2 text-sm">
          <Switch size="sm" checked={params.compare !== false} onCheckedChange={(checked) => setState({ compare: checked })} />
          {t("compare")}
        </label>
      </div>

      {!ready ? (
        <p className="p-8 text-center text-sm text-muted-foreground">{t("customHint")}</p>
      ) : dashboard.isError ? (
        // A wrong filter or range (`422`) while the previous cards are still on screen.
        <ErrorState title={t("loadFailed")} error={dashboard.error} onRetry={() => dashboard.refetch()} />
      ) : (
        <div
          className={cn(
            "grid grid-cols-1 gap-3 px-4 py-4 transition-opacity sm:px-6 lg:grid-cols-4",
            dashboard.isPlaceholderData && "opacity-60",
          )}
          aria-busy={dashboard.isFetching}
        >
          {!data
            ? Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-40 lg:col-span-2" />)
            : data.cards.map((card, index) => (
                <MetricCard key={`${card.metric.key}-${index}`} card={card} params={params} requestedRange={params.range ?? null} />
              ))}
          {data && data.cards.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground lg:col-span-4">{t("noCards")}</p>
          ) : null}
        </div>
      )}
    </div>
  );
}

function Labelled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-mono text-[0.625rem] tracking-wider text-muted-foreground uppercase">{label}</span>
      {children}
    </div>
  );
}

/** A `select` filter lists its options; a `country` filter takes an ISO country code. */
function DashboardFilter({
  filter,
  value,
  onChange,
}: {
  filter: MetricFilter;
  value: string;
  onChange: (value: string) => void;
}) {
  const t = useTranslations("dashboards");

  return (
    <Labelled label={filter.label}>
      {filter.type === "country" && filter.options.length === 0 ? (
        <CountryCode key={value} label={filter.label} value={value} onChange={onChange} />
      ) : (
        <SimpleSelect
          size="sm"
          className="w-44"
          aria-label={filter.label}
          value={value}
          options={[{ value: "", label: t("anyValue") }, ...filter.options]}
          onChange={onChange}
        />
      )}
    </Labelled>
  );
}

/** Typed freely; reported only as a whole code (or empty), because half a code answers `422`. */
function CountryCode({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const format = useFormat();
  const [draft, setDraft] = useState(value);

  return (
    <div className="flex items-center gap-2">
      <Input
        aria-label={label}
        value={draft}
        maxLength={2}
        placeholder="IT"
        onChange={(event) => {
          const code = event.target.value.toUpperCase().replace(/[^A-Z]/g, "");
          setDraft(code);
          if ((code.length === 2 || code.length === 0) && code !== value) onChange(code);
        }}
        className="h-7 w-16 bg-card font-mono uppercase"
      />
      {draft.length === 2 ? <span className="text-xs text-muted-foreground">{format.country(draft)}</span> : null}
    </div>
  );
}
