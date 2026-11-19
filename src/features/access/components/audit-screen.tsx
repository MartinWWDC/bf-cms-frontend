"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRightIcon, FilterXIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { ErrorState } from "@/components/error-state";
import { PageHeader } from "@/components/layout/page-header";
import { SimpleSelect } from "@/components/simple-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { StaffPicker } from "@/components/resource/pickers";
import { useFormat } from "@/i18n/use-format";
import { recordHref } from "@/lib/routes";

import { useAuditState } from "../hooks/use-audit-state";
import { useAudit } from "../queries";
import { AUDIT_EVENTS, type AuditEntry } from "../types";

const PER_PAGE = 50;
const ANY_EVENT = "";

/**
 * The full audit trail of all staff activity (`GET /audit`, permission `audit.view`):
 * record changes, actions, reveals, exports, sign-ins and access changes.
 *
 * Must be rendered inside `<Suspense>`: the filters live in the URL.
 */
export function AuditScreen() {
  const t = useTranslations("access.audit");
  const tTable = useTranslations("table");
  const [state, setState, reset] = useAuditState();
  const { page, ...filters } = state;
  const audit = useAudit(filters, page, PER_PAGE);
  const entries = audit.data?.data ?? [];
  const hasFilters = Object.values(filters).some((value) => value !== null);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader title={t("title")} description={t("subtitle")} />

      {/* Remount when the URL changes from outside (Back, a shared link), so the drafts follow it. */}
      <form
        key={JSON.stringify(filters)}
        className="grid shrink-0 grid-cols-1 gap-3 border-b px-4 pb-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4"
        onSubmit={(event) => event.preventDefault()}
      >
        <FilterField label={t("admin")}>
          {(id) => (
            <StaffPicker
              id={id}
              value={state.adminId}
              clearable
              placeholder={t("anyAdmin")}
              onChange={(next) => setState({ adminId: typeof next === "number" ? next : null })}
            />
          )}
        </FilterField>
        <FilterField label={t("event")}>
          {(id) => (
            <SimpleSelect
              id={id}
              value={state.event ?? ANY_EVENT}
              options={[
                { value: ANY_EVENT, label: t("anyEvent") },
                // An event from a link that this version does not list stays selectable.
                ...(state.event && !(AUDIT_EVENTS as readonly string[]).includes(state.event)
                  ? [{ value: state.event, label: state.event }]
                  : []),
                ...AUDIT_EVENTS.map((event) => ({ value: event, label: event })),
              ]}
              onChange={(next) => setState({ event: next || null })}
              className="font-mono text-[0.8125rem]"
            />
          )}
        </FilterField>
        <TextFilter label={t("resource")} value={state.resource} onCommit={(resource) => setState({ resource })} mono />
        <TextFilter label={t("recordId")} value={state.recordId} onCommit={(recordId) => setState({ recordId })} mono />
        <TextFilter label={t("requestId")} value={state.requestId} onCommit={(requestId) => setState({ requestId })} mono />
        <TextFilter label={t("from")} value={state.from} onCommit={(from) => setState({ from })} type="date" />
        <TextFilter label={t("to")} value={state.to} onCommit={(to) => setState({ to })} type="date" />
        <div className="flex items-end">
          <Button type="button" variant="outline" disabled={!hasFilters} onClick={reset}>
            <FilterXIcon />
            {t("clearFilters")}
          </Button>
        </div>
      </form>

      {audit.isError ? (
        <ErrorState title={t("loadFailed")} error={audit.error} onRetry={() => audit.refetch()} />
      ) : (
        <div className="scrollbar-slim min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6" aria-busy={audit.isFetching}>
          {audit.isPending ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 6 }, (_, index) => (
                <Skeleton key={index} className="h-16" />
              ))}
            </div>
          ) : entries.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm font-medium">{t("emptyTitle")}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t("emptyHint")}</p>
            </div>
          ) : (
            <ol className={audit.isPlaceholderData ? "flex flex-col gap-2 opacity-60" : "flex flex-col gap-2"}>
              {entries.map((entry) => (
                <AuditItem key={entry.id} entry={entry} onFilterRequest={(requestId) => setState({ requestId })} />
              ))}
            </ol>
          )}
        </div>
      )}

      <footer className="flex shrink-0 items-center justify-between gap-3 border-t bg-card px-4 py-2">
        <span className="font-mono text-xs text-muted-foreground">{t("page", { page })}</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1 || audit.isPending} onClick={() => setState({ page: page - 1 })}>
            {tTable("previousPage")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!audit.data?.meta.has_more || audit.isPending}
            onClick={() => setState({ page: page + 1 })}
          >
            {tTable("nextPage")}
          </Button>
        </div>
      </footer>
    </div>
  );
}

function FilterField({ label, children }: { label: string; children: (id: string) => React.ReactNode }) {
  const id = `audit-${label.replace(/\W+/g, "-").toLowerCase()}`;
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      {children(id)}
    </div>
  );
}

/** A text or date filter that is applied on Enter or when the field is left. */
function TextFilter({
  label,
  value,
  onCommit,
  type = "text",
  mono = false,
}: {
  label: string;
  value: string | null;
  onCommit: (value: string | null) => void;
  type?: "text" | "date";
  mono?: boolean;
}) {
  const [draft, setDraft] = useState(value ?? "");
  const commit = (next: string) => {
    const trimmed = next.trim();
    if (trimmed !== (value ?? "")) onCommit(trimmed || null);
  };

  return (
    <FilterField label={label}>
      {(id) => (
        <Input
          id={id}
          type={type}
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            // A date picker has no Enter: apply the date as soon as it is complete.
            if (type === "date") commit(event.target.value);
          }}
          onBlur={() => commit(draft)}
          onKeyDown={(event) => {
            if (event.key === "Enter") commit(draft);
          }}
          className={mono ? "bg-card font-mono text-[0.8125rem]" : "bg-card"}
        />
      )}
    </FilterField>
  );
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function AuditItem({ entry, onFilterRequest }: { entry: AuditEntry; onFilterRequest: (requestId: string) => void }) {
  const t = useTranslations("access.audit");
  const format = useFormat();
  const changes = Object.entries(entry.changes ?? {});
  const meta = Object.entries(entry.meta ?? {}).filter(([, value]) => value !== null && value !== "");

  return (
    <li className="rounded-lg border bg-card p-3 text-sm">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-medium">{entry.event_label}</span>
        <code className="font-mono text-xs text-muted-foreground">{entry.event}</code>
        <time dateTime={entry.created_at} className="ml-auto font-mono text-xs whitespace-nowrap text-muted-foreground">
          {format.dateTime(entry.created_at)}
        </time>
      </div>

      <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground">
        <span className="text-foreground">{entry.admin?.name ?? (entry.admin ? `#${entry.admin.id}` : t("noAdmin"))}</span>
        {entry.resource ? (
          <>
            <span aria-hidden>·</span>
            {entry.record_id ? (
              <Link
                href={recordHref(entry.resource, entry.record_id)}
                className="font-mono text-xs underline decoration-border underline-offset-4 outline-none hover:decoration-foreground focus-visible:ring-2 focus-visible:ring-ring"
              >
                {entry.resource} #{entry.record_id}
              </Link>
            ) : (
              <span className="font-mono text-xs">{entry.resource}</span>
            )}
          </>
        ) : null}
      </p>

      {entry.reason ? (
        <p className="mt-1.5">
          <span className="font-medium">{t("reason")}</span> {entry.reason}
        </p>
      ) : null}

      {changes.length > 0 ? (
        <dl className="mt-2 flex flex-col gap-1 rounded-md border bg-muted/40 px-3 py-2">
          {changes.map(([field, change]) => (
            <div key={field} className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <dt className="font-mono text-xs text-muted-foreground">{field}</dt>
              <dd className="flex min-w-0 flex-wrap items-center gap-1.5 font-mono text-xs break-all">
                <span>{formatValue(change?.old)}</span>
                <ArrowRightIcon aria-hidden className="size-3 shrink-0 text-muted-foreground" />
                <span>{formatValue(change?.new)}</span>
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      {meta.length > 0 ? (
        <p className="mt-1.5 font-mono text-xs break-all text-muted-foreground">
          {meta.map(([key, value]) => `${key}: ${formatValue(value)}`).join(" · ")}
        </p>
      ) : null}

      {entry.request_id || entry.ip || entry.user_agent ? (
        <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 font-mono text-[0.6875rem] text-muted-foreground">
          {entry.request_id ? (
            <button
              type="button"
              title={t("sameRequest")}
              onClick={() => entry.request_id && onFilterRequest(entry.request_id)}
              className="underline decoration-border underline-offset-4 outline-none hover:decoration-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              {t("requestLabel", { id: entry.request_id })}
            </button>
          ) : null}
          {entry.ip ? <span>{t("ipLabel", { ip: entry.ip })}</span> : null}
          {entry.user_agent ? (
            <span className="max-w-full truncate" title={entry.user_agent}>
              {entry.user_agent}
            </span>
          ) : null}
        </p>
      ) : null}
    </li>
  );
}
