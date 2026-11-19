"use client";

import { useState } from "react";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "cn";

import { SimpleSelect } from "@/components/simple-select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { localeNames, locales } from "@/i18n/config";
import { useFormat } from "@/i18n/use-format";
import type { RecordId } from "@/lib/api/types";

import type { FieldConfig, FieldType } from "../types";
import { RecordPicker, StaffPicker } from "./pickers";

/** The parts of a contract field or an action input that decide its form control. */
export interface InputField {
  name: string;
  type: FieldType;
  config: FieldConfig;
  required?: boolean;
}

export interface FieldInputProps {
  field: InputField;
  /**
   * The value in the format the API takes on save (`RecordRules` on the backend):
   * money as an integer of minor units, a linked record or admin as its id, a date as
   * `YYYY-MM-DD`, a date-time as ISO 8601 with offset, `json` / `key_value` /
   * `boolean_group` as objects, a file as a `File`.
   */
  value: unknown;
  onChange: (value: unknown) => void;
  /** Label of the current linked record or admin, when the caller knows it. */
  valueLabel?: string | null;
  id?: string;
  invalid?: boolean;
  disabled?: boolean;
  /** Currency shown next to a money input. */
  currency?: string | null;
  "aria-describedby"?: string;
}

/** ISO date-time (UTC) to the value of a `datetime-local` input, in the browser's time zone. */
function toLocalInput(iso: unknown): string {
  if (typeof iso !== "string" || !iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function fromLocalInput(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().replace(/\.\d{3}Z$/, "Z");
}

function acceptAttribute(accept: FieldConfig["accept"]): string | undefined {
  if (!accept) return undefined;
  return Array.isArray(accept) ? accept.join(",") : accept;
}

/**
 * The form control for one field type. Used by the record form, the action dialog and the
 * filter builder, so every editable type of the catalogue is handled in one place.
 * Types that cannot be edited through the API yet (`image`, `images`, `relation_many`,
 * `id`) have no control and render nothing.
 */
export function FieldInput(props: FieldInputProps) {
  const { field, value, onChange, id, invalid, disabled, valueLabel } = props;
  const t = useTranslations("resources.inputs");
  const format = useFormat();
  const describedBy = props["aria-describedby"];
  const common = { id, disabled, "aria-invalid": invalid || undefined, "aria-describedby": describedBy };
  const text = typeof value === "string" || typeof value === "number" ? String(value) : "";

  switch (field.type) {
    case "long_text":
      return (
        <Textarea
          {...common}
          value={text}
          maxLength={field.config.max_length}
          rows={4}
          onChange={(event) => onChange(event.target.value)}
          className="bg-card"
        />
      );

    case "rich_text":
    case "code":
      return (
        <Textarea
          {...common}
          value={text}
          rows={field.type === "code" ? 8 : 6}
          spellCheck={field.type === "rich_text"}
          onChange={(event) => onChange(event.target.value)}
          className="bg-card font-mono text-[0.8125rem]"
        />
      );

    case "number":
      return (
        <div className="flex items-center gap-2">
          <Input
            {...common}
            type="number"
            inputMode="decimal"
            value={text}
            min={field.config.min}
            max={field.config.max}
            step={field.config.step ?? "any"}
            onChange={(event) => onChange(event.target.value === "" ? null : Number(event.target.value))}
            className="bg-card font-mono tabular-nums"
          />
          {field.config.unit ? <span className="text-sm text-muted-foreground">{field.config.unit}</span> : null}
        </div>
      );

    case "money":
      return <MoneyInput {...props} />;

    case "boolean":
      return (
        <Switch
          id={id}
          disabled={disabled}
          checked={value === true}
          onCheckedChange={(checked) => onChange(checked)}
          aria-describedby={describedBy}
        />
      );

    case "boolean_group": {
      const flags = (typeof value === "object" && value !== null ? value : {}) as Record<string, boolean>;
      return (
        <div className="flex flex-col gap-1.5" role="group" aria-describedby={describedBy}>
          {(field.config.options ?? []).map((option) => (
            <label key={option.value} className="flex items-center gap-2 text-sm">
              <Checkbox
                disabled={disabled}
                checked={flags[option.value] === true}
                onCheckedChange={(checked) => onChange({ ...flags, [option.value]: checked === true })}
              />
              {option.label}
            </label>
          ))}
        </div>
      );
    }

    case "enum": {
      const options = (field.config.options ?? []).map((option) => ({ value: String(option.value), label: option.label }));
      return (
        <SimpleSelect
          id={id}
          disabled={disabled}
          invalid={invalid}
          value={value === null || value === undefined ? null : String(value)}
          options={field.required ? options : [{ value: "", label: t("none") }, ...options]}
          placeholder={t("choose")}
          onChange={(next) => {
            // Option values are sent back as the contract gave them: number or text.
            const original = field.config.options?.find((option) => String(option.value) === next);
            onChange(next === "" ? null : (original?.value ?? next));
          }}
        />
      );
    }

    case "locale":
      return (
        <SimpleSelect
          id={id}
          disabled={disabled}
          invalid={invalid}
          value={typeof value === "string" ? value : null}
          options={[
            ...(field.required ? [] : [{ value: "", label: t("none") }]),
            ...locales.map((code) => ({ value: code, label: localeNames[code] })),
          ]}
          placeholder={t("choose")}
          onChange={(next) => onChange(next === "" ? null : next)}
        />
      );

    case "country":
      return (
        <div className="flex items-center gap-2">
          <Input
            {...common}
            value={text}
            maxLength={2}
            placeholder="IT"
            autoCapitalize="characters"
            onChange={(event) => onChange(event.target.value.toUpperCase().replace(/[^A-Z]/g, "") || null)}
            className="w-16 bg-card font-mono uppercase"
          />
          {text.length === 2 ? <span className="text-sm text-muted-foreground">{format.country(text)}</span> : null}
        </div>
      );

    case "date":
      return (
        <Input
          {...common}
          type="date"
          value={text.slice(0, 10)}
          onChange={(event) => onChange(event.target.value || null)}
          className="w-44 bg-card"
        />
      );

    case "datetime":
      return (
        <Input
          {...common}
          type="datetime-local"
          value={toLocalInput(value)}
          onChange={(event) => onChange(fromLocalInput(event.target.value))}
          className="w-60 bg-card"
        />
      );

    case "json":
      return <JsonInput {...props} />;

    case "key_value":
      return <KeyValueInput {...props} />;

    case "password":
      return (
        <Input
          {...common}
          type="password"
          autoComplete="new-password"
          minLength={field.config.min_length}
          value={text}
          onChange={(event) => onChange(event.target.value)}
          className="bg-card"
        />
      );

    case "file":
      return (
        <div className="flex flex-col gap-1">
          <Input
            {...common}
            type="file"
            accept={acceptAttribute(field.config.accept)}
            onChange={(event) => onChange(event.target.files?.[0] ?? null)}
            className="bg-card"
          />
          {field.config.max_size ? (
            <p className="text-xs text-muted-foreground">
              {t("maxFileSize", { size: format.fileSize(field.config.max_size * 1024) })}
            </p>
          ) : null}
        </div>
      );

    case "relation_one":
      if (!field.config.resource) {
        return <Input {...common} value={text} onChange={(event) => onChange(event.target.value || null)} className="bg-card" />;
      }
      return (
        <RecordPicker
          id={id}
          disabled={disabled}
          invalid={invalid}
          resource={field.config.resource}
          value={(value as RecordId | null | undefined) ?? null}
          valueLabel={valueLabel}
          clearable={!field.required}
          onChange={(next) => onChange(next)}
        />
      );

    case "admin":
      return (
        <StaffPicker
          id={id}
          disabled={disabled}
          invalid={invalid}
          value={typeof value === "number" ? value : null}
          valueLabel={valueLabel}
          clearable={!field.required}
          onChange={(next) => onChange(next)}
        />
      );

    case "image":
    case "images":
    case "relation_many":
    case "id":
      return null;

    case "email":
    case "phone":
    case "url":
    case "slug":
    case "text":
    default: {
      const type = field.type === "email" ? "email" : field.type === "phone" ? "tel" : field.type === "url" ? "url" : "text";
      return (
        <Input
          {...common}
          type={type}
          value={text}
          maxLength={field.config.max_length}
          onChange={(event) => onChange(event.target.value)}
          className={cn("bg-card", field.type === "slug" && "font-mono text-[0.8125rem]")}
        />
      );
    }
  }
}

/** Money is typed in major units (12.50) and reported as an integer of minor units (1250). */
function MoneyInput({ value, onChange, id, invalid, disabled, currency, field, ...rest }: FieldInputProps) {
  const cents = typeof value === "number" ? value : null;
  const [draft, setDraft] = useState(() => (cents === null ? "" : (cents / 100).toFixed(2)));
  const [lastCents, setLastCents] = useState(cents);

  // The value changed from outside (reset, prefill): show it.
  if (cents !== lastCents) {
    setLastCents(cents);
    const typed = draft === "" ? null : Math.round(Number(draft.replace(",", ".")) * 100);
    if (typed !== cents) setDraft(cents === null ? "" : (cents / 100).toFixed(2));
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        id={id}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        aria-describedby={rest["aria-describedby"]}
        inputMode="decimal"
        value={draft}
        placeholder="0.00"
        onChange={(event) => {
          const next = event.target.value.replace(/[^0-9.,-]/g, "");
          setDraft(next);
          const number = Number(next.replace(",", "."));
          const nextCents = next === "" || Number.isNaN(number) ? null : Math.round(number * 100);
          setLastCents(nextCents);
          onChange(nextCents);
        }}
        className="w-40 bg-card font-mono tabular-nums"
      />
      <span className="font-mono text-xs text-muted-foreground">{currency ?? field.config.currency ?? ""}</span>
    </div>
  );
}

/** A JSON value edited as text. Reports the parsed value; invalid JSON is flagged and not reported. */
function JsonInput({ value, onChange, id, disabled, invalid, ...rest }: FieldInputProps) {
  const t = useTranslations("resources.inputs");
  const [draft, setDraft] = useState(() =>
    value === null || value === undefined ? "" : typeof value === "string" ? value : JSON.stringify(value, null, 2),
  );
  const [broken, setBroken] = useState(false);

  return (
    <div className="flex flex-col gap-1">
      <Textarea
        id={id}
        disabled={disabled}
        aria-invalid={invalid || broken || undefined}
        aria-describedby={rest["aria-describedby"]}
        rows={8}
        spellCheck={false}
        value={draft}
        onChange={(event) => {
          const next = event.target.value;
          setDraft(next);
          if (next.trim() === "") {
            setBroken(false);
            onChange(null);
            return;
          }
          try {
            onChange(JSON.parse(next));
            setBroken(false);
          } catch {
            setBroken(true);
          }
        }}
        className="bg-card font-mono text-[0.8125rem]"
      />
      {broken ? <p className="text-xs text-destructive">{t("invalidJson")}</p> : null}
    </div>
  );
}

function KeyValueInput({ value, onChange, disabled, field }: FieldInputProps) {
  const t = useTranslations("resources.inputs");
  const [rows, setRows] = useState<[string, string][]>(() =>
    Object.entries((typeof value === "object" && value !== null ? value : {}) as Record<string, unknown>).map(
      ([key, entry]) => [key, String(entry ?? "")],
    ),
  );

  const update = (next: [string, string][]) => {
    setRows(next);
    onChange(Object.fromEntries(next.filter(([key]) => key.trim() !== "")));
  };

  return (
    <div className="flex flex-col gap-1.5">
      {rows.map(([key, entry], index) => (
        <div key={index} className="flex items-center gap-1.5">
          <Input
            disabled={disabled}
            value={key}
            placeholder={field.config.key_label ?? t("key")}
            aria-label={field.config.key_label ?? t("key")}
            onChange={(event) => update(rows.map((row, i) => (i === index ? [event.target.value, row[1]] : row)))}
            className="bg-card font-mono text-[0.8125rem]"
          />
          <Input
            disabled={disabled}
            value={entry}
            placeholder={field.config.value_label ?? t("value")}
            aria-label={field.config.value_label ?? t("value")}
            onChange={(event) => update(rows.map((row, i) => (i === index ? [row[0], event.target.value] : row)))}
            className="bg-card"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={disabled}
            aria-label={t("removeRow")}
            onClick={() => update(rows.filter((_, i) => i !== index))}
          >
            <Trash2Icon />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="self-start"
        disabled={disabled}
        onClick={() => setRows([...rows, ["", ""]])}
      >
        <PlusIcon />
        {t("addRow")}
      </Button>
    </div>
  );
}
