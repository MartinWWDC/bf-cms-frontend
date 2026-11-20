import type { ReactNode } from "react";

import type { DataTableColumn, DataTableColumnMeta } from "@/components/data-table/table-features";
import type { RecordId } from "@/lib/api/types";

import { FieldValue } from "@/components/resource/field-value";
import type { Field, ResourceRecord } from "../types";
import { getValue } from "./contract";

const RIGHT_ALIGNED: ReadonlySet<Field["type"]> = new Set(["money", "number"]);

export const SELECT_COLUMN_ID = "__select";

interface ColumnOptions {
  /** Opens a linked record shown in a cell. */
  onOpenRecord?: (resource: string, id: RecordId) => void;
  /** Replaces the cell of a field that can be edited in place; `null` keeps the plain value. */
  inlineCell?: (field: Field, record: ResourceRecord, value: unknown) => ReactNode | null;
  /** Leading checkbox column, for actions on many records. */
  selection?: {
    header: () => ReactNode;
    cell: (record: ResourceRecord) => ReactNode;
  };
}

/** Table columns for a list of fields, derived entirely from the contract. */
export function buildResourceColumns(fields: Field[], options: ColumnOptions = {}): DataTableColumn<ResourceRecord>[] {
  const columns: DataTableColumn<ResourceRecord>[] = fields.map((field) => ({
    id: field.name,
    accessorFn: (row: ResourceRecord) => getValue(row, field.name),
    header: field.label,
    enableSorting: field.sortable,
    meta: {
      align: RIGHT_ALIGNED.has(field.type) ? "right" : "left",
    } satisfies DataTableColumnMeta,
    cell: ({ getValue: cellValue, row }) =>
      options.inlineCell?.(field, row.original, cellValue()) ?? (
        <FieldValue field={field} value={cellValue()} variant="cell" onOpenRecord={options.onOpenRecord} />
      ),
  }));

  if (!options.selection) return columns;
  const { header, cell } = options.selection;
  return [
    {
      id: SELECT_COLUMN_ID,
      header: () => header(),
      enableSorting: false,
      meta: { className: "w-0 pr-0!" } satisfies DataTableColumnMeta,
      cell: ({ row }) => cell(row.original),
    },
    ...columns,
  ];
}
