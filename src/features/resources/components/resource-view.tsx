"use client";

import { useMemo, useState } from "react";
import type { ColumnVisibilityState, OnChangeFn, SortingState } from "@tanstack/react-table";
import { useTranslations } from "next-intl";

import { DataTable } from "@/components/data-table/data-table";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useFormat } from "@/i18n/use-format";
import { getApiErrorMessage } from "@/lib/api/client";

import { useResourceContract, useResourceRecords } from "../queries";
import { buildDefaultVisibility, buildResourceColumns, getListFields } from "../lib/resource-columns";
import type { ListParams, ResourceContract, ResourceRecord } from "../types";
import { PAGE_SIZES, useListState } from "../hooks/use-list-state";
import { RecordDrawer } from "./record-drawer";
import { ResourceToolbar } from "./resource-toolbar";

// Stable fallback: a fresh `[]` on every render would reset the table's row model.
const NO_ROWS: ResourceRecord[] = [];

const getRecordId = (record: ResourceRecord) => record.id;

interface ResourceViewProps {
  /** Resource key, e.g. `orders`. */
  resource: string;
}

/**
 * The generic screen for any resource: header, toolbar, table, paging and the detail
 * drawer. It loads the resource's contract and renders everything from it, so a new
 * resource needs no new screen code.
 *
 * Must be rendered inside a `<Suspense>` boundary, because the list state lives in the URL.
 */
export function ResourceView({ resource }: ResourceViewProps) {
  const contract = useResourceContract(resource);
  const t = useTranslations("resources");

  if (contract.isPending) return <ResourceViewSkeleton />;
  if (contract.isError) {
    return (
      <ErrorState
        title={t("loadFailed")}
        message={getApiErrorMessage(contract.error)}
        onRetry={() => contract.refetch()}
      />
    );
  }
  return <ResourceList contract={contract.data} />;
}

function ResourceList({ contract }: { contract: ResourceContract }) {
  const t = useTranslations("resources");
  const format = useFormat();
  const [listState, setListState] = useListState(contract.list.defaultSort);
  const { page, pageSize, sort, search, tab, recordId } = listState;

  const params = useMemo<ListParams>(
    () => ({ page, pageSize, sort, search, tab }),
    [page, pageSize, sort, search, tab],
  );
  const records = useResourceRecords(contract.key, params);
  const rows = records.data?.rows ?? NO_ROWS;
  const total = records.data?.total ?? 0;

  const columns = useMemo(() => buildResourceColumns(contract), [contract]);
  const listFields = useMemo(() => getListFields(contract), [contract]);
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibilityState>(() =>
    buildDefaultVisibility(contract),
  );

  const sorting = useMemo<SortingState>(
    () => [{ id: sort.field, desc: sort.direction === "desc" }],
    [sort],
  );
  const handleSortingChange: OnChangeFn<SortingState> = (updater) => {
    const next = typeof updater === "function" ? updater(sorting) : updater;
    const first = next[0];
    if (!first) return;
    setListState({ sort: { field: first.id, direction: first.desc ? "desc" : "asc" }, page: 1 });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex shrink-0 items-end justify-between gap-6 px-4 pt-5 pb-3 sm:px-6 sm:pt-7">
        <div className="min-w-0">
          <h1 className="font-heading text-3xl leading-none font-semibold tracking-tight sm:text-4xl">
            {contract.label}
          </h1>
          {contract.description ? (
            <p className="mt-2 text-sm text-muted-foreground">{contract.description}</p>
          ) : null}
        </div>
        <p className="shrink-0 text-right font-mono text-xs tracking-wider text-muted-foreground uppercase">
          <span className="block font-heading text-2xl leading-none font-semibold tracking-tight text-foreground normal-case tabular-nums">
            {records.isPending ? "–" : format.number(total)}
          </span>
          {t("recordCount", { count: total })}
        </p>
      </header>

      <ResourceToolbar
        tabs={contract.list.tabs ?? []}
        activeTab={tab}
        onTabChange={(next) => setListState({ tab: next, page: 1 })}
        search={search}
        onSearchChange={(next) => setListState({ search: next, page: 1 })}
        searchPlaceholder={contract.list.searchPlaceholder}
        columns={listFields}
        columnVisibility={columnVisibility}
        onColumnVisibilityChange={setColumnVisibility}
        onRefresh={() => records.refetch()}
        isRefreshing={records.isFetching}
      />

      {records.isError ? (
        <ErrorState
          title={t("recordsLoadFailed")}
          message={getApiErrorMessage(records.error)}
          onRetry={() => records.refetch()}
        />
      ) : (
        <DataTable
          columns={columns}
          data={rows}
          getRowId={getRecordId}
          sorting={sorting}
          onSortingChange={handleSortingChange}
          columnVisibility={columnVisibility}
          onColumnVisibilityChange={setColumnVisibility}
          onRowClick={(record) => setListState({ recordId: record.id })}
          activeRowId={recordId}
          isLoading={records.isPending}
          isFetching={records.isPlaceholderData}
          skeletonRows={Math.min(pageSize, 14)}
          className="min-h-80"
          emptyState={
            <div>
              <p className="text-sm font-medium">{t("emptyTitle")}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t("emptyHint")}</p>
            </div>
          }
        />
      )}

      <DataTablePagination
        page={page}
        pageSize={pageSize}
        total={total}
        pageSizes={PAGE_SIZES}
        onPageChange={(next) => setListState({ page: next })}
        onPageSizeChange={(next) => setListState({ pageSize: next, page: 1 })}
        disabled={records.isPending}
      />

      <RecordDrawer
        contract={contract}
        recordId={recordId}
        listRecord={rows.find((row) => row.id === recordId)}
        onClose={() => setListState({ recordId: null })}
      />
    </div>
  );
}

export function ResourceViewSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col" aria-busy>
      <div className="flex flex-col gap-3 px-4 pt-5 pb-4 sm:px-6 sm:pt-7">
        <Skeleton className="h-9 w-44" />
        <Skeleton className="h-4 w-80 max-w-full" />
        <Skeleton className="mt-2 h-8 w-full sm:max-w-sm" />
      </div>
      <div className="flex flex-1 flex-col gap-3 border-t px-4 py-4 sm:px-6">
        {Array.from({ length: 10 }, (_, index) => (
          <Skeleton key={index} className="h-6" />
        ))}
      </div>
    </div>
  );
}

function ErrorState({ title, message, onRetry }: { title: string; message: string; onRetry: () => void }) {
  const t = useTranslations("common");

  return (
    <div className="flex min-h-64 flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
      <p className="font-medium">{title}</p>
      <p className="max-w-md text-sm text-muted-foreground">{message}</p>
      <Button variant="outline" className="mt-2" onClick={onRetry}>
        {t("tryAgain")}
      </Button>
    </div>
  );
}
