"use client";

import { type FormEvent, useId, useMemo, useState } from "react";
import { LanguagesIcon, LockIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { cn } from "cn";

import { RichTextEditor } from "@/components/rich-text-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { localeNames } from "@/i18n/config";
import { isApiError } from "@/lib/api/client";
import { useErrorMessage, useErrorToast } from "@/lib/api/use-error-message";
import { isMasked, isMoney, isReference, type Translated } from "@/lib/api/types";

import { getField, getValue } from "../lib/contract";
import { useCreateRecord, useSuggestTranslations, useUpdateRecord } from "../mutations";
import type { Contract, Field, RecordDetail, RecordInput } from "../types";
import { FieldInput } from "@/components/resource/field-input";
import { FieldValue } from "@/components/resource/field-value";

interface RecordFormProps {
  contract: Contract;
  /** The record being edited; `null` creates a new one. */
  record: RecordDetail | null;
  onSaved: (record: RecordDetail) => void;
  onCancel: () => void;
}

const NOT_WRITABLE: ReadonlySet<Field["type"]> = new Set(["id", "relation_many", "file", "image", "images"]);

/** A record value turned into what the API takes back on save. */
function toInputValue(field: Field, value: unknown): unknown {
  if (value === undefined || isMasked(value)) return field.type === "password" ? "" : null;
  if (field.translated) return { ...((value ?? {}) as Translated) };
  if (field.type === "money") return isMoney(value) ? value.amount : null;
  if (field.type === "relation_one" || field.type === "admin") {
    return isReference(value) ? value.id : ((value as { id?: unknown } | null)?.id ?? null);
  }
  return value ?? null;
}

function referenceLabel(value: unknown): string | null {
  if (typeof value !== "object" || value === null) return null;
  const entry = value as { title?: unknown; name?: unknown };
  return typeof entry.title === "string" ? entry.title : typeof entry.name === "string" ? entry.name : null;
}

function isSame(a: unknown, b: unknown) {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

/**
 * Create and edit form, rendered from the contract's editable fields.
 *
 * Saving follows `conventions.md` section 7: `PATCH` sends only what changed, with the
 * record version in `If-Match`; a `409 stale_record` shows what someone else changed and
 * lets the admin decide; validation errors land on their field (`name.de` for one language
 * of a translated field); a reason is asked where the resource requires one.
 */
export function RecordForm({ contract, record, onSaved, onCancel }: RecordFormProps) {
  const t = useTranslations("resources.form");
  const tCommon = useTranslations("common");
  const errorMessage = useErrorMessage();
  const formId = useId();
  const isCreate = record === null;
  const create = useCreateRecord(contract.key);
  const update = useUpdateRecord(contract.key);
  const mutation = isCreate ? create : update;

  /** Editable fields, grouped by the detail sections, in display order. */
  const sections = useMemo(() => {
    const writable = (field: Field | undefined): field is Field =>
      field !== undefined && field.editable && !field.via && !NOT_WRITABLE.has(field.type);
    const used = new Set<string>();
    const grouped = contract.detail.sections
      .map((section) => {
        const fields = section.fields.map((name) => getField(contract, name)).filter(writable);
        for (const field of fields) used.add(field.name);
        return { key: section.key, label: section.label, fields };
      })
      .filter((section) => section.fields.length > 0);
    // Editable fields that no section shows (write-only ones such as passwords).
    const rest = contract.fields.filter((field) => writable(field) && !used.has(field.name));
    return rest.length > 0 ? [...grouped, { key: "__rest", label: t("otherFields"), fields: rest }] : grouped;
  }, [contract, t]);
  const fields = useMemo(() => sections.flatMap((section) => section.fields), [sections]);

  const [base, setBase] = useState<RecordDetail | null>(record);
  const initial = useMemo(() => {
    const values: Record<string, unknown> = {};
    for (const field of fields) {
      values[field.name] = toInputValue(field, base ? getValue(base.data, field.name) : undefined);
      if (!base && field.type === "boolean") values[field.name] = false;
    }
    return values;
  }, [fields, base]);
  const [values, setValues] = useState(initial);
  const [reason, setReason] = useState("");
  /** The record as someone else saved it meanwhile (`409 stale_record`). */
  const [stale, setStale] = useState<RecordDetail | null>(null);

  const error = mutation.error;
  const fieldErrors = isApiError(error) && error.code === "validation_failed" ? error.fields : {};
  const isLocked = (field: Field) => !isCreate && field.config.create_only === true;
  const changed = fields.filter((field) => !isLocked(field) && !isSame(values[field.name], initial[field.name]));
  const needsReason = contract.writes_require_reason;
  const canSave = (isCreate || changed.length > 0) && (!needsReason || reason.trim() !== "") && !mutation.isPending;

  /** Only what changed. A translated field sends only the languages that changed. */
  const buildInput = (): RecordInput => {
    const input: RecordInput = {};
    for (const field of isCreate ? fields : changed) {
      const value = values[field.name];
      if (field.translated) {
        const next = (value ?? {}) as Translated;
        const before = (initial[field.name] ?? {}) as Translated;
        const locales = Object.keys(next).filter((code) => (next[code] || null) !== (before[code] || null));
        if (locales.length === 0) continue;
        input[field.name] = Object.fromEntries(locales.map((code) => [code, next[code] || null]));
      } else if (field.type === "password") {
        if (value) input[field.name] = value;
      } else if (isCreate && (value === null || value === "") && !field.required) {
        continue;
      } else {
        input[field.name] = value === "" ? null : value;
      }
    }
    if (reason.trim()) input._reason = reason.trim();
    return input;
  };

  const save = (event: FormEvent) => {
    event.preventDefault();
    if (!canSave) return;
    const input = buildInput();
    const handlers = {
      onSuccess: (saved: RecordDetail) => {
        toast.success(isCreate ? t("created", { type: contract.label_singular }) : t("saved"));
        onSaved(saved);
      },
      onError: (failure: unknown) => {
        if (isApiError(failure) && failure.code === "stale_record") {
          const current = failure.details.current as RecordDetail | undefined;
          if (current?.meta?.version) setStale(current);
        }
      },
    };
    if (isCreate) create.mutate(input, handlers);
    else if (base) update.mutate({ id: base.data.id, version: base.meta.version, input }, handlers);
  };

  /** Continue from the newer version: the admin's edits stay, untouched fields take the new values. */
  const adoptStale = () => {
    if (!stale) return;
    const next: Record<string, unknown> = {};
    for (const field of fields) {
      const edited = !isSame(values[field.name], initial[field.name]);
      next[field.name] = edited ? values[field.name] : toInputValue(field, getValue(stale.data, field.name));
    }
    setBase(stale);
    setValues(next);
    setStale(null);
    update.reset();
  };

  const staleFields = stale
    ? fields.filter((field) => !isSame(toInputValue(field, getValue(stale.data, field.name)), initial[field.name]))
    : [];

  return (
    <form id={formId} onSubmit={save} className="flex flex-col gap-7 px-5 py-6 sm:px-7" noValidate>
      {stale ? (
        <div role="alert" className="flex flex-col gap-3 rounded-md border border-tone-warning/50 bg-tone-warning/10 p-4 text-sm">
          <p className="font-medium">{t("staleTitle")}</p>
          <p className="text-muted-foreground">{t("staleDescription")}</p>
          {staleFields.length > 0 ? (
            <dl className="flex flex-col gap-1.5">
              {staleFields.map((field) => (
                <div key={field.name} className="flex flex-wrap items-baseline gap-x-3">
                  <dt className="font-medium">{field.label}</dt>
                  <dd className="min-w-0 text-muted-foreground">
                    <FieldValue field={field} value={getValue(stale.data, field.name)} variant="detail" />
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={adoptStale}>
              {t("staleKeepMine")}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => onSaved(stale)}>
              {t("staleDiscard")}
            </Button>
          </div>
        </div>
      ) : null}

      {error && !stale && Object.keys(fieldErrors).length === 0 ? (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {errorMessage(error)}
          {isApiError(error) && error.requestId ? (
            <span className="mt-1 block font-mono text-xs opacity-80 select-all">{error.requestId}</span>
          ) : null}
        </p>
      ) : null}
      {Object.keys(fieldErrors).length > 0 ? (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {errorMessage(error)}
        </p>
      ) : null}

      {sections.map((section) => (
        <section key={section.key} aria-labelledby={`${formId}-${section.key}`}>
          <h3
            id={`${formId}-${section.key}`}
            className="mb-3 flex items-center gap-3 font-mono text-[0.6875rem] tracking-wider text-muted-foreground uppercase after:h-px after:flex-1 after:bg-border"
          >
            {section.label}
          </h3>
          <div className="flex flex-col gap-4">
            {section.fields.map((field) =>
              field.translated ? (
                <TranslatedField
                  key={field.name}
                  contract={contract}
                  recordId={base?.data.id ?? null}
                  field={field}
                  value={(values[field.name] ?? {}) as Translated}
                  errors={fieldErrors}
                  disabled={mutation.isPending || isLocked(field)}
                  locked={isLocked(field)}
                  onChange={(value) => setValues((current) => ({ ...current, [field.name]: value }))}
                />
              ) : (
                <FormRow
                  key={field.name}
                  field={field}
                  required={field.required && (isCreate || field.type !== "password")}
                  error={fieldErrors[field.name]?.[0]}
                  locked={isLocked(field)}
                >
                  {(id, describedBy) => (
                    <FieldInput
                      id={id}
                      field={field}
                      value={values[field.name]}
                      valueLabel={base ? referenceLabel(getValue(base.data, field.name)) : null}
                      invalid={Boolean(fieldErrors[field.name])}
                      disabled={mutation.isPending || isLocked(field)}
                      aria-describedby={describedBy}
                      onChange={(value) => setValues((current) => ({ ...current, [field.name]: value }))}
                    />
                  )}
                </FormRow>
              ),
            )}
          </div>
        </section>
      ))}

      {fields.length === 0 ? <p className="text-sm text-muted-foreground">{t("nothingEditable")}</p> : null}

      {needsReason ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${formId}-reason`}>
            {t("reason")}
            <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id={`${formId}-reason`}
            rows={2}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            aria-invalid={Boolean(fieldErrors._reason) || undefined}
            className="bg-card"
          />
          <p className={cn("text-xs", fieldErrors._reason ? "text-destructive" : "text-muted-foreground")}>
            {fieldErrors._reason?.[0] ?? t("reasonHint")}
          </p>
        </div>
      ) : null}

      <div className="sticky bottom-0 -mx-5 -mb-6 flex items-center justify-end gap-2 border-t bg-popover px-5 py-3 sm:-mx-7 sm:px-7">
        {!isCreate && changed.length > 0 ? (
          <span className="mr-auto text-xs text-muted-foreground">{t("changedCount", { count: changed.length })}</span>
        ) : null}
        <Button type="button" variant="outline" onClick={onCancel} disabled={mutation.isPending}>
          {tCommon("cancel")}
        </Button>
        <Button type="submit" disabled={!canSave}>
          {mutation.isPending ? t("saving") : isCreate ? t("create") : t("save")}
        </Button>
      </div>
    </form>
  );
}

function FormRow({
  field,
  required,
  error,
  locked,
  children,
}: {
  field: Field;
  required: boolean;
  error?: string;
  locked: boolean;
  children: (id: string, describedBy: string | undefined) => React.ReactNode;
}) {
  const t = useTranslations("resources.form");
  const id = useId();
  const helpId = `${id}-help`;
  const help = error ?? (locked ? t("createOnly") : field.help);
  const inline = field.type === "boolean";

  return (
    <div className="flex flex-col gap-1.5">
      <div className={cn("flex gap-1.5", inline ? "items-center justify-between" : "flex-col")}>
        <Label htmlFor={id} className="gap-1">
          {field.label}
          {required ? <span className="text-destructive">*</span> : null}
          {locked ? <LockIcon aria-hidden className="size-3 text-muted-foreground" /> : null}
        </Label>
        {children(id, help ? helpId : undefined)}
      </div>
      {help ? (
        <p id={helpId} className={cn("text-xs", error ? "text-destructive" : "text-muted-foreground")}>
          {help}
        </p>
      ) : null}
    </div>
  );
}

/** `:placeholders` of a text, e.g. `Hello :name`. */
function placeholdersOf(text: string | null | undefined): string[] {
  return [...new Set((text ?? "").match(/:[a-zA-Z_][a-zA-Z0-9_]*/g) ?? [])];
}

/**
 * One input per language. Languages in `required_locales` cannot be emptied; where the
 * field checks placeholders, every `:placeholder` of the English text must be in each
 * other language; empty languages can be filled with machine translation suggestions,
 * which the admin reviews before saving.
 */
function TranslatedField({
  contract,
  recordId,
  field,
  value,
  errors,
  disabled,
  locked,
  onChange,
}: {
  contract: Contract;
  recordId: RecordDetail["data"]["id"] | null;
  field: Field;
  value: Translated;
  errors: Record<string, string[]>;
  disabled: boolean;
  locked: boolean;
  onChange: (value: Translated) => void;
}) {
  const t = useTranslations("resources.form");
  const uiLocale = useLocale();
  const id = useId();
  const toastError = useErrorToast();
  const suggest = useSuggestTranslations(contract.key, recordId);
  const [suggested, setSuggested] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<Record<string, string>>({});

  const languages = field.config.locales ?? Object.keys(localeNames);
  const required = field.config.required_locales ?? [];
  const source = placeholdersOf(value.en);
  const emptyLanguages = languages.filter((code) => code !== "en" && !value[code]);
  const multiline = field.type === "long_text" || field.type === "rich_text";
  const isText = field.type === "text" || multiline || field.type === "slug";

  const fill = () =>
    suggest.mutate(
      { fields: [field.name], locales: emptyLanguages, values: { [field.name]: value } },
      {
        onSuccess: (result) => {
          const texts = result.data[field.name] ?? {};
          if (Object.keys(texts).length === 0) {
            toast.info(t("noSuggestions"));
            return;
          }
          onChange({ ...value, ...texts });
          setSuggested(Object.keys(texts));
          setWarnings(
            Object.fromEntries(
              Object.entries(result.meta.warnings)
                .filter(([key]) => key.startsWith(`${field.name}.`))
                .map(([key, text]) => [key.slice(field.name.length + 1), text]),
            ),
          );
        },
        onError: toastError,
      },
    );

  return (
    <fieldset className="flex flex-col gap-2 rounded-md border p-3">
      <legend className="flex items-center gap-1.5 px-1 text-sm font-medium">
        {field.label}
        {locked ? <LockIcon aria-hidden className="size-3 text-muted-foreground" /> : null}
      </legend>
      {field.help || locked ? (
        <p className="text-xs text-muted-foreground">{locked ? t("createOnly") : field.help}</p>
      ) : null}
      {field.config.placeholders && source.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          {t("placeholdersHint")}{" "}
          {source.map((name) => (
            <code key={name} className="mr-1 rounded-sm bg-muted px-1 font-mono">
              {name}
            </code>
          ))}
        </p>
      ) : null}

      {languages.map((code) => {
        const inputId = `${id}-${code}`;
        const error = errors[`${field.name}.${code}`]?.[0] ?? (code === "en" ? errors[field.name]?.[0] : undefined);
        const text = value[code] ?? "";
        const missing =
          field.config.placeholders && code !== "en" && text
            ? source.filter((name) => !placeholdersOf(text).includes(name))
            : [];
        const note =
          error ??
          warnings[code] ??
          (missing.length > 0 ? t("placeholdersMissing", { names: missing.join(" ") }) : undefined) ??
          (suggested.includes(code) ? t("suggestedHint") : undefined);
        const set = (next: string) => {
          onChange({ ...value, [code]: next === "" ? null : next });
          setSuggested((current) => current.filter((entry) => entry !== code));
        };

        return (
          <div key={code} className="flex flex-col gap-1">
            <div className="flex items-start gap-2">
              <Label
                htmlFor={inputId}
                title={localeNames[code as keyof typeof localeNames] ?? code}
                className={cn(
                  "mt-1.5 w-9 shrink-0 justify-center rounded-sm border py-0.5 font-mono text-[0.625rem] uppercase",
                  code === uiLocale && "border-brand/50",
                )}
              >
                {code}
                {required.includes(code) ? <span className="text-destructive">*</span> : null}
              </Label>
              {field.type === "json" ? (
                <FieldInput
                  id={inputId}
                  field={{ ...field, type: "json" }}
                  value={value[code] ?? null}
                  invalid={Boolean(error)}
                  disabled={disabled}
                  onChange={(next) => onChange({ ...value, [code]: next as string | null })}
                />
              ) : field.type === "rich_text" ? (
                <div className="min-w-0 flex-1">
                  <RichTextEditor
                    id={inputId}
                    value={text}
                    disabled={disabled}
                    invalid={Boolean(error)}
                    compact
                    onChange={set}
                  />
                </div>
              ) : multiline || !isText ? (
                <Textarea
                  id={inputId}
                  rows={3}
                  value={text}
                  disabled={disabled}
                  aria-invalid={Boolean(error) || undefined}
                  onChange={(event) => set(event.target.value)}
                  className="bg-card"
                />
              ) : (
                <Input
                  id={inputId}
                  value={text}
                  disabled={disabled}
                  maxLength={field.config.max_length}
                  aria-invalid={Boolean(error) || undefined}
                  onChange={(event) => set(event.target.value)}
                  className="bg-card"
                />
              )}
            </div>
            {note ? (
              <p className={cn("pl-11 text-xs", error ? "text-destructive" : "text-muted-foreground")}>{note}</p>
            ) : null}
          </div>
        );
      })}

      {field.config.suggestions && !locked ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start"
          disabled={disabled || suggest.isPending || !value.en || emptyLanguages.length === 0}
          onClick={fill}
        >
          <LanguagesIcon />
          {suggest.isPending ? t("suggesting") : t("suggest")}
        </Button>
      ) : null}
    </fieldset>
  );
}
