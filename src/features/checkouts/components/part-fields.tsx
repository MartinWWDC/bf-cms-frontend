"use client";

import { ExternalLinkIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "cn";

import { FieldValue } from "@/components/resource/field-value";
import { useResourceContract } from "@/features/resources/queries";
import type { Contract, Field } from "@/features/resources/types";
import type { RecordId } from "@/lib/api/types";

import { partFieldNames } from "../lib/overview";
import type { PartRecord } from "../types";

const WIDE: ReadonlySet<Field["type"]> = new Set(["long_text", "rich_text", "code", "json", "key_value", "images"]);

/** Extras of the overview that are not fields of the shipment contract. */
const URL_KEYS: ReadonlySet<string> = new Set(["tracking_link", "label_url", "processed_label_url"]);

export const sectionHeadingClass =
  "mb-1 flex items-center gap-3 font-mono text-[0.6875rem] tracking-wider text-muted-foreground uppercase after:h-px after:flex-1 after:bg-border";

interface FieldRowsProps {
  /** The contract whose fields the values belong to. Labels and types come from it. */
  contract: Contract | undefined;
  values: Record<string, unknown>;
  /** Field names to show, in order. Default: every key of `values`. */
  names?: string[];
  onOpenRecord: (resource: string, id: RecordId) => void;
  className?: string;
}

/**
 * Label and value rows for a set of field values, rendered by their field type like the
 * generic detail tab. A key the contract does not know (an extra of the overview) is
 * shown under its own name.
 */
export function FieldRows({ contract, values, names, onOpenRecord, className }: FieldRowsProps) {
  const shown = (names ?? partFieldNames(values)).filter((name) => name in values);

  return (
    <dl className={cn("grid grid-cols-1 gap-x-10 sm:grid-cols-2", className)}>
      {shown.map((name) => {
        const field = contract?.fields.find((entry) => entry.name === name);
        if (field?.type === "relation_many") return null;
        const fieldLike = field ?? {
          name,
          type: URL_KEYS.has(name) ? ("url" as const) : ("text" as const),
          config: {},
        };
        const wide = field ? WIDE.has(field.type) : false;
        return (
          <div
            key={name}
            className={cn(
              "border-b border-dashed py-2",
              wide ? "flex flex-col gap-1.5 sm:col-span-2" : "flex min-h-10 items-center justify-between gap-4",
            )}
          >
            <dt className="shrink-0 text-sm text-muted-foreground">{field?.label ?? name.replaceAll("_", " ")}</dt>
            <dd className={cn("min-w-0 text-sm", wide ? "" : "text-right")}>
              <FieldValue field={fieldLike} value={values[name]} variant="detail" onOpenRecord={onOpenRecord} />
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

interface PartCardProps {
  /** Heading of the card, e.g. "Buyer". */
  title?: string;
  record: PartRecord;
  onOpenRecord: (resource: string, id: RecordId) => void;
  className?: string;
}

/**
 * One record of a part (the ad, a shipment, an address, ...). Every part record carries
 * its `resource` and `id`, so it links to its own page, and its values are in that
 * resource's formats, so they are rendered from that resource's contract.
 */
export function PartCard({ title, record, onOpenRecord, className }: PartCardProps) {
  const t = useTranslations("checkouts");
  const contract = useResourceContract(record.resource);
  const names = partFieldNames(record).filter((name) => name !== "id");
  const heading = title ?? contract.data?.label_singular;

  return (
    <article className={cn("rounded-lg border bg-card px-4 pt-3 pb-1", className)}>
      <header className="flex items-center justify-between gap-3">
        <h4 className="min-w-0 truncate text-sm font-medium">
          {heading}
          {record.id !== undefined ? (
            <span className="ml-2 font-mono text-xs font-normal text-muted-foreground">#{String(record.id)}</span>
          ) : null}
        </h4>
        {record.id !== undefined ? (
          <button
            type="button"
            onClick={() => onOpenRecord(record.resource, record.id as RecordId)}
            className="inline-flex shrink-0 items-center gap-1 rounded-sm text-xs underline decoration-border underline-offset-4 outline-none hover:decoration-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            {t("openRecord")}
            <ExternalLinkIcon aria-hidden className="size-3" />
          </button>
        ) : null}
      </header>
      <FieldRows contract={contract.data} values={record} names={names} onOpenRecord={onOpenRecord} className="sm:grid-cols-1" />
    </article>
  );
}
