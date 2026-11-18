"use client";

import type { ReactNode } from "react";
import {
  type ColumnVisibilityState,
  type OnChangeFn,
  type RowData,
  type SortingState,
  useTable,
} from "@tanstack/react-table";
import { ArrowDownIcon, ArrowUpIcon, ChevronsUpDownIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "cn";

import { Skeleton } from "@/components/ui/skeleton";

import {
  type DataTableColumn,
  type DataTableColumnMeta,
  dataTableFeatures,
} from "./table-features";

interface DataTableProps<TData extends RowData> {
  columns: DataTableColumn<TData>[];
  /** One page of rows, already filtered, sorted and paged by the server. */
  data: TData[];
  getRowId: (row: TData) => string;
  sorting: SortingState;
  onSortingChange: OnChangeFn<SortingState>;
  columnVisibility: ColumnVisibilityState;
  onColumnVisibilityChange: OnChangeFn<ColumnVisibilityState>;
  onRowClick?: (row: TData) => void;
  /** Row shown as selected, e.g. the one open in the detail drawer. */
  activeRowId?: string | null;
  /** First load: no rows to show yet. */
  isLoading?: boolean;
  /** Background refresh: keep the rows, dim them. */
  isFetching?: boolean;
  /** Rows of skeleton shown while loading. */
  skeletonRows?: number;
  emptyState?: ReactNode;
  className?: string;
}

const headCellClass =
  "sticky top-0 z-10 h-9 border-b bg-muted/95 px-3 text-left align-middle font-mono text-[0.6875rem] font-medium tracking-wider whitespace-nowrap text-muted-foreground uppercase backdrop-blur first:pl-4 last:pr-4";

const bodyCellClass = "h-11 px-3 align-middle whitespace-nowrap first:pl-4 last:pr-4";

function columnMeta(meta: unknown): DataTableColumnMeta {
  return (meta as DataTableColumnMeta | undefined) ?? {};
}

/**
 * Generic, presentation-only data table on TanStack Table v9.
 *
 * It renders exactly the rows it is given. Filtering, sorting and paging happen on the
 * server; the table reports sort changes and row clicks to its parent. It knows nothing
 * about resources or the API, so any feature can reuse it.
 */
export function DataTable<TData extends RowData>({
  columns,
  data,
  getRowId,
  sorting,
  onSortingChange,
  columnVisibility,
  onColumnVisibilityChange,
  onRowClick,
  activeRowId,
  isLoading = false,
  isFetching = false,
  skeletonRows = 12,
  emptyState,
  className,
}: DataTableProps<TData>) {
  const t = useTranslations("table");
  const table = useTable({
    features: dataTableFeatures,
    columns,
    data,
    getRowId,
    state: { sorting, columnVisibility },
    onSortingChange,
    onColumnVisibilityChange,
    manualSorting: true,
    enableSortingRemoval: false,
  });

  const headerGroups = table.getHeaderGroups();
  const rows = table.getRowModel().rows;
  const visibleColumnCount = table.getVisibleLeafColumns().length;

  return (
    <div
      className={cn("scrollbar-slim relative min-h-0 flex-1 overflow-auto", className)}
      aria-busy={isLoading || isFetching}
    >
      <table className="w-full border-separate border-spacing-0 text-sm">
        <thead>
          {headerGroups.map((group) => (
            <tr key={group.id}>
              {group.headers.map((header) => {
                const meta = columnMeta(header.column.columnDef.meta);
                const sorted = header.column.getIsSorted();
                const canSort = header.column.getCanSort();
                const label = header.isPlaceholder ? null : <table.FlexRender header={header} />;

                return (
                  <th
                    key={header.id}
                    scope="col"
                    aria-sort={sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : undefined}
                    className={cn(headCellClass, meta.align === "right" && "text-right", meta.className)}
                  >
                    {canSort ? (
                      <button
                        type="button"
                        onClick={header.column.getToggleSortingHandler()}
                        className={cn(
                          "-mx-1.5 inline-flex h-7 items-center gap-1 rounded-sm px-1.5 tracking-wider uppercase outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
                          meta.align === "right" && "flex-row-reverse",
                          sorted && "text-foreground",
                        )}
                      >
                        {label}
                        {sorted === "asc" ? (
                          <ArrowUpIcon className="size-3 text-brand" />
                        ) : sorted === "desc" ? (
                          <ArrowDownIcon className="size-3 text-brand" />
                        ) : (
                          <ChevronsUpDownIcon className="size-3 opacity-40" />
                        )}
                      </button>
                    ) : (
                      label
                    )}
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>

        <tbody className={cn("transition-opacity", isFetching && !isLoading && "opacity-60")}>
          {isLoading
            ? Array.from({ length: skeletonRows }, (_, rowIndex) => (
                <tr key={rowIndex}>
                  {Array.from({ length: visibleColumnCount }, (_, cellIndex) => (
                    <td key={cellIndex} className={cn(bodyCellClass, "border-b border-border/60")}>
                      <Skeleton className="h-4" style={{ width: `${45 + ((rowIndex + cellIndex * 3) % 5) * 11}%` }} />
                    </td>
                  ))}
                </tr>
              ))
            : rows.map((row) => {
                const isActive = row.id === activeRowId;
                return (
                  <tr
                    key={row.id}
                    data-active={isActive || undefined}
                    tabIndex={onRowClick ? 0 : undefined}
                    onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                    onKeyDown={
                      onRowClick
                        ? (event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              onRowClick(row.original);
                            }
                          }
                        : undefined
                    }
                    className={cn(
                      "group/row outline-none",
                      onRowClick && "cursor-pointer",
                      "hover:bg-accent/60 focus-visible:bg-accent/60 data-active:bg-accent",
                    )}
                  >
                    {row.getVisibleCells().map((cell, cellIndex) => {
                      const meta = columnMeta(cell.column.columnDef.meta);
                      return (
                        <td
                          key={cell.id}
                          className={cn(
                            bodyCellClass,
                            "border-b border-border/60",
                            meta.align === "right" && "text-right",
                            // Coral marker on the leading edge of the active / focused row.
                            cellIndex === 0 &&
                              "shadow-[inset_2px_0_0_transparent] group-focus-visible/row:shadow-[inset_2px_0_0_var(--brand)] group-data-active/row:shadow-[inset_2px_0_0_var(--brand)]",
                            meta.className,
                          )}
                        >
                          <table.FlexRender cell={cell} />
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
        </tbody>
      </table>

      {!isLoading && rows.length === 0 ? (
        <div className="flex min-h-56 items-center justify-center px-6 py-12 text-center">
          {emptyState ?? <p className="text-sm text-muted-foreground">{t("empty")}</p>}
        </div>
      ) : null}
    </div>
  );
}
