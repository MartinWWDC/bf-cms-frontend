import {
  type ColumnDef,
  columnVisibilityFeature,
  type RowData,
  rowSortingFeature,
  tableFeatures,
} from "@tanstack/react-table";

/**
 * The TanStack Table features every data table in the app uses. Defined once, at module
 * scope, because the table needs a stable reference.
 *
 * Sorting is registered without a sorted row model on purpose: the server sorts, the
 * table only owns the sort state. Paging is fully server-side and lives outside the table.
 */
export const dataTableFeatures = tableFeatures({
  rowSortingFeature,
  columnVisibilityFeature,
});

export type DataTableFeatures = typeof dataTableFeatures;

export type DataTableColumn<TData extends RowData> = ColumnDef<DataTableFeatures, TData>;

/** Per-column presentation hints, read by `DataTable` from `columnDef.meta`. */
export interface DataTableColumnMeta {
  align?: "left" | "right";
  /** Tailwind classes applied to both the header and body cells of the column. */
  className?: string;
}
