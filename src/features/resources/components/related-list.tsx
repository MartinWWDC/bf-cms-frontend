"use client";

import { useMemo, useState } from "react";
import type { ColumnVisibilityState, SortingState } from "@tanstack/react-table";
import { useTranslations } from "next-intl";

import { DataTable } from "@/components/data-table/data-table";
import { ErrorState } from "@/components/error-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useFormat } from "@/i18n/use-format";
import type { RecordId } from "@/lib/api/types";

import { findTab, findView, parseSort, resolveFields, serializeSort } from "../lib/contract";
import { buildResourceColumns } from "../lib/resource-columns";
import { useRelatedRecords, useResourceContract } from "../queries";
import type { Relation, ResourceRecord } from "../types";

const NO_ROWS: ResourceRecord[] = [];
const NO_VISIBILITY: ColumnVisibilityState = {};
const PER_PAGE = 10;
const getRecordId = (record: ResourceRecord) => String(record.id);

interface RelatedListProps {
  resource: string;
  recordId: RecordId;
  relation: Relation;
  /** Number of related records, when the relation is counted. */
  count: number | null;
  onOpenRecord: (resource: string, id: RecordId) => void;
}

/**
 * One related list of a record (`GET .../relations/{relation}`). Its columns come from the
 * contract of the related resource. Rows open their own record; they are edited there.
 */
export function RelatedList({ resource, recordId, relation, count, onOpenRecord }: RelatedListProps) {
  const t = useTranslations("resources.related");
  const tTable = useTranslations("table");
  const format = useFormat();
  const contract = useResourceContract(relation.resource);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<string | null>(null);

  const tab = contract.data ? findTab(findView(contract.data, null), null) : undefined;
  const effectiveSort = sort ?? tab?.default_sort ?? contract.data?.default_sort ?? null;
  const records = useRelatedRecords(
    resource,
    recordId,
    relation.name,
    { page, perPage: PER_PAGE, sort: sort ?? undefined },
    contract.data !== undefined,
  );

  const columns = useMemo(
    () => (contract.data && tab ? buildResourceColumns(resolveFields(contract.data, tab.columns), { onOpenRecord }) : []),
    [contract.data, tab, onOpenRecord],
  );
  const sorting = useMemo<SortingState>(() => {
    const parsed = parseSort(effectiveSort);
    return parsed ? [{ id: parsed.field, desc: parsed.desc }] : [];
  }, [effectiveSort]);

  const meta = records.data?.meta;
  const total = meta?.total ?? count;

  return (
    <section aria-label={relation.label} className="overflow-hidden rounded-lg border">
      <header className="flex items-center justify-between gap-3 border-b bg-muted/50 px-4 py-2">
        <h3 className="text-sm font-medium">{relation.label}</h3>
        {total !== null && total !== undefined ? (
          <span className="font-mono text-xs text-muted-foreground tabular-nums">
            {meta?.total_capped ? tTable("totalCapped", { total: format.number(total) }) : format.number(total)}
          </span>
        ) : null}
      </header>

      {contract.isError || records.isError ? (
        <ErrorState
          title={t("loadFailed")}
          error={contract.error ?? records.error}
          onRetry={() => (contract.isError ? contract.refetch() : records.refetch())}
          className="min-h-32"
        />
      ) : contract.isPending ? (
        <div className="flex flex-col gap-2 p-4">
          <Skeleton className="h-5" />
          <Skeleton className="h-5" />
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={records.data?.data ?? NO_ROWS}
          getRowId={getRecordId}
          sorting={sorting}
          onSortingChange={(updater) => {
            const next = typeof updater === "function" ? updater(sorting) : updater;
            if (next[0]) {
              setSort(serializeSort(next[0].id, next[0].desc));
              setPage(1);
            }
          }}
          columnVisibility={NO_VISIBILITY}
          onColumnVisibilityChange={() => {}}
          onRowClick={(row) => onOpenRecord(relation.resource, row.id)}
          isLoading={records.isPending}
          isFetching={records.isPlaceholderData}
          skeletonRows={3}
          className="max-h-96 flex-none"
          emptyState={<p className="text-sm text-muted-foreground">{t("empty")}</p>}
        />
      )}

      {meta && (meta.has_more || page > 1) ? (
        <footer className="flex items-center justify-end gap-2 border-t bg-card px-3 py-1.5">
          <span className="mr-auto font-mono text-xs text-muted-foreground">{t("page", { page })}</span>
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            {tTable("previousPage")}
          </Button>
          <Button variant="outline" size="sm" disabled={!meta.has_more} onClick={() => setPage(page + 1)}>
            {tTable("nextPage")}
          </Button>
        </footer>
      ) : null}
    </section>
  );
}
