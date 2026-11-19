"use client";

import { useState } from "react";
import { FolderPlusIcon, PlusIcon, Trash2Icon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "cn";

import { SimpleSelect } from "@/components/simple-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { RecordId } from "@/lib/api/types";

import { getField } from "../lib/contract";
import {
  countConditions,
  defaultValue,
  EMPTY_FILTER,
  FILTER_LIMITS,
  isDateType,
  isGroup,
  LIST_OPERATORS,
  newCondition,
  pruneFilter,
  RELATIVE_DAYS,
  RELATIVE_UNITS,
  type RelativeUnit,
  VALUELESS_OPERATORS,
  WITHIN_PRESETS,
} from "../lib/filters";
import type { Contract, Field, FilterCondition, FilterGroup, FilterNode, Operator } from "../types";
import { FieldInput } from "@/components/resource/field-input";
import { RecordPicker, StaffPicker } from "@/components/resource/pickers";

interface FilterBuilderProps {
  contract: Contract;
  /** The filter in use; `null` when there is none. */
  value: FilterGroup | null;
  onApply: (filter: FilterGroup | null) => void;
  onClose: () => void;
}

/**
 * Editor for the admin's own filter, in the API's filter grammar (`conventions.md`
 * section 6): conditions and nested groups joined by `and` / `or`, each field offering
 * only the operators its contract entry lists. The draft is applied as a whole.
 */
export function FilterBuilder({ contract, value, onApply, onClose }: FilterBuilderProps) {
  const t = useTranslations("resources.filters");
  const fields = contract.fields.filter((field) => field.filterable && field.operators.length > 0);
  const [draft, setDraft] = useState<FilterGroup>(() =>
    value ?? (fields[0] ? { op: "and", conditions: [newCondition(fields[0])] } : EMPTY_FILTER),
  );
  const total = countConditions(draft);

  if (fields.length === 0) {
    return <p className="border-b bg-muted/40 px-4 py-3 text-sm text-muted-foreground sm:px-6">{t("noFields")}</p>;
  }

  return (
    <section aria-label={t("title")} className="flex flex-col gap-3 border-b bg-muted/40 px-4 py-3 sm:px-6">
      <GroupEditor
        contract={contract}
        fields={fields}
        group={draft}
        depth={1}
        canAdd={total < FILTER_LIMITS.conditions}
        onChange={setDraft}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          onClick={() => {
            onApply(pruneFilter(draft));
            onClose();
          }}
        >
          {t("apply")}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setDraft(EMPTY_FILTER);
            onApply(null);
          }}
        >
          {t("clear")}
        </Button>
        <Button size="sm" variant="ghost" onClick={onClose}>
          {t("close")}
        </Button>
        <span className="ml-auto font-mono text-xs text-muted-foreground">
          {t("conditionCount", { count: total, max: FILTER_LIMITS.conditions })}
        </span>
      </div>
    </section>
  );
}

interface GroupEditorProps {
  contract: Contract;
  fields: Field[];
  group: FilterGroup;
  depth: number;
  canAdd: boolean;
  onChange: (group: FilterGroup) => void;
  onRemove?: () => void;
}

function GroupEditor({ contract, fields, group, depth, canAdd, onChange, onRemove }: GroupEditorProps) {
  const t = useTranslations("resources.filters");
  const setNode = (index: number, node: FilterNode) =>
    onChange({ ...group, conditions: group.conditions.map((entry, i) => (i === index ? node : entry)) });
  const removeNode = (index: number) =>
    onChange({ ...group, conditions: group.conditions.filter((_, i) => i !== index) });

  return (
    <div className={cn("flex flex-col gap-2", depth > 1 && "rounded-md border bg-card/60 p-2.5")}>
      <div className="flex items-center gap-2 text-sm">
        <SimpleSelect
          size="sm"
          className="w-52"
          aria-label={t("matchLabel")}
          value={group.op}
          options={[
            { value: "and", label: t("matchAll") },
            { value: "or", label: t("matchAny") },
          ]}
          onChange={(op) => onChange({ ...group, op: op === "or" ? "or" : "and" })}
        />
        {onRemove ? (
          <Button variant="ghost" size="icon-sm" className="ml-auto" aria-label={t("removeGroup")} onClick={onRemove}>
            <XIcon />
          </Button>
        ) : null}
      </div>

      {group.conditions.map((node, index) =>
        isGroup(node) ? (
          <GroupEditor
            key={index}
            contract={contract}
            fields={fields}
            group={node}
            depth={depth + 1}
            canAdd={canAdd}
            onChange={(next) => setNode(index, next)}
            onRemove={() => removeNode(index)}
          />
        ) : (
          <ConditionEditor
            key={index}
            contract={contract}
            fields={fields}
            condition={node}
            onChange={(next) => setNode(index, next)}
            onRemove={() => removeNode(index)}
          />
        ),
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={!canAdd}
          onClick={() => onChange({ ...group, conditions: [...group.conditions, newCondition(fields[0])] })}
        >
          <PlusIcon />
          {t("addCondition")}
        </Button>
        {depth < FILTER_LIMITS.depth ? (
          <Button
            variant="outline"
            size="sm"
            disabled={!canAdd}
            onClick={() =>
              onChange({
                ...group,
                conditions: [...group.conditions, { op: group.op === "and" ? "or" : "and", conditions: [newCondition(fields[0])] }],
              })
            }
          >
            <FolderPlusIcon />
            {t("addGroup")}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function ConditionEditor({
  contract,
  fields,
  condition,
  onChange,
  onRemove,
}: {
  contract: Contract;
  fields: Field[];
  condition: FilterCondition;
  onChange: (condition: FilterCondition) => void;
  onRemove: () => void;
}) {
  const t = useTranslations("resources.filters");
  const field = getField(contract, condition.field) ?? fields[0];
  // A condition from a link or saved view can use an operator the field no longer lists.
  const operators = field.operators.includes(condition.operator) ? field.operators : [condition.operator, ...field.operators];

  return (
    <div className="flex flex-wrap items-start gap-2">
      <SimpleSelect
        size="sm"
        className="w-52"
        aria-label={t("field")}
        value={field.name}
        options={fields.map((entry) => ({ value: entry.name, label: entry.label }))}
        onChange={(name) => {
          const next = getField(contract, name);
          if (next) onChange(newCondition(next));
        }}
      />
      <SimpleSelect
        size="sm"
        className="w-44"
        aria-label={t("operator")}
        value={condition.operator}
        options={operators.map((operator) => ({ value: operator, label: t(`operators.${operator}`) }))}
        onChange={(next) => {
          const operator = next as Operator;
          const keep =
            !VALUELESS_OPERATORS.has(operator) &&
            LIST_OPERATORS.has(operator) === LIST_OPERATORS.has(condition.operator) &&
            (operator === "between") === (condition.operator === "between") &&
            (operator === "within") === (condition.operator === "within");
          onChange({ field: field.name, operator, value: keep ? condition.value : defaultValue(field, operator) });
        }}
      />
      <div className="min-w-48 flex-1">
        <ConditionValue field={field} condition={condition} onChange={(value) => onChange({ ...condition, value })} />
      </div>
      <Button variant="ghost" size="icon-sm" aria-label={t("removeCondition")} onClick={onRemove}>
        <Trash2Icon />
      </Button>
    </div>
  );
}

/** The value control for a field and operator. */
function ConditionValue({
  field,
  condition,
  onChange,
}: {
  field: Field;
  condition: FilterCondition;
  onChange: (value: unknown) => void;
}) {
  const t = useTranslations("resources.filters");
  const { operator, value } = condition;
  // Filter values are plain values, never translated or masked objects.
  const inputField = { name: field.name, type: field.type, config: field.config, required: true };

  if (VALUELESS_OPERATORS.has(operator)) return null;

  if (operator === "within") return <WithinValue value={value} onChange={onChange} />;

  if (operator === "between") {
    const range = Array.isArray(value) ? value : ["", ""];
    return (
      <div className="flex flex-wrap items-center gap-2">
        <FieldInput field={inputField} value={range[0]} onChange={(next) => onChange([next ?? "", range[1]])} />
        <span className="text-xs text-muted-foreground">{t("and")}</span>
        <FieldInput field={inputField} value={range[1]} onChange={(next) => onChange([range[0], next ?? ""])} />
      </div>
    );
  }

  if (LIST_OPERATORS.has(operator)) {
    return <ListValue field={field} value={Array.isArray(value) ? value : []} onChange={onChange} />;
  }

  if (isDateType(field.type)) return <DateValue field={field} value={value} onChange={onChange} />;

  if (field.type === "admin") {
    return (
      <StaffPicker
        size="sm"
        allowMe
        value={value === "me" ? "me" : typeof value === "number" ? value : null}
        onChange={(next) => onChange(next ?? "")}
      />
    );
  }

  if (field.type === "relation_one" && field.config.resource) {
    return (
      <RecordPicker
        size="sm"
        resource={field.config.resource}
        value={value === "" || value == null ? null : (value as RecordId)}
        onChange={(next) => onChange(next ?? "")}
      />
    );
  }

  if (field.type === "boolean") {
    return (
      <SimpleSelect
        size="sm"
        className="w-28"
        aria-label={t("value")}
        value={value === false ? "false" : "true"}
        options={[
          { value: "true", label: t("yes") },
          { value: "false", label: t("no") },
        ]}
        onChange={(next) => onChange(next === "true")}
      />
    );
  }

  if (["enum", "locale", "country", "number", "money"].includes(field.type)) {
    return <FieldInput field={inputField} value={value} onChange={(next) => onChange(next ?? "")} />;
  }

  return (
    <Input
      value={typeof value === "string" || typeof value === "number" ? String(value) : ""}
      aria-label={t("value")}
      placeholder={t("value")}
      onChange={(event) => onChange(event.target.value)}
      className="h-7 bg-card"
    />
  );
}

/** Values of `in` / `not_in`: options as toggles, records and staff as chips, anything else typed. */
function ListValue({ field, value, onChange }: { field: Field; value: unknown[]; onChange: (value: unknown[]) => void }) {
  const t = useTranslations("resources.filters");
  const [labels, setLabels] = useState<Record<string, string>>({});
  const full = value.length >= FILTER_LIMITS.values;

  if (field.type === "enum" && field.config.options) {
    return (
      <div className="flex flex-wrap gap-1.5">
        {field.config.options.map((option) => {
          const active = value.some((entry) => String(entry) === String(option.value));
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() =>
                onChange(active ? value.filter((entry) => String(entry) !== String(option.value)) : [...value, option.value])
              }
              className={cn(
                "h-7 rounded-full border px-2.5 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active ? "border-foreground bg-foreground text-background" : "bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    );
  }

  if (field.type === "admin" || (field.type === "relation_one" && field.config.resource)) {
    const add = (id: unknown, label: string | null) => {
      if (id === null || id === "me" || value.some((entry) => String(entry) === String(id))) return;
      setLabels((current) => ({ ...current, [String(id)]: label ?? `#${String(id)}` }));
      onChange([...value, id]);
    };
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        {value.map((entry) => (
          <span key={String(entry)} className="inline-flex h-7 items-center gap-1 rounded-full border bg-card pr-1 pl-2.5 text-xs">
            {labels[String(entry)] ?? `#${String(entry)}`}
            <button
              type="button"
              aria-label={t("removeValue")}
              onClick={() => onChange(value.filter((other) => other !== entry))}
              className="flex size-4 items-center justify-center rounded-full text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              <XIcon className="size-3" />
            </button>
          </span>
        ))}
        {field.type === "admin" ? (
          <StaffPicker size="sm" className="w-44" value={null} disabled={full} placeholder={t("addValue")} onChange={add} />
        ) : (
          <RecordPicker
            size="sm"
            className="w-44"
            resource={field.config.resource as string}
            value={null}
            disabled={full}
            placeholder={t("addValue")}
            onChange={add}
          />
        )}
      </div>
    );
  }

  return (
    <Input
      value={value.map(String).join(", ")}
      aria-label={t("values")}
      placeholder={t("valuesPlaceholder")}
      onChange={(event) =>
        onChange(
          event.target.value
            .split(",")
            .map((entry) => (field.type === "country" ? entry.trim().toUpperCase() : entry.trimStart()))
            .filter((entry, index, all) => entry !== "" || index === all.length - 1)
            .slice(0, FILTER_LIMITS.values),
        )
      }
      onBlur={() => onChange(value.map((entry) => String(entry).trim()).filter(Boolean))}
      className="h-7 bg-card"
    />
  );
}

type RelativeRange = Partial<Record<"last" | "next" | "ago" | "from_now", number>> & { unit?: RelativeUnit };

function clampCount(raw: string) {
  const count = Math.round(Number(raw));
  return Number.isFinite(count) ? Math.min(366, Math.max(1, count)) : 1;
}

function CountAndUnit({
  count,
  unit,
  onChange,
}: {
  count: number;
  unit: RelativeUnit;
  onChange: (count: number, unit: RelativeUnit) => void;
}) {
  const t = useTranslations("resources.filters");
  return (
    <>
      <Input
        type="number"
        min={1}
        max={366}
        value={count}
        aria-label={t("count")}
        onChange={(event) => onChange(clampCount(event.target.value), unit)}
        className="h-7 w-20 bg-card font-mono tabular-nums"
      />
      <SimpleSelect
        size="sm"
        className="w-32"
        aria-label={t("unit")}
        value={unit}
        options={RELATIVE_UNITS.map((entry) => ({ value: entry, label: t(`units.${entry}`, { count }) }))}
        onChange={(next) => onChange(count, next as RelativeUnit)}
      />
    </>
  );
}

/** `within`: a named range, or the last / next N days, weeks, months or years. */
function WithinValue({ value, onChange }: { value: unknown; onChange: (value: unknown) => void }) {
  const t = useTranslations("resources.filters");
  const range = typeof value === "object" && value !== null ? (value as RelativeRange) : null;
  const mode = range ? ("next" in range ? "next" : "last") : typeof value === "string" ? value : "today";
  const count = range?.last ?? range?.next ?? 7;
  const unit = range?.unit ?? "day";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <SimpleSelect
        size="sm"
        className="w-44"
        aria-label={t("range")}
        value={mode}
        options={[
          ...WITHIN_PRESETS.map((preset) => ({ value: preset, label: t(`presets.${preset}`) })),
          { value: "last", label: t("lastN") },
          { value: "next", label: t("nextN") },
        ]}
        onChange={(next) => onChange(next === "last" || next === "next" ? { [next]: count, unit } : next)}
      />
      {range ? <CountAndUnit count={count} unit={unit} onChange={(n, u) => onChange({ [mode]: n, unit: u })} /> : null}
    </div>
  );
}

/** A date for `is`, `gt`, `lt`, ...: a fixed day, or a day relative to today. */
function DateValue({ field, value, onChange }: { field: Field; value: unknown; onChange: (value: unknown) => void }) {
  const t = useTranslations("resources.filters");
  const range = typeof value === "object" && value !== null ? (value as RelativeRange) : null;
  const isRelativeDay = typeof value === "string" && (RELATIVE_DAYS as readonly string[]).includes(value);
  const mode = range ? ("from_now" in range ? "from_now" : "ago") : isRelativeDay ? (value as string) : "exact";
  const count = range?.ago ?? range?.from_now ?? 7;
  const unit = range?.unit ?? "day";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <SimpleSelect
        size="sm"
        className="w-40"
        aria-label={t("dateMode")}
        value={mode}
        options={[
          { value: "exact", label: t("exactDate") },
          ...RELATIVE_DAYS.map((day) => ({ value: day, label: t(`presets.${day}`) })),
          { value: "ago", label: t("ago") },
          { value: "from_now", label: t("fromNow") },
        ]}
        onChange={(next) => {
          if (next === "exact") onChange("");
          else if (next === "ago" || next === "from_now") onChange({ [next]: count, unit });
          else onChange(next);
        }}
      />
      {mode === "exact" ? (
        // A date without a time means that whole day in the admin's time zone.
        <FieldInput
          field={{ name: field.name, type: "date", config: {} }}
          value={typeof value === "string" ? value : ""}
          onChange={(next) => onChange(next ?? "")}
        />
      ) : null}
      {range ? <CountAndUnit count={count} unit={unit} onChange={(n, u) => onChange({ [mode]: n, unit: u })} /> : null}
    </div>
  );
}
