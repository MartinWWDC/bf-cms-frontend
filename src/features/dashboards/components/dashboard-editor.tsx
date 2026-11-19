"use client";

import { type FormEvent, useState } from "react";
import { ArrowDownIcon, ArrowUpIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { cn } from "cn";

import { ErrorState } from "@/components/error-state";
import { PageHeader } from "@/components/layout/page-header";
import { SimpleSelect } from "@/components/simple-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { isApiError } from "@/lib/api/client";
import { useErrorMessage } from "@/lib/api/use-error-message";

import { useSaveDashboard } from "../mutations";
import { useDashboard, useMetrics } from "../queries";
import { type Dashboard, MAX_DASHBOARD_CARDS, type MetricSummary } from "../types";

interface EditorCard {
  metric: string;
  width: number;
}

interface DashboardEditorProps {
  /** `personal_{id}` to edit; `null` creates a new dashboard. */
  dashboardKey: string | null;
  onDone: () => void;
}

const NO_PARAMS = {};

/** Loads the dashboard to edit, then shows the form. */
export function DashboardEditor({ dashboardKey, onDone }: DashboardEditorProps) {
  const t = useTranslations("dashboards.personal");
  const existing = useDashboard(dashboardKey, NO_PARAMS);
  const metrics = useMetrics();

  if (existing.isError || metrics.isError) {
    return (
      <ErrorState
        title={t("loadFailed")}
        error={existing.error ?? metrics.error}
        onRetry={() => (existing.isError ? existing.refetch() : metrics.refetch())}
      />
    );
  }
  if (!metrics.data || (dashboardKey !== null && !existing.data)) {
    return (
      <div className="flex flex-col gap-3 px-4 pt-7 sm:px-6" aria-busy>
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-32" />
      </div>
    );
  }
  return <EditorForm dashboard={existing.data ?? null} metrics={metrics.data} onDone={onDone} />;
}

function EditorForm({
  dashboard,
  metrics,
  onDone,
}: {
  dashboard: Dashboard | null;
  metrics: MetricSummary[];
  onDone: () => void;
}) {
  const t = useTranslations("dashboards.personal");
  const tTypes = useTranslations("dashboards.types");
  const tCommon = useTranslations("common");
  const errorMessage = useErrorMessage();
  const save = useSaveDashboard();
  const [name, setName] = useState(dashboard?.label ?? "");
  const [icon, setIcon] = useState(dashboard?.icon ?? "");
  const [cards, setCards] = useState<EditorCard[]>(
    () => dashboard?.cards.map((card) => ({ metric: card.metric.key, width: card.width })) ?? [],
  );
  const [adding, setAdding] = useState<string | null>(null);

  const fieldErrors = isApiError(save.error) ? save.error.fields : {};
  const byKey = new Map(metrics.map((metric) => [metric.key, metric]));
  const full = cards.length >= MAX_DASHBOARD_CARDS;

  const move = (index: number, by: number) => {
    const target = index + by;
    if (target < 0 || target >= cards.length) return;
    const next = [...cards];
    [next[index], next[target]] = [next[target], next[index]];
    setCards(next);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    save.mutate(
      { key: dashboard?.key, input: { name: name.trim(), icon: icon.trim() || null, cards } },
      {
        onSuccess: (saved) => {
          toast.success(t("saved", { name: saved.label }));
          onDone();
        },
      },
    );
  };

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
      <PageHeader title={dashboard ? t("editTitle") : t("createTitle")} description={t("editorDescription")}>
        <Button type="button" variant="outline" onClick={onDone} disabled={save.isPending}>
          {tCommon("cancel")}
        </Button>
        <Button type="submit" disabled={save.isPending || !name.trim()}>
          {tCommon("save")}
        </Button>
      </PageHeader>

      <div className="flex max-w-3xl flex-col gap-5 px-4 pb-8 sm:px-6">
        {save.isError ? (
          <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {errorMessage(save.error)}
          </p>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-[1fr_12rem]">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="dashboard-name">
              {t("name")}
              <span className="text-destructive">*</span>
            </Label>
            <Input
              id="dashboard-name"
              value={name}
              maxLength={100}
              autoFocus
              aria-invalid={Boolean(fieldErrors.name) || undefined}
              onChange={(event) => setName(event.target.value)}
              className="bg-card"
            />
            {fieldErrors.name ? <p className="text-xs text-destructive">{fieldErrors.name[0]}</p> : null}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="dashboard-icon">{t("icon")}</Label>
            <Input
              id="dashboard-icon"
              value={icon}
              maxLength={40}
              placeholder="chart"
              aria-invalid={Boolean(fieldErrors.icon) || undefined}
              onChange={(event) => setIcon(event.target.value)}
              className="bg-card font-mono text-[0.8125rem]"
            />
            <p className={cn("text-xs", fieldErrors.icon ? "text-destructive" : "text-muted-foreground")}>
              {fieldErrors.icon?.[0] ?? t("iconHint")}
            </p>
          </div>
        </div>

        <section aria-labelledby="dashboard-cards" className="flex flex-col gap-2">
          <h2
            id="dashboard-cards"
            className="flex items-center gap-3 font-mono text-[0.6875rem] tracking-wider text-muted-foreground uppercase after:h-px after:flex-1 after:bg-border"
          >
            {t("cards", { count: cards.length, max: MAX_DASHBOARD_CARDS })}
          </h2>
          {fieldErrors.cards ? <p className="text-xs text-destructive">{fieldErrors.cards[0]}</p> : null}

          {cards.length === 0 ? <p className="py-4 text-sm text-muted-foreground">{t("noCards")}</p> : null}
          <ol className="flex flex-col gap-1.5">
            {cards.map((card, index) => {
              const metric = byKey.get(card.metric);
              const error = fieldErrors[`cards.${index}.metric`]?.[0] ?? fieldErrors[`cards.${index}.width`]?.[0];
              return (
                <li key={`${card.metric}-${index}`} className="rounded-md border bg-card px-3 py-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{metric?.label ?? card.metric}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {metric ? tTypes(metric.type) : t("metricGone")}
                        {metric?.description ? ` · ${metric.description}` : null}
                      </span>
                    </span>
                    <SimpleSelect
                      size="sm"
                      className="w-36"
                      aria-label={t("width")}
                      value={String(card.width)}
                      options={[1, 2, 3, 4].map((width) => ({ value: String(width), label: t("widthOption", { count: width }) }))}
                      onChange={(width) =>
                        setCards(cards.map((entry, i) => (i === index ? { ...entry, width: Number(width) } : entry)))
                      }
                    />
                    <Button type="button" variant="ghost" size="icon-sm" aria-label={t("moveUp")} disabled={index === 0} onClick={() => move(index, -1)}>
                      <ArrowUpIcon />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t("moveDown")}
                      disabled={index === cards.length - 1}
                      onClick={() => move(index, 1)}
                    >
                      <ArrowDownIcon />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t("removeCard")}
                      onClick={() => setCards(cards.filter((_, i) => i !== index))}
                    >
                      <Trash2Icon />
                    </Button>
                  </div>
                  {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
                </li>
              );
            })}
          </ol>

          <div className="flex flex-wrap items-center gap-2">
            <SimpleSelect
              className="w-72"
              aria-label={t("metric")}
              placeholder={t("chooseMetric")}
              disabled={full || metrics.length === 0}
              value={adding}
              options={metrics.map((metric) => ({ value: metric.key, label: metric.label }))}
              onChange={setAdding}
            />
            <Button
              type="button"
              variant="outline"
              disabled={full || adding === null}
              onClick={() => {
                if (adding === null) return;
                // Tables and charts start wide, single numbers narrow.
                const type = byKey.get(adding)?.type;
                setCards([...cards, { metric: adding, width: type === "value" ? 1 : type === "table" ? 4 : 2 }]);
                setAdding(null);
              }}
            >
              <PlusIcon />
              {t("addCard")}
            </Button>
            {full ? <span className="text-xs text-muted-foreground">{t("full", { max: MAX_DASHBOARD_CARDS })}</span> : null}
          </div>
        </section>
      </div>
    </form>
  );
}
