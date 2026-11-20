"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDownIcon, LoaderCircleIcon, PencilIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { cn } from "cn";

import { FieldInput } from "@/components/resource/field-input";
import { FieldValue } from "@/components/resource/field-value";
import { SimpleSelect } from "@/components/simple-select";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { localeNames, locales } from "@/i18n/config";
import { getApiErrorCode, isApiError } from "@/lib/api/client";
import { useErrorToast } from "@/lib/api/use-error-message";
import { isMasked, isMoney, type RecordId } from "@/lib/api/types";

import { getAction } from "../lib/contract";
import { isSameValue, toInputValue } from "../lib/input-values";
import { useSaveInlineField } from "../mutations";
import type { Action, Contract, Field, InlineField, RecordDetail } from "../types";

/** Types typed into one input: saved on blur or Enter, dropped on Escape. */
const TYPED: ReadonlySet<Field["type"]> = new Set([
  "text",
  "email",
  "phone",
  "url",
  "slug",
  "number",
  "money",
  "date",
  "datetime",
  "country",
]);

/** Types picked from a list: saved as soon as a value is picked. */
const PICKED: ReadonlySet<Field["type"]> = new Set(["enum", "locale"]);

/** `""` stands for "no value" in a select. */
const NONE = "";

export interface InlineFieldProps {
  contract: Contract;
  /** The tab's inline entry of this field. */
  entry: InlineField;
  field: Field;
  recordId: RecordId;
  /** The value as the record has it. */
  value: unknown;
  /** The record with its `meta`, where it is loaded (the drawer). A list only has the row. */
  record?: RecordDetail;
  variant: "cell" | "detail";
  onOpenRecord?: (resource: string, id: RecordId) => void;
  /** Opens the action dialog for an action-bound field, with the picked value filled in. */
  onRunAction: (action: Action, id: RecordId, initialInput: Record<string, unknown>) => void;
}

/**
 * One field that can be changed in place, in a list cell or on the detail page
 * (`field-types.md` section 5, Inline fields). There is no submit button per field:
 *
 * - `mode: "field"` saves that one field on blur, Enter or pick. A validation error stays
 *   on the field; any other failure puts the old value back.
 * - `mode: "action"` picks the new value and hands it to the action dialog, which asks for
 *   the preview, reason and confirmation the action needs.
 * - `mode: "result"` is read-only: the backend fills it when `filled_from` is saved.
 *
 * Everything that cannot be edited here (no permission, a masked or translated value, a
 * type without a one-line control, a resource whose writes need a reason) is shown as a
 * plain value; the edit form still covers it.
 */
export function InlineFieldControl(props: InlineFieldProps) {
  const { contract, entry, field, value, record, variant, onOpenRecord } = props;
  const readOnly = <FieldValue field={field} value={value} variant={variant} onOpenRecord={onOpenRecord} />;

  if (!entry.editable || entry.mode === "result" || isMasked(value) || field.translated || record?.meta.trashed) {
    return readOnly;
  }

  if (entry.mode === "action") {
    const action = entry.action ? getAction(contract, entry.action) : undefined;
    // In a list the row does not say which actions apply; the API refuses one that does not.
    if (!action || (record && !record.meta.actions.includes(action.key))) return readOnly;
    return <ActionBound {...props} action={action} />;
  }

  const supported = TYPED.has(field.type) || PICKED.has(field.type) || field.type === "boolean";
  const allowed = field.editable && !field.via && field.config.create_only !== true && !contract.writes_require_reason;
  if (!supported || !allowed || (record && !record.meta.abilities.update)) return readOnly;
  return <Editable {...props} />;
}

/** Keeps a click or key press in the control from also opening the row it sits in. */
const contained = {
  onClick: (event: React.MouseEvent) => event.stopPropagation(),
  onKeyDown: (event: React.KeyboardEvent) => event.stopPropagation(),
};

function EditButton({ label, variant, onClick }: { label: string; variant: "cell" | "detail"; onClick: () => void }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "shrink-0 text-muted-foreground opacity-50 hover:opacity-100 focus-visible:opacity-100",
        variant === "cell" && "group-hover/row:opacity-100",
      )}
    >
      <PencilIcon />
    </Button>
  );
}

/** A value shown as a button that opens its list of choices. */
function PickButton({ label, children, onClick }: { label: string; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="inline-flex max-w-full items-center gap-1 rounded-md py-0.5 pr-1 outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
    >
      {children}
      <ChevronDownIcon aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
    </button>
  );
}

function Editable({ contract, field, recordId, value, record, variant, onOpenRecord }: InlineFieldProps) {
  const t = useTranslations("resources.inline");
  const tInputs = useTranslations("resources.inputs");
  const toastError = useErrorToast();
  const save = useSaveInlineField(contract.key);
  const shown = toInputValue(field, value);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<unknown>(shown);
  /** The message of a refused value, and the value it was refused for. */
  const [refused, setRefused] = useState<{ message: string; draft: unknown } | null>(null);
  const wrapper = useRef<HTMLDivElement>(null);
  const picked = useRef(false);

  useEffect(() => {
    if (!editing) return;
    const input = wrapper.current?.querySelector("input");
    input?.focus();
    if (input?.type === "text" || input?.type === "url" || input?.type === "email" || input?.type === "tel") input.select();
  }, [editing]);

  const start = () => {
    setDraft(shown);
    setRefused(null);
    picked.current = false;
    setEditing(true);
  };
  const cancel = () => {
    setEditing(false);
    setRefused(null);
  };

  const commit = (next: unknown) => {
    if (save.isPending) return;
    const normalized = next === "" ? null : next;
    if (isSameValue(normalized, shown)) return cancel();
    save.mutate(
      { id: recordId, field, value: normalized, shown, version: record?.meta.version },
      {
        onSuccess: cancel,
        onError: (error) => {
          const message = isApiError(error) && error.code === "validation_failed" ? error.fields[field.name]?.[0] : undefined;
          if (message && TYPED.has(field.type)) {
            // The value is wrong, not the save: keep it in the field with the reason.
            setRefused({ message, draft: next });
            setEditing(true);
            return;
          }
          // Anything else puts the old value back.
          cancel();
          if (getApiErrorCode(error) === "stale_record") toast.error(t("conflict"));
          else toastError(error);
        },
      },
    );
  };

  const editLabel = t("edit", { label: field.label });
  const spinner = save.isPending ? (
    <LoaderCircleIcon aria-label={t("saving")} className="size-3.5 shrink-0 animate-spin text-muted-foreground" />
  ) : null;

  if (field.type === "boolean") {
    return (
      <span className="inline-flex items-center gap-2" {...contained}>
        <Switch
          size="sm"
          aria-label={field.label}
          checked={value === true}
          disabled={save.isPending}
          onCheckedChange={(checked) => commit(checked)}
        />
        {spinner}
      </span>
    );
  }

  if (PICKED.has(field.type)) {
    const choices =
      field.type === "locale"
        ? locales.map((code) => ({ value: code as string, label: localeNames[code] }))
        : (field.config.options ?? []).map((option) => ({ value: String(option.value), label: option.label }));
    const options = field.required ? choices : [{ value: NONE, label: tInputs("none") }, ...choices];

    return (
      <span className="inline-flex max-w-full items-center gap-1.5" {...contained}>
        {editing ? (
          <SimpleSelect
            size="sm"
            aria-label={field.label}
            className="w-44"
            value={shown === null ? null : String(shown)}
            options={options}
            placeholder={tInputs("choose")}
            defaultOpen
            onOpenChange={(open) => {
              // Closed without a pick: nothing changes.
              if (!open && !picked.current) cancel();
            }}
            onChange={(next) => {
              picked.current = true;
              // Option values go back as the contract gave them: number or text.
              const original = field.config.options?.find((option) => String(option.value) === next);
              commit(next === NONE ? null : (original?.value ?? next));
              setEditing(false);
            }}
          />
        ) : (
          <PickButton label={editLabel} onClick={start}>
            <FieldValue field={field} value={value} variant={variant} />
          </PickButton>
        )}
        {spinner}
      </span>
    );
  }

  if (!editing) {
    return (
      <span className="inline-flex max-w-full items-center gap-1" {...contained}>
        <FieldValue field={field} value={value} variant={variant} onOpenRecord={onOpenRecord} />
        {spinner ?? <EditButton label={editLabel} variant={variant} onClick={start} />}
      </span>
    );
  }

  return (
    <div
      ref={wrapper}
      className={cn("inline-flex flex-col gap-1 text-left", variant === "cell" ? "w-64 max-w-full" : "w-full sm:w-72")}
      onClick={contained.onClick}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === "Enter") {
          event.preventDefault();
          commit(draft);
        } else if (event.key === "Escape") {
          event.preventDefault();
          cancel();
        }
      }}
      onBlur={(event) => {
        if (event.currentTarget.contains(event.relatedTarget)) return;
        // Leaving a refused value untouched gives it up; anything else is saved.
        if (refused && isSameValue(refused.draft, draft)) cancel();
        else commit(draft);
      }}
    >
      <span className="flex items-center gap-1.5">
        <FieldInput
          field={field}
          value={draft}
          invalid={refused !== null}
          currency={isMoney(value) ? value.currency : null}
          onChange={setDraft}
        />
        {spinner}
      </span>
      {refused ? (
        <p role="alert" className="text-xs whitespace-normal text-destructive">
          {refused.message}
        </p>
      ) : null}
    </div>
  );
}

/** A field that only changes through an action: pick the value, the action dialog does the rest. */
function ActionBound({
  entry,
  field,
  recordId,
  value,
  variant,
  action,
  onRunAction,
}: InlineFieldProps & { action: Action }) {
  const t = useTranslations("resources.inline");
  const tInputs = useTranslations("resources.inputs");
  const [picking, setPicking] = useState(false);
  const picked = useRef(false);
  const input = action.inputs.find((candidate) => candidate.name === entry.input);
  const options = input?.type === "enum" ? (input.config.options ?? []) : [];
  const label = t("change", { label: field.label });
  const display = <FieldValue field={field} value={value} variant={variant} />;

  // Without a list of values to pick from, the action dialog asks for the value itself.
  if (!input || options.length === 0) {
    return (
      <span className="inline-flex max-w-full items-center gap-1" {...contained}>
        {display}
        <EditButton label={label} variant={variant} onClick={() => onRunAction(action, recordId, {})} />
      </span>
    );
  }

  return (
    <span className="inline-flex max-w-full items-center" {...contained}>
      {picking ? (
        <SimpleSelect
          size="sm"
          aria-label={field.label}
          className="w-44"
          value={null}
          options={options.map((option) => ({ value: String(option.value), label: option.label }))}
          placeholder={tInputs("choose")}
          defaultOpen
          onOpenChange={(open) => {
            if (!open && !picked.current) setPicking(false);
          }}
          onChange={(next) => {
            picked.current = true;
            setPicking(false);
            const original = options.find((option) => String(option.value) === next);
            onRunAction(action, recordId, { [input.name]: original?.value ?? next });
          }}
        />
      ) : (
        <PickButton
          label={label}
          onClick={() => {
            picked.current = false;
            setPicking(true);
          }}
        >
          {display}
        </PickButton>
      )}
    </span>
  );
}
