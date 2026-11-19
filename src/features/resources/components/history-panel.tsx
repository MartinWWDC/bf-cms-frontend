"use client";

import { useState } from "react";
import { ArrowRightIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "cn";

import { ErrorState } from "@/components/error-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useFormat } from "@/i18n/use-format";
import type { RecordId } from "@/lib/api/types";

import { getField } from "../lib/contract";
import { useHistory } from "../queries";
import type { Contract, HistoryEntry } from "../types";
import { FieldValue } from "@/components/resource/field-value";

/** Entry types of `conventions.md` section 7, History. A type added later shows its own name. */
const KNOWN_TYPES = [
  "change",
  "action",
  "reveal",
  "assignment",
  "note",
  "other",
  "checkout_event",
  "notification",
  "carrier_webhook",
  "nova_action",
  "credit_ledger",
] as const;

function isKnownType(type: string): type is (typeof KNOWN_TYPES)[number] {
  return (KNOWN_TYPES as readonly string[]).includes(type);
}

interface HistoryPanelProps {
  contract: Contract;
  recordId: RecordId;
  onOpenRecord: (resource: string, id: RecordId) => void;
}

/**
 * The merged history of a record, newest first: CMS changes, actions, reveals,
 * assignments, notes and the marketplace events its resource declares. Only the entry
 * types this admin can see are offered as filters (`collaboration.history.types`).
 */
export function HistoryPanel({ contract, recordId, onOpenRecord }: HistoryPanelProps) {
  const t = useTranslations("resources.history");
  const types = contract.collaboration.history.types;
  const [selected, setSelected] = useState<string[]>([]);
  const history = useHistory(contract.key, recordId, selected);
  const entries = history.data?.pages.flatMap((page) => page.data) ?? [];

  const toggle = (type: string) =>
    setSelected((current) => (current.includes(type) ? current.filter((entry) => entry !== type) : [...current, type]));

  return (
    <div className="flex flex-col gap-5 px-5 py-6 sm:px-7">
      {types.length > 1 ? (
        <div role="group" aria-label={t("typesLabel")} className="flex flex-wrap gap-1.5">
          {types.map((type) => {
            const active = selected.includes(type);
            return (
              <button
                key={type}
                type="button"
                aria-pressed={active}
                onClick={() => toggle(type)}
                className={cn(
                  "h-6 rounded-full border px-2.5 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active ? "border-foreground bg-foreground text-background" : "bg-card text-muted-foreground hover:text-foreground",
                )}
              >
                {isKnownType(type) ? t(`types.${type}`) : type.replaceAll("_", " ")}
              </button>
            );
          })}
        </div>
      ) : null}

      {history.isError ? (
        <ErrorState title={t("loadFailed")} error={history.error} onRetry={() => history.refetch()} className="min-h-40" />
      ) : history.isPending ? (
        <div className="flex flex-col gap-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-10" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <ol className="relative flex flex-col gap-5 before:absolute before:inset-y-1.5 before:left-[3px] before:w-px before:bg-border">
          {entries.map((entry) => (
            <HistoryItem key={entry.id} contract={contract} entry={entry} onOpenRecord={onOpenRecord} />
          ))}
        </ol>
      )}

      {history.hasNextPage ? (
        <Button
          variant="outline"
          className="self-center"
          disabled={history.isFetchingNextPage}
          onClick={() => history.fetchNextPage()}
        >
          {t("loadMore")}
        </Button>
      ) : null}
    </div>
  );
}

function HistoryItem({
  contract,
  entry,
  onOpenRecord,
}: {
  contract: Contract;
  entry: HistoryEntry;
  onOpenRecord: (resource: string, id: RecordId) => void;
}) {
  const t = useTranslations("resources.history");
  const format = useFormat();
  const who = entry.admin?.name ?? entry.actor ?? t("unknownActor");
  const changes = Object.entries(entry.changes ?? {});
  const meta = Object.entries(entry.meta ?? {}).filter(([, value]) => value !== null && typeof value !== "object");

  return (
    <li className="relative pl-6">
      <span aria-hidden className="absolute top-1.5 left-0 size-[7px] rounded-full bg-foreground ring-4 ring-popover" />
      <p className="text-sm font-medium">{entry.event_label}</p>
      <p className="mt-0.5 font-mono text-xs text-muted-foreground">
        {who}
        {entry.created_at ? ` · ${format.dateTime(entry.created_at)}` : null}
      </p>
      {entry.text ? <p className="mt-1.5 text-sm break-words whitespace-pre-wrap">{entry.text}</p> : null}
      {entry.reason ? (
        <p className="mt-1.5 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{t("reason")}</span> {entry.reason}
        </p>
      ) : null}
      {changes.length > 0 ? (
        <dl className="mt-2 flex flex-col gap-1 rounded-md border bg-muted/40 px-3 py-2 text-sm">
          {changes.map(([name, change]) => {
            const field = getField(contract, name);
            const fieldLike = field ?? { name, type: "text" as const, config: {} };
            return (
              <div key={name} className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <dt className="text-muted-foreground">{field?.label ?? name}</dt>
                <dd className="flex min-w-0 flex-wrap items-center gap-1.5">
                  <ChangeValue field={fieldLike} value={change.old} />
                  <ArrowRightIcon aria-hidden className="size-3 shrink-0 text-muted-foreground" />
                  <ChangeValue field={fieldLike} value={change.new} />
                </dd>
              </div>
            );
          })}
        </dl>
      ) : null}
      {meta.length > 0 && changes.length === 0 ? (
        <p className="mt-1.5 font-mono text-xs break-words text-muted-foreground">
          {meta.map(([key, value]) => `${key}: ${String(value)}`).join(" · ")}
        </p>
      ) : null}
      {entry.link ? (
        <button
          type="button"
          onClick={() => entry.link && onOpenRecord(entry.link.resource, entry.link.id)}
          className="mt-1.5 text-xs underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {t("openSource")}
        </button>
      ) : null}
    </li>
  );
}

/** One side of a change. A sensitive field shows `[hidden]` for both sides. */
function ChangeValue({ field, value }: { field: Parameters<typeof FieldValue>[0]["field"]; value: unknown }) {
  if (value === "[hidden]") return <span className="font-mono text-xs text-muted-foreground">[hidden]</span>;
  // History values are stored values: an enum is its value, a linked record its id.
  const plain = field.type === "relation_one" || field.type === "admin" || field.type === "money";
  return (
    <span className="min-w-0">
      <FieldValue
        field={plain && (typeof value !== "object" || value === null) ? { ...field, type: "text" } : field}
        value={value}
        variant="cell"
      />
    </span>
  );
}
