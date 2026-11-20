"use client";

import { useEffect, useMemo, useState } from "react";
import type { ColumnVisibilityState, OnChangeFn, SortingState } from "@tanstack/react-table";
import {
  Columns3Icon,
  DownloadIcon,
  EllipsisIcon,
  FilterIcon,
  GroupIcon,
  PlusIcon,
  RotateCwIcon,
  SigmaIcon,
  UsersIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { cn } from "cn";

import { DataTable } from "@/components/data-table/data-table";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { ErrorState } from "@/components/error-state";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { trackJob } from "@/features/jobs/hooks";
import { useFormat } from "@/i18n/use-format";
import { useErrorToast } from "@/lib/api/use-error-message";
import { isReference, type RecordId } from "@/lib/api/types";

import { NO_SAVED_VIEW, PAGE_SIZES, useListState } from "../hooks/use-list-state";
import {
  findTab,
  findView,
  getAction,
  getColumnChoices,
  getField,
  getValue,
  parseSort,
  resolveFields,
  serializeSort,
} from "../lib/contract";
import {
  combineFilters,
  countConditions,
  hasCondition,
  mineFilter,
  toggleCondition,
  unassignedFilter,
} from "../lib/filters";
import { buildResourceColumns, SELECT_COLUMN_ID } from "../lib/resource-columns";
import { useAssignRecords, useExportRecords } from "../mutations";
import { useAssignmentSummary, useResourceContract, useResourceRecords, useSavedViews, useTabCounts } from "../queries";
import type {
  Action,
  BulkTarget,
  Contract,
  ExportFormat,
  Field,
  InlineField,
  ListAggregate,
  ListParams,
  ResourceRecord,
  SavedViewInput,
  ViewTab,
} from "../types";
import { ActionDialog, type ActionRun } from "@/components/resource/action-dialog";
import { FieldValue } from "@/components/resource/field-value";
import { FilterBuilder } from "./filter-builder";
import { InlineFieldControl } from "./inline-field";
import { StaffPicker } from "@/components/resource/pickers";
import { NEW_RECORD, RecordDrawer, type ScreenRegistry } from "./record-drawer";
import { SavedViewsMenu } from "./saved-views-menu";
import { SearchField } from "./search-field";

// Stable fallbacks: a fresh `[]` or `{}` on every render would reset the table.
const NO_ROWS: ResourceRecord[] = [];
const NO_VISIBILITY: ColumnVisibilityState = {};
const NO_TABS: ViewTab[] = [];
const NO_INLINE: InlineField[] = [];
const getRecordId = (record: ResourceRecord) => String(record.id);

interface ResourceViewProps {
  /** Resource key, e.g. `checkouts`. */
  resource: string;
  /** Built-in view from the URL; the resource's first view when omitted. */
  view?: string | null;
  /** Custom-built screens by resource key, shown in the drawer where a resource has one. */
  screens?: ScreenRegistry;
}

/**
 * The generic screen for any resource: header, toolbar, table, paging and the detail
 * drawer. It loads the resource's contract and renders everything from it, so a new
 * resource needs no new screen code.
 *
 * Must be rendered inside a `<Suspense>` boundary, because the list state lives in the URL.
 */
export function ResourceView({ resource, view, screens }: ResourceViewProps) {
  const contract = useResourceContract(resource);
  const t = useTranslations("resources");

  if (contract.isPending) return <ResourceViewSkeleton />;
  if (contract.isError) {
    return <ErrorState title={t("loadFailed")} error={contract.error} onRetry={() => contract.refetch()} />;
  }
  // Remount per resource and view so no list state of another one survives.
  return <ResourceList key={`${resource}/${view ?? ""}`} contract={contract.data} viewKey={view ?? null} screens={screens} />;
}

interface ResourceListProps {
  contract: Contract;
  viewKey: string | null;
  screens?: ScreenRegistry;
}

function ResourceList({ contract, viewKey, screens }: ResourceListProps) {
  const t = useTranslations("resources");
  const tTable = useTranslations("table");
  const format = useFormat();
  const toastError = useErrorToast();
  const [state, setState] = useListState();

  /* ---------- Saved view ---------- */

  const savedViews = useSavedViews(contract.key);
  const wantsSaved = state.savedView !== null && state.savedView !== NO_SAVED_VIEW;
  const activeSaved = wantsSaved ? (savedViews.data?.find((view) => view.id === state.savedView) ?? null) : null;
  const savedMissing = wantsSaved && savedViews.isSuccess && activeSaved === null;
  const defaultSaved = savedViews.data?.find((view) => view.is_default);
  const hasOwnState =
    state.tab !== null || state.filter !== null || state.search !== "" || state.sort !== null || state.groupBy !== null;

  useEffect(() => {
    // The saved view was deleted, or the link is someone else's: fall back to the plain list.
    if (savedMissing) setState({ savedView: NO_SAVED_VIEW });
    // A resource opened without a view of its own starts on the admin's default saved view.
    else if (state.savedView === null && defaultSaved && !hasOwnState) setState({ savedView: defaultSaved.id });
  }, [savedMissing, state.savedView, defaultSaved, hasOwnState, setState]);

  /* ---------- What the list shows ---------- */

  const view = findView(contract, activeSaved?.view ?? viewKey);
  const tab = findTab(view, activeSaved ? activeSaved.tab : state.tab);
  const tabColumns = tab?.columns ?? [];
  const columnNames = state.columns ?? (activeSaved?.columns.length ? activeSaved.columns : tabColumns);
  const sort = state.sort ?? activeSaved?.sort ?? tab?.default_sort ?? contract.default_sort;
  const groupBy = state.groupBy ?? activeSaved?.group_by ?? null;
  const groupField = groupBy ? getField(contract, groupBy.replace(/^-/, "")) : undefined;
  const assigneeField = contract.collaboration.assignment.enabled ? contract.collaboration.assignment.field : null;

  const params = useMemo<ListParams>(
    () => ({
      view: view?.key,
      tab: tab?.key,
      savedView: activeSaved?.id,
      q: state.search || undefined,
      // Only what the admin chose: the tab's or saved view's own sort and columns apply otherwise.
      sort: state.sort ?? undefined,
      fields: state.columns ?? undefined,
      filter: state.filter,
      trashed: state.trashed,
      groupBy: state.groupBy,
      aggregates: state.aggregates.length ? state.aggregates : undefined,
      page: state.page,
      perPage: state.pageSize,
    }),
    [view?.key, tab?.key, activeSaved?.id, state],
  );
  const records = useResourceRecords(contract.key, params, { enabled: !wantsSaved || savedViews.isSuccess });
  const tabCounts = useTabCounts(contract.key, view?.key, view?.tabs ?? NO_TABS);
  const rows = records.data?.data ?? NO_ROWS;
  const meta = records.data?.meta;
  const total = meta?.total ?? 0;

  /* ---------- Selection ---------- */

  const tabActionKeys = useMemo(() => tab?.actions ?? [], [tab]);
  const bulkActions = useMemo(() => {
    const many = contract.actions.filter((action) => action.scope === "many" || action.scope === "both");
    // The tab's own actions first, in its order.
    return [...many].sort((a, b) => {
      const ai = tabActionKeys.indexOf(a.key);
      const bi = tabActionKeys.indexOf(b.key);
      return (ai === -1 ? Infinity : ai) - (bi === -1 ? Infinity : bi);
    });
  }, [contract.actions, tabActionKeys]);
  const standaloneActions = contract.actions.filter((action) => action.scope === "standalone");
  const canBulkAssign = contract.collaboration.assignment.enabled && contract.collaboration.assignment.can_assign_others;
  const selectable = bulkActions.length > 0 || canBulkAssign;

  const listKey = JSON.stringify({ ...params, page: undefined });
  const [selection, setSelection] = useState<{ key: string; ids: Set<string>; allMatching: boolean }>({
    key: listKey,
    ids: new Set(),
    allMatching: false,
  });
  // Another filter, tab or search is another list: its selection starts empty.
  if (selection.key !== listKey) setSelection({ key: listKey, ids: new Set(), allMatching: false });
  const selectedIds = selection.ids;
  const pageIds = rows.map(getRecordId);
  const allOnPage = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));

  const togglePage = (checked: boolean) =>
    setSelection((current) => {
      const ids = new Set(current.ids);
      for (const id of pageIds) {
        if (checked) ids.add(id);
        else ids.delete(id);
      }
      return { ...current, ids, allMatching: false };
    });
  const toggleRow = (id: string, checked: boolean) =>
    setSelection((current) => {
      const ids = new Set(current.ids);
      if (checked) ids.add(id);
      else ids.delete(id);
      return { ...current, ids, allMatching: false };
    });
  const clearSelection = () => setSelection({ key: listKey, ids: new Set(), allMatching: false });

  /** The records a bulk action runs on. Ids go back as the API sent them. */
  const bulkTarget = (): { target: BulkTarget; count: number | null } => {
    if (selection.allMatching) {
      return {
        target: {
          selection: {
            view: view?.key,
            tab: tab?.key,
            q: state.search || undefined,
            filter: combineFilters(activeSaved?.filter, state.filter),
          },
        },
        count: meta?.total_capped ? null : total,
      };
    }
    const byId = new Map(rows.map((row) => [String(row.id), row.id]));
    const ids = [...selectedIds].map((id) => byId.get(id) ?? id);
    return { target: { ids }, count: ids.length };
  };

  /* ---------- Table ---------- */

  const openRecord = useMemo(
    () => (resource: string, id: RecordId) =>
      setState({
        record:
          resource === contract.key
            ? // A record of this list opens with the detail screen of the view it was opened from.
              { resource: null, id: String(id), view: view?.key ?? null }
            : { resource, id: String(id) },
      }),
    [contract.key, view?.key, setState],
  );

  /* ---------- Inline fields ---------- */

  const [run, setRun] = useState<ActionRun | null>(null);
  // An API that does not send them yet has none.
  const inlineFields = useMemo(() => tab?.inline ?? NO_INLINE, [tab]);
  const runInlineAction = useMemo(
    () => (action: Action, id: RecordId, initialInput: Record<string, unknown>) =>
      setRun({
        resource: contract.key,
        resourceLabel: contract.label,
        action,
        target: { kind: "record", id },
        initialInput,
      }),
    [contract.key, contract.label, setRun],
  );
  const inlineCell = useMemo(() => {
    if (inlineFields.length === 0) return undefined;
    const byField = new Map(inlineFields.map((entry) => [entry.field, entry]));
    return function InlineCell(field: Field, record: ResourceRecord, value: unknown) {
      const entry = byField.get(field.name);
      return entry ? (
        <InlineFieldControl
          contract={contract}
          entry={entry}
          field={field}
          recordId={record.id}
          value={value}
          variant="cell"
          onOpenRecord={openRecord}
          onRunAction={runInlineAction}
        />
      ) : null;
    };
  }, [inlineFields, contract, openRecord, runInlineAction]);

  const columns = useMemo(() => {
    const fields = resolveFields(contract, columnNames);
    return buildResourceColumns(fields, { onOpenRecord: openRecord, inlineCell });
  }, [contract, columnNames, openRecord, inlineCell]);

  const tableColumns = useMemo(() => {
    if (!selectable) return columns;
    return buildResourceColumns(resolveFields(contract, columnNames), {
      onOpenRecord: openRecord,
      inlineCell,
      selection: {
        header: () => (
          <Checkbox
            checked={allOnPage}
            aria-label={t("selection.selectPage")}
            onClick={(event) => event.stopPropagation()}
            onCheckedChange={(checked) => togglePage(checked === true)}
          />
        ),
        cell: (record) => (
          <Checkbox
            checked={selection.allMatching || selectedIds.has(String(record.id))}
            aria-label={t("selection.selectRow", { id: String(record.id) })}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
            onCheckedChange={(checked) => toggleRow(String(record.id), checked === true)}
          />
        ),
      },
    });
    // The checkbox cells read the selection through closures, so they follow it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectable, columns, contract, columnNames, openRecord, inlineCell, allOnPage, selection, t]);

  const sorting = useMemo<SortingState>(() => {
    const parsed = parseSort(sort);
    return parsed ? [{ id: parsed.field, desc: parsed.desc }] : [];
  }, [sort]);
  const handleSortingChange: OnChangeFn<SortingState> = (updater) => {
    const next = typeof updater === "function" ? updater(sorting) : updater;
    if (next[0] && next[0].id !== SELECT_COLUMN_ID) {
      setState({ sort: serializeSort(next[0].id, next[0].desc), page: 1 });
    }
  };

  const groupLabels = useMemo(
    () => new Map((meta?.groups ?? []).map((group) => [String(group.value), group])),
    [meta?.groups],
  );
  const grouping =
    groupField && state.groupBy
      ? {
          getGroupKey: (row: ResourceRecord) => {
            const value = getValue(row, groupField.name);
            return String(isReference(value) ? value.id : ((value as { id?: unknown } | null)?.id ?? value ?? null));
          },
          renderGroup: (key: string, row: ResourceRecord) => {
            const group = groupLabels.get(key);
            return (
              <span className="flex items-center gap-2">
                <span className="text-muted-foreground">{groupField.label}</span>
                {group?.label ?? <FieldValue field={groupField} value={getValue(row, groupField.name)} />}
                {group ? (
                  <span className="font-mono text-[0.6875rem] text-muted-foreground tabular-nums">
                    {format.number(group.count)}
                  </span>
                ) : null}
              </span>
            );
          },
        }
      : undefined;

  /* ---------- Toolbar state ---------- */

  const [filterOpen, setFilterOpen] = useState(false);
  const exportRecords = useExportRecords(contract.key);
  const assignRecords = useAssignRecords(contract.key);
  const filterCount = countConditions(state.filter);
  const savedFilterCount = countConditions(activeSaved?.filter);
  const columnChoices = useMemo(() => getColumnChoices(contract), [contract]);
  const groupChoices = contract.fields.filter((field) => field.groupable);
  const aggregateChoices = useMemo(
    () => [
      { key: "count", label: t("aggregates.count") },
      ...contract.fields.flatMap((field) =>
        field.aggregates.map((fn) => ({ key: `${fn}:${field.name}`, label: t(fn === "count" ? "aggregates.countOf" : `aggregates.${fn}`, { field: field.label }) })),
      ),
    ],
    [contract.fields, t],
  );

  const current: SavedViewInput = {
    view: view?.key ?? null,
    tab: tab?.key ?? null,
    filter: combineFilters(activeSaved?.filter, state.filter),
    sort,
    columns: columnNames,
    group_by: groupBy,
  };
  const isDirty =
    activeSaved !== null &&
    (state.filter !== null || state.sort !== null || state.columns !== null || state.groupBy !== null);

  const startAction = (action: Action, target: ActionRun["target"]) =>
    setRun({
      resource: contract.key,
      resourceLabel: contract.label,
      action,
      target,
      onDone: target.kind === "bulk" ? clearSelection : undefined,
    });

  const exportList = (exportFormat: ExportFormat) =>
    exportRecords.mutate(
      { format: exportFormat, params: { ...params, fields: columnNames, sort } },
      {
        onSuccess: (job) => {
          trackJob({ id: job.job_id, label: t("export.jobLabel", { resource: contract.label }) });
          toast.success(t("export.queued"));
        },
        onError: toastError,
      },
    );

  const assignSelected = (adminId: number | null) => {
    const { target } = bulkTarget();
    assignRecords.mutate(
      { adminId, target },
      {
        onSuccess: (job) => {
          trackJob({ id: job.job_id, label: t("selection.assignJobLabel", { resource: contract.label }) });
          toast.success(t("actions.queued"));
          clearSelection();
        },
        onError: toastError,
      },
    );
  };

  const totalText = meta?.total_capped ? tTable("totalCapped", { total: format.number(total) }) : format.number(total);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        title={contract.label}
        description={view && contract.views.length > 1 ? view.label : undefined}
      >
        <p className="text-right font-mono text-xs tracking-wider text-muted-foreground uppercase">
          <span className="block font-heading text-2xl leading-none font-semibold tracking-tight text-foreground normal-case tabular-nums">
            {records.isPending ? "–" : totalText}
          </span>
          {t("recordCount", { count: total })}
        </p>
        {contract.abilities.create ? (
          <Button onClick={() => setState({ record: { resource: null, id: NEW_RECORD } })}>
            <PlusIcon />
            {t("create", { type: contract.label_singular })}
          </Button>
        ) : null}
      </PageHeader>

      <div
        className={cn(
          "flex shrink-0 flex-col gap-3 border-b px-4 pt-2 sm:px-6",
          // The tab row closes the toolbar when there is one; otherwise the controls need air above the table.
          view && view.tabs.length > 1 ? null : "pb-3",
        )}
      >
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <SearchField
            key={`${tab?.key}-${activeSaved?.id ?? ""}`}
            value={state.search}
            onChange={(next) => setState({ search: next, page: 1 })}
            placeholder={contract.big ? t("toolbar.searchPrefix") : t("toolbar.search")}
            clearLabel={t("toolbar.clearSearch")}
          />

          <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
            {assigneeField ? (
              <>
                <QuickFilter
                  label={t("toolbar.mine")}
                  active={hasCondition(state.filter, mineFilter(assigneeField))}
                  onToggle={() => setState({ filter: toggleCondition(state.filter, mineFilter(assigneeField)), page: 1 })}
                />
                <QuickFilter
                  label={t("toolbar.unassigned")}
                  active={hasCondition(state.filter, unassignedFilter(assigneeField))}
                  onToggle={() =>
                    setState({ filter: toggleCondition(state.filter, unassignedFilter(assigneeField)), page: 1 })
                  }
                />
              </>
            ) : null}

            <Button
              variant="outline"
              size="sm"
              aria-expanded={filterOpen}
              className={cn(filterCount > 0 && "border-brand/60")}
              onClick={() => setFilterOpen(!filterOpen)}
            >
              <FilterIcon />
              {t("toolbar.filter")}
              {filterCount > 0 ? (
                <span className="rounded-sm bg-brand px-1 font-mono text-[0.625rem] text-brand-foreground">{filterCount}</span>
              ) : null}
            </Button>

            {groupChoices.length > 0 ? (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={<Button variant="outline" size="sm" className={cn(groupBy && "border-brand/60")} />}
                >
                  <GroupIcon />
                  {groupField ? groupField.label : t("toolbar.group")}
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="max-h-80 w-56">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>{t("toolbar.groupBy")}</DropdownMenuLabel>
                    <DropdownMenuRadioGroup
                      value={state.groupBy?.replace(/^-/, "") ?? ""}
                      onValueChange={(value) => setState({ groupBy: value ? String(value) : null, page: 1 })}
                    >
                      <DropdownMenuRadioItem value="">{t("toolbar.noGrouping")}</DropdownMenuRadioItem>
                      {groupChoices.map((field) => (
                        <DropdownMenuRadioItem key={field.name} value={field.name}>
                          {field.label}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}

            <DropdownMenu>
              <DropdownMenuTrigger
                render={<Button variant="outline" size="sm" className={cn(state.aggregates.length > 0 && "border-brand/60")} />}
              >
                <SigmaIcon />
                {t("toolbar.totals")}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="max-h-80 w-64">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>{t("toolbar.totalsLabel")}</DropdownMenuLabel>
                  {aggregateChoices.map((choice) => (
                    <DropdownMenuCheckboxItem
                      key={choice.key}
                      checked={state.aggregates.includes(choice.key)}
                      closeOnClick={false}
                      // The API takes at most 10 aggregates.
                      disabled={!state.aggregates.includes(choice.key) && state.aggregates.length >= 10}
                      onCheckedChange={(checked) =>
                        setState({
                          aggregates: checked
                            ? [...state.aggregates, choice.key]
                            : state.aggregates.filter((key) => key !== choice.key),
                        })
                      }
                    >
                      {choice.label}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
                <Columns3Icon />
                {t("toolbar.columns")}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="max-h-80 w-60">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>{t("toolbar.visibleColumns")}</DropdownMenuLabel>
                  {columnChoices.map((field) => (
                    <DropdownMenuCheckboxItem
                      key={field.name}
                      checked={columnNames.includes(field.name)}
                      closeOnClick={false}
                      onCheckedChange={(checked) => {
                        const next = checked
                          ? [...columnNames, field.name]
                          : columnNames.filter((name) => name !== field.name);
                        if (next.length === 0) return;
                        const isDefault = !activeSaved && JSON.stringify(next) === JSON.stringify(tabColumns);
                        setState({ columns: isDefault ? null : next });
                      }}
                    >
                      {field.label}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuGroup>
                {state.columns ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setState({ columns: null })}>{t("toolbar.resetColumns")}</DropdownMenuItem>
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>

            <SavedViewsMenu
              resource={contract.key}
              views={savedViews.data ?? []}
              active={activeSaved}
              current={current}
              isDirty={isDirty}
              onOpen={(next) =>
                // A saved view brings its own tab, filter, sort, columns and grouping.
                setState({
                  savedView: next ? next.id : NO_SAVED_VIEW,
                  tab: null,
                  filter: null,
                  sort: null,
                  columns: null,
                  groupBy: null,
                  page: 1,
                })
              }
            />

            {assigneeField ? <WorkloadPopover resource={contract.key} /> : null}

            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="outline" size="icon-sm" aria-label={t("toolbar.more")} />}>
                <EllipsisIcon />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                {contract.abilities.export ? (
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>{t("export.label")}</DropdownMenuLabel>
                    <DropdownMenuItem disabled={exportRecords.isPending} onClick={() => exportList("csv")}>
                      <DownloadIcon />
                      {t("export.csv")}
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled={exportRecords.isPending} onClick={() => exportList("xlsx")}>
                      <DownloadIcon />
                      {t("export.xlsx")}
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                ) : null}
                {standaloneActions.length > 0 ? (
                  <>
                    {contract.abilities.export ? <DropdownMenuSeparator /> : null}
                    <DropdownMenuGroup>
                      <DropdownMenuLabel>{t("toolbar.standalone")}</DropdownMenuLabel>
                      {standaloneActions.map((action) => (
                        <DropdownMenuItem key={action.key} onClick={() => startAction(action, { kind: "standalone" })}>
                          {action.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuGroup>
                  </>
                ) : null}
                {contract.soft_deletes ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                      <DropdownMenuLabel>{t("trashed.label")}</DropdownMenuLabel>
                      <DropdownMenuRadioGroup
                        value={state.trashed ?? "without"}
                        onValueChange={(value) =>
                          setState({ trashed: value === "with" || value === "only" ? value : null, page: 1 })
                        }
                      >
                        <DropdownMenuRadioItem value="without">{t("trashed.without")}</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="with">{t("trashed.with")}</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="only">{t("trashed.only")}</DropdownMenuRadioItem>
                      </DropdownMenuRadioGroup>
                    </DropdownMenuGroup>
                  </>
                ) : null}
                {!contract.abilities.export && standaloneActions.length === 0 && !contract.soft_deletes ? (
                  <DropdownMenuItem disabled>{t("toolbar.nothingMore")}</DropdownMenuItem>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="outline"
              size="icon-sm"
              aria-label={t("toolbar.refresh")}
              onClick={() => records.refetch()}
              disabled={records.isFetching}
            >
              <RotateCwIcon className={cn(records.isFetching && "animate-spin")} />
            </Button>
          </div>
        </div>

        {view && view.tabs.length > 1 ? (
          <div
            role="tablist"
            aria-label={t("toolbar.views")}
            className="scrollbar-slim -mx-4 flex gap-1 overflow-x-auto px-4 sm:-mx-6 sm:px-6"
          >
            {view.tabs.map((entry) => {
              const isActive = entry.key === tab?.key;
              return (
                <button
                  key={entry.key}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() =>
                    // Another tab is another slice: leave the saved view, keep search and filter.
                    setState({
                      tab: entry.key,
                      page: 1,
                      sort: null,
                      columns: null,
                      ...(activeSaved ? { savedView: NO_SAVED_VIEW } : {}),
                    })
                  }
                  className={cn(
                    "relative h-9 shrink-0 px-2.5 text-sm whitespace-nowrap text-muted-foreground outline-none hover:text-foreground focus-visible:text-foreground",
                    "after:absolute after:inset-x-2.5 after:bottom-0 after:h-0.5 after:rounded-full after:bg-transparent",
                    isActive && "font-medium text-foreground after:bg-brand",
                  )}
                >
                  {entry.label}
                  {tabCounts[entry.key] ? (
                    <span className="ml-1.5 rounded-sm bg-muted px-1 font-mono text-[0.625rem] text-muted-foreground tabular-nums">
                      {tabCounts[entry.key].capped
                        ? tTable("totalCapped", { total: format.number(tabCounts[entry.key].total) })
                        : format.number(tabCounts[entry.key].total)}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      {filterOpen ? (
        <FilterBuilder
          key={JSON.stringify(state.filter)}
          contract={contract}
          value={state.filter}
          onApply={(filter) => setState({ filter, page: 1 })}
          onClose={() => setFilterOpen(false)}
        />
      ) : null}

      {activeSaved && (savedFilterCount > 0 || activeSaved.dropped.length > 0 || (meta?.saved_view?.dropped.length ?? 0) > 0) ? (
        <p className="border-b bg-muted/40 px-4 py-1.5 text-xs text-muted-foreground sm:px-6">
          {savedFilterCount > 0 ? t("savedViews.filterNote", { name: activeSaved.name, count: savedFilterCount }) : null}{" "}
          {(meta?.saved_view?.dropped ?? activeSaved.dropped).length > 0
            ? t("savedViews.dropped", { fields: (meta?.saved_view?.dropped ?? activeSaved.dropped).join(", ") })
            : null}
        </p>
      ) : null}

      {meta?.groups && groupField ? (
        <div className="scrollbar-slim flex shrink-0 items-center gap-1.5 overflow-x-auto border-b px-4 py-2 sm:px-6">
          {meta.groups.map((group) => {
            const condition =
              group.value === null
                ? { field: groupField.name, operator: "is_empty" as const }
                : { field: groupField.name, operator: "is" as const, value: group.value };
            const active = hasCondition(state.filter, condition);
            return (
              <button
                key={String(group.value)}
                type="button"
                aria-pressed={active}
                onClick={() => setState({ filter: toggleCondition(state.filter, condition), page: 1 })}
                className={cn(
                  "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active ? "border-foreground bg-foreground text-background" : "bg-card hover:bg-muted",
                )}
              >
                {group.label ??
                  (group.value === null ? (
                    t("groups.none")
                  ) : (
                    <FieldValue field={{ ...groupField, type: groupField.type === "enum" ? "text" : groupField.type }} value={group.value} />
                  ))}
                <span className="font-mono tabular-nums opacity-70">{format.number(group.count)}</span>
              </button>
            );
          })}
          {meta.groups_capped ? <span className="shrink-0 text-xs text-muted-foreground">{t("groups.capped")}</span> : null}
        </div>
      ) : null}

      {selectable && (selectedIds.size > 0 || selection.allMatching) ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b bg-accent/50 px-4 py-2 text-sm sm:px-6">
          <span className="font-medium">
            {selection.allMatching
              ? meta?.total_capped
                ? t("selection.allMatchingCapped")
                : t("selection.allMatching", { count: total })
              : t("selection.count", { count: selectedIds.size })}
          </span>
          {!selection.allMatching && allOnPage && (meta?.has_more || state.page > 1) ? (
            <button
              type="button"
              className="underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => setSelection((currentSelection) => ({ ...currentSelection, allMatching: true }))}
            >
              {meta?.total_capped ? t("selection.selectAllCapped") : t("selection.selectAll", { count: total })}
            </button>
          ) : null}
          <div className="flex flex-wrap items-center gap-1.5 sm:ml-auto">
            {bulkActions.map((action) => (
              <Button
                key={action.key}
                size="sm"
                variant={action.dangerous || action.tone === "danger" ? "destructive" : "outline"}
                className={action.dangerous || action.tone === "danger" ? undefined : "bg-card"}
                onClick={() => {
                  const { target, count } = bulkTarget();
                  startAction(action, { kind: "bulk", target, count });
                }}
              >
                {action.label}
              </Button>
            ))}
            {canBulkAssign ? (
              <>
                <StaffPicker
                  size="sm"
                  className="w-44"
                  value={null}
                  placeholder={t("selection.assignTo")}
                  disabled={assignRecords.isPending}
                  onChange={(adminId) => {
                    if (typeof adminId === "number") assignSelected(adminId);
                  }}
                />
                <Button size="sm" variant="outline" className="bg-card" disabled={assignRecords.isPending} onClick={() => assignSelected(null)}>
                  {t("selection.unassign")}
                </Button>
              </>
            ) : null}
            <Button size="sm" variant="ghost" onClick={clearSelection}>
              {t("selection.clear")}
            </Button>
          </div>
        </div>
      ) : null}

      {records.isError ? (
        <ErrorState title={t("recordsLoadFailed")} error={records.error} onRetry={() => records.refetch()} />
      ) : (
        <DataTable
          columns={tableColumns}
          data={rows}
          getRowId={getRecordId}
          sorting={sorting}
          onSortingChange={handleSortingChange}
          columnVisibility={NO_VISIBILITY}
          onColumnVisibilityChange={() => {}}
          onRowClick={(record) => openRecord(contract.key, record.id)}
          activeRowId={state.record && state.record.resource === null ? state.record.id : null}
          isLoading={records.isPending}
          isFetching={records.isPlaceholderData}
          skeletonRows={Math.min(state.pageSize, 14)}
          grouping={grouping}
          className="min-h-80"
          emptyState={
            <div>
              <p className="text-sm font-medium">{t("emptyTitle")}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t("emptyHint")}</p>
            </div>
          }
        />
      )}

      {meta?.aggregates?.length ? (
        <dl className="scrollbar-slim flex shrink-0 gap-6 overflow-x-auto border-t bg-muted/40 px-4 py-2 sm:px-6">
          {meta.aggregates.map((aggregate) => (
            <AggregateValue
              key={aggregate.key}
              aggregate={aggregate}
              label={aggregateChoices.find((choice) => choice.key === aggregate.key)?.label ?? aggregate.key}
              fieldType={aggregate.field ? getField(contract, aggregate.field)?.type : undefined}
            />
          ))}
        </dl>
      ) : null}

      <DataTablePagination
        page={state.page}
        pageSize={state.pageSize}
        total={total}
        totalCapped={meta?.total_capped ?? false}
        hasMore={meta?.has_more ?? false}
        pageSizes={PAGE_SIZES}
        onPageChange={(next) => setState({ page: next })}
        onPageSizeChange={(next) => setState({ pageSize: next, page: 1 })}
        disabled={records.isPending}
      />

      <RecordDrawer
        open={
          state.record
            ? { resource: state.record.resource ?? contract.key, id: state.record.id, view: state.record.view ?? null }
            : null
        }
        onClose={() => setState({ record: null })}
        onOpenRecord={openRecord}
        tabActions={state.record?.resource === null ? tabActionKeys.filter((key) => getAction(contract, key)) : undefined}
        inline={state.record?.resource === null ? inlineFields : undefined}
        screens={screens}
      />
      <ActionDialog run={run} onClose={() => setRun(null)} />
    </div>
  );
}

function QuickFilter({ label, active, onToggle }: { label: string; active: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onToggle}
      className={cn(
        "h-7 rounded-full border px-2.5 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active ? "border-foreground bg-foreground text-background" : "bg-card text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}

/** One total over the whole filtered result. A money total has one amount per currency. */
function AggregateValue({
  aggregate,
  label,
  fieldType,
}: {
  aggregate: ListAggregate;
  label: string;
  fieldType: string | undefined;
}) {
  const format = useFormat();
  const { value } = aggregate;
  let text: string;
  if (value === null) text = "—";
  else if (Array.isArray(value)) text = value.length ? value.map((money) => format.money(money)).join(" · ") : "—";
  else if (fieldType === "money" && aggregate.function !== "count") text = format.number(value / 100, 2);
  else text = format.number(value, aggregate.function === "avg" ? 4 : undefined);

  return (
    <div className="flex shrink-0 items-baseline gap-2 text-sm">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-mono font-medium tabular-nums">{text}</dd>
    </div>
  );
}

/** Open records per admin, for balancing the load (`GET .../assignments/summary`). */
function WorkloadPopover({ resource }: { resource: string }) {
  const t = useTranslations("resources.workload");
  const format = useFormat();
  const [open, setOpen] = useState(false);
  const summary = useAssignmentSummary(resource, open);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<Button variant="outline" size="icon-sm" aria-label={t("title")} title={t("title")} />}>
        <UsersIcon />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72">
        <p className="text-sm font-medium">{t("title")}</p>
        <p className="text-xs text-muted-foreground">
          {summary.data?.meta.open_filter === false ? t("allRecords") : t("openRecords")}
        </p>
        {summary.isPending ? (
          <Skeleton className="h-16" />
        ) : summary.isError ? (
          <p className="text-sm text-destructive">{t("loadFailed")}</p>
        ) : (
          <ul className="scrollbar-slim max-h-64 overflow-y-auto text-sm">
            <li className="flex justify-between gap-3 border-b py-1 text-muted-foreground">
              <span>{t("unassigned")}</span>
              <span className="font-mono tabular-nums">
                {format.number(summary.data.meta.unassigned)}
                {summary.data.meta.unassigned_capped ? "+" : ""}
              </span>
            </li>
            {summary.data.data.map((entry) => (
              <li key={entry.admin.id} className="flex justify-between gap-3 py-1">
                <span className="truncate">{entry.admin.name ?? `#${entry.admin.id}`}</span>
                <span className="font-mono tabular-nums">{format.number(entry.open)}</span>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
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
