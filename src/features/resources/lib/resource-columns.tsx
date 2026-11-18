import type { ColumnVisibilityState } from "@tanstack/react-table";

import type { DataTableColumn, DataTableColumnMeta } from "@/components/data-table/table-features";

import { FieldValue } from "../components/field-value";
import type { FieldDefinition, ResourceContract, ResourceRecord } from "../types";

const RIGHT_ALIGNED: ReadonlySet<FieldDefinition["type"]> = new Set(["money", "number"]);

export function getField(contract: ResourceContract, key: string): FieldDefinition | undefined {
  return contract.fields.find((field) => field.key === key);
}

/** The contract's list columns, resolved to their field definitions, in column order. */
export function getListFields(contract: ResourceContract): FieldDefinition[] {
  return contract.list.columns
    .map((key) => getField(contract, key))
    .filter((field): field is FieldDefinition => field !== undefined);
}

/** Table columns for a resource, derived entirely from its contract. */
export function buildResourceColumns(contract: ResourceContract): DataTableColumn<ResourceRecord>[] {
  return getListFields(contract).map((field) => ({
    id: field.key,
    accessorFn: (row: ResourceRecord) => row[field.key],
    header: field.label,
    enableSorting: field.sortable ?? false,
    meta: {
      align: RIGHT_ALIGNED.has(field.type) ? "right" : "left",
    } satisfies DataTableColumnMeta,
    cell: ({ getValue }) => <FieldValue field={field} value={getValue()} variant="cell" />,
  }));
}

export function buildDefaultVisibility(contract: ResourceContract): ColumnVisibilityState {
  return Object.fromEntries((contract.list.hiddenByDefault ?? []).map((key) => [key, false]));
}
