"use client";

import { useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";

import {
  TASK_PRIORITIES,
  TASK_SORTS,
  TASK_STATUSES,
  type TaskListParams,
  type TaskPriority,
  type TaskScope,
  type TaskSort,
  type TaskStatus,
} from "../types";

const PER_PAGE = 50;

function pick<T extends string>(raw: string | null, allowed: readonly T[]): T[] {
  return (raw ?? "").split(",").filter((entry): entry is T => (allowed as readonly string[]).includes(entry));
}

/** The task list's scope, filters, sort and page, kept in the URL so a view can be shared. */
export function useTaskListState() {
  const searchParams = useSearchParams();

  const state = useMemo<TaskListParams>(() => {
    const scope = searchParams.get("scope");
    const sort = searchParams.get("sort");
    const page = Number(searchParams.get("page"));
    return {
      scope: scope === "unassigned" || scope === "all" ? scope : "mine",
      status: pick<TaskStatus>(searchParams.get("status"), TASK_STATUSES),
      type: searchParams.get("type"),
      priority: pick<TaskPriority>(searchParams.get("priority"), TASK_PRIORITIES),
      overdue: searchParams.get("overdue") === "1",
      sort: (TASK_SORTS as readonly string[]).includes(sort ?? "") ? (sort as TaskSort) : null,
      page: Number.isInteger(page) && page > 0 ? page : 1,
      perPage: PER_PAGE,
    };
  }, [searchParams]);

  const setState = useCallback((patch: Partial<Omit<TaskListParams, "perPage">>) => {
    const params = new URLSearchParams(window.location.search);
    const set = (key: string, value: string | null) => (value === null ? params.delete(key) : params.set(key, value));

    if (patch.scope !== undefined) set("scope", patch.scope === "mine" ? null : (patch.scope satisfies TaskScope));
    if (patch.status !== undefined) set("status", patch.status.length ? patch.status.join(",") : null);
    if (patch.type !== undefined) set("type", patch.type);
    if (patch.priority !== undefined) set("priority", patch.priority.length ? patch.priority.join(",") : null);
    if (patch.overdue !== undefined) set("overdue", patch.overdue ? "1" : null);
    if (patch.sort !== undefined) set("sort", patch.sort);
    // Any other change starts again at the first page.
    set("page", patch.page !== undefined && patch.page > 1 ? String(patch.page) : null);

    const query = params.toString();
    window.history.replaceState(null, "", query ? `${window.location.pathname}?${query}` : window.location.pathname);
  }, []);

  return [state, setState] as const;
}
