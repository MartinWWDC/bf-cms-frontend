"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { type PickerOption, SearchPicker } from "@/components/search-picker";
import type { RecordId, Translated } from "@/lib/api/types";

import { getRecordTitle } from "@/features/resources/lib/contract";
import { useResourceContract, useResourceRecords, useStaff } from "@/features/resources/queries";
import { pickTranslation } from "./field-value";

interface PickerBaseProps {
  disabled?: boolean;
  invalid?: boolean;
  id?: string;
  size?: "sm" | "default";
  className?: string;
}

interface StaffPickerProps extends PickerBaseProps {
  value: number | "me" | null;
  /** Name of the current choice, when the caller knows it. */
  valueLabel?: string | null;
  onChange: (value: number | "me" | null, label: string | null) => void;
  /** Offer "Me" (the signed-in admin), as filters accept. */
  allowMe?: boolean;
  clearable?: boolean;
  placeholder?: string;
}

/** Picks a staff member from `GET /staff`. */
export function StaffPicker({
  value,
  valueLabel,
  onChange,
  allowMe = false,
  clearable = false,
  placeholder,
  ...rest
}: StaffPickerProps) {
  const t = useTranslations("resources.pickers");
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(false);
  const [pickedLabel, setPickedLabel] = useState<string | null>(null);
  const staff = useStaff(query, active);

  const options: PickerOption[] = (staff.data ?? []).map((member) => ({
    value: String(member.id),
    label: member.name ?? `#${member.id}`,
  }));
  const me: PickerOption = { value: "me", label: t("me") };
  const label = value === null ? null : value === "me" ? me.label : (valueLabel ?? pickedLabel ?? `#${value}`);

  return (
    <SearchPicker
      {...rest}
      selectedLabel={label}
      selectedValue={value === null ? null : String(value)}
      options={options}
      pinned={allowMe ? [me] : []}
      isLoading={staff.isFetching}
      placeholder={placeholder ?? t("staffPlaceholder")}
      searchPlaceholder={t("staffSearch")}
      onSearch={(next) => {
        setActive(true);
        setQuery(next);
      }}
      onSelect={(option) => {
        setPickedLabel(option.label);
        onChange(option.value === "me" ? "me" : Number(option.value), option.label);
      }}
      onClear={clearable ? () => onChange(null, null) : undefined}
    />
  );
}

interface RecordPickerProps extends PickerBaseProps {
  /** Resource the records come from (`config.resource` of a `relation_one` field). */
  resource: string;
  value: RecordId | null;
  valueLabel?: string | null;
  onChange: (value: RecordId | null, label: string | null) => void;
  clearable?: boolean;
  placeholder?: string;
}

/** Picks a record of a resource, searched with its list's free-text search. */
export function RecordPicker({
  resource,
  value,
  valueLabel,
  onChange,
  clearable = false,
  placeholder,
  ...rest
}: RecordPickerProps) {
  const t = useTranslations("resources.pickers");
  const locale = useLocale();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(false);
  const [pickedLabel, setPickedLabel] = useState<string | null>(null);
  const contract = useResourceContract(active ? resource : null);
  const titleField = contract.data?.title_field;
  const records = useResourceRecords(
    resource,
    { q: query, perPage: 20, fields: titleField && titleField !== "id" ? [titleField] : undefined },
    { enabled: active && contract.data !== undefined, keepPrevious: true },
  );

  const options: PickerOption[] = (records.data?.data ?? []).map((record) => {
    const raw = contract.data ? record[contract.data.title_field] : undefined;
    const title =
      typeof raw === "object" && raw !== null && !("id" in raw)
        ? pickTranslation(raw as Translated, locale)
        : contract.data
          ? getRecordTitle(contract.data, record)
          : null;
    return { value: String(record.id), label: title ?? `#${record.id}`, hint: `#${record.id}` };
  });
  const byValue = new Map((records.data?.data ?? []).map((record) => [String(record.id), record.id]));
  const label = value === null ? null : (valueLabel ?? pickedLabel ?? `#${value}`);

  return (
    <SearchPicker
      {...rest}
      selectedLabel={label}
      selectedValue={value === null ? null : String(value)}
      options={options}
      isLoading={records.isFetching || contract.isPending}
      placeholder={placeholder ?? t("recordPlaceholder")}
      searchPlaceholder={t("recordSearch")}
      onSearch={(next) => {
        setActive(true);
        setQuery(next);
      }}
      onSelect={(option) => {
        setPickedLabel(option.label);
        // Ids go back to the API exactly as it sent them: number or text.
        onChange(byValue.get(option.value) ?? option.value, option.label);
      }}
      onClear={clearable ? () => onChange(null, null) : undefined}
    />
  );
}
