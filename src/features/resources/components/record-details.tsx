"use client";

import { useEffect, useState } from "react";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "cn";

import { Button } from "@/components/ui/button";
import { localeNames } from "@/i18n/config";
import { useErrorToast } from "@/lib/api/use-error-message";
import { isMasked, type RecordId, type Translated } from "@/lib/api/types";

import { getField, getValue } from "../lib/contract";
import { useRevealField } from "../mutations";
import type { Contract, Field, InlineField, RecordDetail } from "../types";
import { InlineFieldControl, type InlineFieldProps } from "./inline-field";
import { FieldValue } from "@/components/resource/field-value";

/** A revealed value is shown only while the admin is looking at it, then masked again. */
const REVEAL_SECONDS = 30;

const WIDE: ReadonlySet<Field["type"]> = new Set(["long_text", "rich_text", "code", "json", "key_value", "images"]);

interface RecordDetailsProps {
  contract: Contract;
  record: RecordDetail;
  /** Fields that can be changed in place, from the tab the record was opened from. */
  inline?: InlineField[];
  onOpenRecord: (resource: string, id: RecordId) => void;
  onRunAction: InlineFieldProps["onRunAction"];
}

/** The contract's detail sections, each field rendered by its type. */
export function RecordDetails({ contract, record, inline, onOpenRecord, onRunAction }: RecordDetailsProps) {
  return (
    <div className="flex flex-col gap-7 px-5 py-6 sm:px-7">
      {contract.detail.sections.map((section) => {
        const fields = section.fields
          .map((name) => getField(contract, name))
          .filter((field): field is Field => field !== undefined && field.type !== "relation_many");
        if (fields.length === 0) return null;
        return (
          <section key={section.key} aria-labelledby={`section-${section.key}`}>
            <h3
              id={`section-${section.key}`}
              className="mb-1 flex items-center gap-3 font-mono text-[0.6875rem] tracking-wider text-muted-foreground uppercase after:h-px after:flex-1 after:bg-border"
            >
              {section.label}
            </h3>
            <dl className="grid grid-cols-1 gap-x-10 sm:grid-cols-2">
              {fields.map((field) => (
                <DetailField
                  key={field.name}
                  contract={contract}
                  record={record}
                  field={field}
                  inline={inline?.find((entry) => entry.field === field.name)}
                  onOpenRecord={onOpenRecord}
                  onRunAction={onRunAction}
                />
              ))}
            </dl>
          </section>
        );
      })}
    </div>
  );
}

function DetailField({
  contract,
  record,
  field,
  inline,
  onOpenRecord,
  onRunAction,
}: {
  contract: Contract;
  record: RecordDetail;
  field: Field;
  inline?: InlineField;
  onOpenRecord: (resource: string, id: RecordId) => void;
  onRunAction: InlineFieldProps["onRunAction"];
}) {
  const t = useTranslations("resources.drawer");
  const value = getValue(record.data, field.name);
  const missing = record.meta.missing_translations[field.name] ?? [];
  const isTranslatedText = field.translated && typeof value === "object" && value !== null && !isMasked(value);
  const wide = WIDE.has(field.type) || isTranslatedText;

  return (
    <div
      className={cn(
        "border-b border-dashed py-2",
        wide ? "flex flex-col gap-1.5 sm:col-span-2" : "flex min-h-11 items-center justify-between gap-4",
      )}
    >
      <dt className="flex shrink-0 items-center gap-2 text-sm text-muted-foreground" title={field.help ?? undefined}>
        {field.label}
        {missing.length > 0 ? (
          <span className="rounded-sm bg-tone-warning/20 px-1.5 py-0.5 font-mono text-[0.625rem] text-foreground uppercase">
            {t("missingTranslations", { languages: missing.join(" ") })}
          </span>
        ) : null}
      </dt>
      <dd className={cn("min-w-0 text-sm", wide ? "" : "flex items-center gap-2 text-right")}>
        {isMasked(value) ? (
          <SensitiveValue contract={contract} record={record} field={field} />
        ) : isTranslatedText && field.type !== "json" ? (
          <TranslatedValue field={field} value={value as Translated} />
        ) : inline ? (
          <InlineFieldControl
            contract={contract}
            entry={inline}
            field={field}
            recordId={record.data.id}
            value={value}
            record={record}
            variant="detail"
            onOpenRecord={onOpenRecord}
            onRunAction={onRunAction}
          />
        ) : (
          <FieldValue field={field} value={value} variant="detail" onOpenRecord={onOpenRecord} />
        )}
      </dd>
    </div>
  );
}

/** Every language of a translated value, so missing ones are visible at a glance. */
function TranslatedValue({ field, value }: { field: Field; value: Translated }) {
  const languages = field.config.locales ?? Object.keys(value);

  return (
    <ul className="flex flex-col gap-1.5">
      {languages.map((code) => (
        <li key={code} className="flex items-start gap-2">
          <span
            title={localeNames[code as keyof typeof localeNames] ?? code}
            className="mt-0.5 w-7 shrink-0 rounded-sm border text-center font-mono text-[0.625rem] text-muted-foreground uppercase"
          >
            {code}
          </span>
          <span className="min-w-0 flex-1">
            <FieldValue field={{ ...field, translated: false }} value={value[code]} variant="detail" />
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * A masked value with its reveal control (`conventions.md` section 11). The control is
 * only offered when `meta.abilities.reveal` allows it. The revealed value lives in this
 * component's state only, is never cached, and is hidden again after a short time.
 */
function SensitiveValue({ contract, record, field }: { contract: Contract; record: RecordDetail; field: Field }) {
  const t = useTranslations("resources.drawer");
  const toastError = useErrorToast();
  const reveal = useRevealField(contract.key, record.data.id);
  const [revealed, setRevealed] = useState<{ value: unknown } | null>(null);
  const masked = getValue(record.data, field.name);

  useEffect(() => {
    if (!revealed) return;
    const timer = setTimeout(() => setRevealed(null), REVEAL_SECONDS * 1000);
    return () => clearTimeout(timer);
  }, [revealed]);

  if (revealed) {
    return (
      <>
        <span className="font-mono text-[0.8125rem] break-all select-all">
          <FieldValue field={{ ...field, sensitive: false }} value={revealed.value} variant="detail" />
        </span>
        <Button variant="ghost" size="xs" onClick={() => setRevealed(null)}>
          <EyeOffIcon />
          {t("hide")}
        </Button>
      </>
    );
  }

  return (
    <>
      <FieldValue field={field} value={masked} variant="detail" />
      {record.meta.abilities.reveal ? (
        <Button
          variant="ghost"
          size="xs"
          disabled={reveal.isPending}
          title={t("revealHint")}
          onClick={() =>
            reveal.mutate(field.name, {
              onSuccess: (result) => setRevealed({ value: result.value }),
              onError: toastError,
            })
          }
        >
          <EyeIcon />
          {t("reveal")}
        </Button>
      ) : null}
    </>
  );
}
