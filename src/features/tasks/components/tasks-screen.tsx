"use client";

import { useState } from "react";
import Link from "next/link";
import { RotateCwIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { cn } from "cn";

import { ErrorState } from "@/components/error-state";
import { PageHeader } from "@/components/layout/page-header";
import { SimpleSelect } from "@/components/simple-select";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePermissions } from "@/features/session/hooks/use-permissions";
import { useFormat } from "@/i18n/use-format";
import { useErrorToast } from "@/lib/api/use-error-message";
import { recordHref } from "@/lib/routes";

import { useTaskListState } from "../hooks/use-task-list-state";
import { useChangeTask, useChangeTasks } from "../mutations";
import { useTaskQueues, useTasks, useTaskTypes } from "../queries";
import {
  type BulkTaskResult,
  MAX_BULK_TASKS,
  TASK_PRIORITIES,
  TASK_SORTS,
  TASK_STATUSES,
  type Task,
  type TaskOperation,
  type TaskPriority,
  type TaskScope,
  type TaskSort,
  type TaskStatus,
} from "../types";
import { QueueList } from "./queue-list";
import { type TaskChangeKind, TaskChangeDialog } from "./task-change-dialog";

const ALL = "__all";

/**
 * "My tasks": what needs this admin's attention. Queues on top, stored tasks below.
 * Must be rendered inside `<Suspense>`: the list state lives in the URL.
 */
export function TasksScreen() {
  const t = useTranslations("tasks");
  const format = useFormat();
  const queues = useTaskQueues();
  const counts = queues.data?.tasks;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader title={t("title")} description={t("description")}>
        <Button
          variant="outline"
          size="icon-sm"
          aria-label={t("refresh")}
          disabled={queues.isFetching}
          onClick={() => queues.refetch()}
        >
          <RotateCwIcon className={cn(queues.isFetching && "animate-spin")} />
        </Button>
      </PageHeader>

      <div className="flex flex-col gap-8 px-4 pb-8 sm:px-6">
        <section aria-labelledby="tasks-queues" className="flex flex-col gap-3">
          <h2 id="tasks-queues" className="font-mono text-[0.6875rem] tracking-wider text-muted-foreground uppercase">
            {t("queues.title")}
          </h2>
          {queues.isError ? (
            <ErrorState
              title={t("queues.loadFailed")}
              error={queues.error}
              onRetry={() => queues.refetch()}
              className="min-h-32"
            />
          ) : queues.isPending ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 3 }, (_, index) => (
                <Skeleton key={index} className="h-28" />
              ))}
            </div>
          ) : (
            <QueueList queues={queues.data.queues} />
          )}
        </section>

        <section aria-labelledby="tasks-stored" className="flex flex-col gap-3">
          <h2 id="tasks-stored" className="font-mono text-[0.6875rem] tracking-wider text-muted-foreground uppercase">
            {t("stored.title")}
          </h2>
          {counts ? (
            <dl className="flex flex-wrap gap-x-8 gap-y-2">
              <Counter label={t("counts.open")} value={format.number(counts.mine.open)} />
              <Counter label={t("counts.inProgress")} value={format.number(counts.mine.in_progress)} />
              <Counter label={t("counts.overdue")} value={format.number(counts.mine.overdue)} alert={counts.mine.overdue > 0} />
              <Counter label={t("counts.unassigned")} value={format.number(counts.unassigned)} />
              {counts.all !== null ? <Counter label={t("counts.all")} value={format.number(counts.all)} /> : null}
            </dl>
          ) : null}
          <TaskList />
        </section>
      </div>
    </div>
  );
}

function Counter({ label, value, alert = false }: { label: string; value: string; alert?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn("font-heading text-2xl leading-tight font-semibold tabular-nums", alert && "text-destructive")}>
        {value}
      </dd>
    </div>
  );
}

function Chip({ label, active, onToggle }: { label: string; active: boolean; onToggle: () => void }) {
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

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((entry) => entry !== value) : [...list, value];
}

function TaskList() {
  const t = useTranslations("tasks");
  const tTable = useTranslations("table");
  const format = useFormat();
  const toastError = useErrorToast();
  const { can, me } = usePermissions();
  const [state, setState] = useTaskListState();
  const tasks = useTasks(state);
  const types = useTaskTypes();
  const changeOne = useChangeTask();
  const changeMany = useChangeTasks();
  const canViewAll = can("tasks.view_all");
  const canManage = can("tasks.manage");

  const listKey = JSON.stringify({ ...state, page: undefined });
  const [selection, setSelection] = useState<{ key: string; ids: Set<number> }>({ key: listKey, ids: new Set() });
  // Another scope or filter is another list: its selection starts empty.
  if (selection.key !== listKey) setSelection({ key: listKey, ids: new Set() });
  const selected = selection.ids;
  const [dialog, setDialog] = useState<{ kind: TaskChangeKind; ids: number[] } | null>(null);
  const [bulkResult, setBulkResult] = useState<BulkTaskResult | null>(null);

  const rows = tasks.data?.data ?? [];
  const meta = tasks.data?.meta;
  const pageIds = rows.map((task) => task.id);
  const allOnPage = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const clearSelection = () => setSelection({ key: listKey, ids: new Set() });

  const scopes: TaskScope[] = canViewAll ? ["mine", "unassigned", "all"] : ["mine", "unassigned"];

  const runOne = (task: Task, change: TaskOperation) =>
    changeOne.mutate(
      { id: task.id, change },
      {
        onSuccess: () => {
          toast.success(t("changed"));
          setDialog(null);
        },
        // `task_closed`, `duplicate_task`: the backend message says why.
        onError: toastError,
      },
    );

  const runMany = (ids: number[], change: TaskOperation) =>
    changeMany.mutate(
      { ids, change },
      {
        onSuccess: (result) => {
          setDialog(null);
          clearSelection();
          if (result.failed.length === 0) {
            setBulkResult(null);
            toast.success(t("bulk.done", { count: result.succeeded.length }));
          } else {
            setBulkResult(result);
          }
        },
        onError: toastError,
      },
    );

  const submit = (change: TaskOperation) => {
    if (!dialog) return;
    if (dialog.ids.length === 1 && selected.size === 0) {
      const task = rows.find((row) => row.id === dialog.ids[0]);
      if (task) runOne(task, change);
    } else {
      runMany(dialog.ids, change);
    }
  };

  const selectedIds = [...selected].slice(0, MAX_BULK_TASKS);
  const isBusy = changeOne.isPending || changeMany.isPending;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div role="tablist" aria-label={t("scope.label")} className="flex gap-1">
          {scopes.map((scope) => (
            <button
              key={scope}
              type="button"
              role="tab"
              aria-selected={state.scope === scope}
              onClick={() => setState({ scope })}
              className={cn(
                "relative h-8 px-2.5 text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:text-foreground",
                "after:absolute after:inset-x-2.5 after:bottom-0 after:h-0.5 after:rounded-full after:bg-transparent",
                state.scope === scope && "font-medium text-foreground after:bg-brand",
              )}
            >
              {t(`scope.${scope}`)}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
          <SimpleSelect
            size="sm"
            className="w-48"
            aria-label={t("filters.type")}
            value={state.type ?? ALL}
            options={[
              { value: ALL, label: t("filters.allTypes") },
              ...(types.data ?? []).map((type) => ({ value: type.type, label: type.label })),
            ]}
            onChange={(next) => setState({ type: next === ALL ? null : next })}
          />
          <SimpleSelect
            size="sm"
            className="w-44"
            aria-label={t("filters.sort")}
            value={state.sort ?? ALL}
            options={[
              { value: ALL, label: t("sort.default") },
              ...TASK_SORTS.map((sort) => ({ value: sort, label: t(`sort.${sort === "-created_at" ? "newest" : sort === "created_at" ? "oldest" : sort}`) })),
            ]}
            onChange={(next) => setState({ sort: next === ALL ? null : (next as TaskSort) })}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-muted-foreground">{t("filters.status")}</span>
        {TASK_STATUSES.map((status: TaskStatus) => (
          <Chip
            key={status}
            label={t(`status.${status}`)}
            active={state.status.includes(status)}
            onToggle={() => setState({ status: toggle(state.status, status) })}
          />
        ))}
        <span className="ml-2 text-xs text-muted-foreground">{t("filters.priority")}</span>
        {TASK_PRIORITIES.map((priority: TaskPriority) => (
          <Chip
            key={priority}
            label={t(`priority.${priority}`)}
            active={state.priority.includes(priority)}
            onToggle={() => setState({ priority: toggle(state.priority, priority) })}
          />
        ))}
        <span className="ml-2" />
        <Chip label={t("filters.overdue")} active={state.overdue} onToggle={() => setState({ overdue: !state.overdue })} />
      </div>

      {selected.size > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-accent/50 px-3 py-2 text-sm">
          <span className="font-medium">
            {t("bulk.selected", { count: selected.size })}
            {selected.size > MAX_BULK_TASKS ? ` ${t("bulk.limit", { max: MAX_BULK_TASKS })}` : null}
          </span>
          <div className="flex flex-wrap items-center gap-1.5 sm:ml-auto">
            <Button size="sm" variant="outline" className="bg-card" disabled={isBusy} onClick={() => runMany(selectedIds, { operation: "take" })}>
              {t("actions.take")}
            </Button>
            {canManage ? (
              <Button size="sm" variant="outline" className="bg-card" disabled={isBusy} onClick={() => setDialog({ kind: "assign", ids: selectedIds })}>
                {t("actions.assign")}
              </Button>
            ) : null}
            <Button size="sm" variant="outline" className="bg-card" disabled={isBusy} onClick={() => setDialog({ kind: "status", ids: selectedIds })}>
              {t("actions.status")}
            </Button>
            <Button size="sm" variant="destructive" disabled={isBusy} onClick={() => setDialog({ kind: "dismiss", ids: selectedIds })}>
              {t("actions.dismiss")}
            </Button>
            <Button size="sm" variant="ghost" onClick={clearSelection}>
              {t("bulk.clear")}
            </Button>
          </div>
        </div>
      ) : null}

      {bulkResult ? (
        <div role="alert" className="flex flex-col gap-2 rounded-lg border border-tone-warning/50 bg-tone-warning/10 p-3 text-sm">
          <div className="flex items-start gap-2">
            <p className="mr-auto font-medium">
              {t("bulk.partial", { succeeded: bulkResult.succeeded.length, failed: bulkResult.failed.length })}
            </p>
            <Button size="xs" variant="ghost" onClick={() => setBulkResult(null)}>
              {t("bulk.dismissResult")}
            </Button>
          </div>
          <ul className="scrollbar-slim max-h-40 overflow-y-auto">
            {bulkResult.failed.map((failure) => (
              <li key={failure.id} className="flex gap-2 py-0.5">
                <span className="shrink-0 font-mono text-xs text-muted-foreground">#{failure.id}</span>
                <span className="min-w-0 break-words">{failure.message}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {tasks.isError ? (
        <ErrorState title={t("stored.loadFailed")} error={tasks.error} onRetry={() => tasks.refetch()} className="min-h-40" />
      ) : (
        <div className={cn("overflow-x-auto rounded-lg border bg-card transition-opacity", tasks.isPlaceholderData && "opacity-60")}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-0">
                  <Checkbox
                    checked={allOnPage}
                    aria-label={t("bulk.selectPage")}
                    onCheckedChange={(checked) =>
                      setSelection((current) => {
                        const ids = new Set(current.ids);
                        for (const id of pageIds) {
                          if (checked === true) ids.add(id);
                          else ids.delete(id);
                        }
                        return { ...current, ids };
                      })
                    }
                  />
                </TableHead>
                <TableHead>{t("columns.task")}</TableHead>
                <TableHead>{t("columns.priority")}</TableHead>
                <TableHead>{t("columns.status")}</TableHead>
                <TableHead>{t("columns.record")}</TableHead>
                <TableHead>{t("columns.assignee")}</TableHead>
                <TableHead>{t("columns.due")}</TableHead>
                <TableHead className="w-0" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.isPending ? (
                Array.from({ length: 5 }, (_, index) => (
                  <TableRow key={index}>
                    <TableCell colSpan={8}>
                      <Skeleton className="h-5" />
                    </TableCell>
                  </TableRow>
                ))
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                    {t("stored.empty")}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((task) => {
                  const closed = task.status === "done" || task.status === "dismissed";
                  const isMine = me !== undefined && task.assignee?.id === me.id;
                  return (
                    <TableRow key={task.id} data-state={selected.has(task.id) ? "selected" : undefined}>
                      <TableCell>
                        <Checkbox
                          checked={selected.has(task.id)}
                          aria-label={t("bulk.selectRow", { id: task.id })}
                          onCheckedChange={(checked) =>
                            setSelection((current) => {
                              const ids = new Set(current.ids);
                              if (checked === true) ids.add(task.id);
                              else ids.delete(task.id);
                              return { ...current, ids };
                            })
                          }
                        />
                      </TableCell>
                      <TableCell className="max-w-96 whitespace-normal">
                        <span className="block font-mono text-[0.6875rem] tracking-wider text-muted-foreground uppercase">
                          {task.type_label}
                        </span>
                        <span className="block break-words">{task.title}</span>
                        {closed && task.close_reason ? (
                          <span className="block text-xs text-muted-foreground">{task.close_reason}</span>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <StatusBadge label={t(`priority.${task.priority}`)} tone={task.priority_tone} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge label={t(`status.${task.status}`)} tone={task.status_tone} />
                        {task.closed_automatically ? (
                          <span className="mt-0.5 block text-xs text-muted-foreground">{t("stored.closedAutomatically")}</span>
                        ) : null}
                      </TableCell>
                      <TableCell className="max-w-64">
                        <Link
                          href={recordHref(task.resource, task.record_id)}
                          className="block truncate underline decoration-border underline-offset-4 outline-none hover:decoration-foreground focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          {task.record_title ?? `#${task.record_id}`}
                        </Link>
                        <span className="block text-xs text-muted-foreground">{task.resource_label}</span>
                      </TableCell>
                      <TableCell>{task.assignee ? (task.assignee.name ?? `#${task.assignee.id}`) : <span className="text-muted-foreground">{t("stored.unassigned")}</span>}</TableCell>
                      <TableCell className={cn("whitespace-nowrap", task.overdue && "font-medium text-destructive")}>
                        {task.due_at ? (
                          <time dateTime={task.due_at} title={format.dateTime(task.due_at)}>
                            {format.relative(task.due_at)}
                          </time>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                        {task.overdue ? <span className="block text-xs">{t("stored.overdue")}</span> : null}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          {task.abilities.take && !isMine ? (
                            <Button size="xs" variant="outline" disabled={isBusy} onClick={() => runOne(task, { operation: "take" })}>
                              {t("actions.take")}
                            </Button>
                          ) : null}
                          {task.abilities.assign_others ? (
                            <Button size="xs" variant="outline" disabled={isBusy} onClick={() => setDialog({ kind: "assign", ids: [task.id] })}>
                              {t("actions.assign")}
                            </Button>
                          ) : task.abilities.change && isMine && !closed ? (
                            <Button size="xs" variant="outline" disabled={isBusy} onClick={() => runOne(task, { operation: "assign", adminId: null })}>
                              {t("actions.giveBack")}
                            </Button>
                          ) : null}
                          {task.abilities.change ? (
                            <>
                              <Button size="xs" variant="outline" disabled={isBusy} onClick={() => setDialog({ kind: "status", ids: [task.id] })}>
                                {closed ? t("actions.reopen") : t("actions.status")}
                              </Button>
                              {closed ? null : (
                                <Button size="xs" variant="destructive" disabled={isBusy} onClick={() => setDialog({ kind: "dismiss", ids: [task.id] })}>
                                  {t("actions.dismiss")}
                                </Button>
                              )}
                            </>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {meta ? (
        <div className="flex items-center justify-end gap-2">
          <span className="mr-auto font-mono text-xs text-muted-foreground tabular-nums">
            {t("stored.total", { count: meta.total })}
          </span>
          <Button variant="outline" size="sm" disabled={state.page <= 1} onClick={() => setState({ page: state.page - 1 })}>
            {tTable("previousPage")}
          </Button>
          <span className="font-mono text-xs text-muted-foreground tabular-nums">{state.page}</span>
          <Button variant="outline" size="sm" disabled={!meta.has_more} onClick={() => setState({ page: state.page + 1 })}>
            {tTable("nextPage")}
          </Button>
        </div>
      ) : null}

      <TaskChangeDialog
        kind={dialog?.kind ?? null}
        count={dialog?.ids.length ?? 0}
        canAssignOthers
        isPending={isBusy}
        onSubmit={submit}
        onClose={() => setDialog(null)}
      />
    </div>
  );
}
