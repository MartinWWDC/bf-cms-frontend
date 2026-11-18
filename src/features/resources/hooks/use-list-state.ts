"use client";

import { useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";

import type { ListParams, SortRule } from "../types";

export const PAGE_SIZES = [25, 50, 100] as const;
const DEFAULT_PAGE_SIZE = PAGE_SIZES[0];
const DEFAULT_TAB = "all";

export interface ListState extends ListParams {
  /** Id of the record open in the detail drawer, if any. */
  recordId: string | null;
}

export type ListStatePatch = Partial<ListState>;

function parseSort(raw: string | null, fallback: SortRule): SortRule {
  if (!raw) return fallback;
  return raw.startsWith("-")
    ? { field: raw.slice(1), direction: "desc" }
    : { field: raw, direction: "asc" };
}

function serializeSort(sort: SortRule) {
  return sort.direction === "desc" ? `-${sort.field}` : sort.field;
}

function parsePositiveInt(raw: string | null, fallback: number) {
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

/**
 * List state (page, sort, search, tab, open record) kept in the URL, so a view can be
 * shared or reloaded as-is. Defaults are left out of the URL to keep it short.
 *
 * Uses the native History API, which Next.js syncs with `useSearchParams`, so changing
 * the state never triggers a server round trip. Opening a record pushes a history entry
 * (Back closes the drawer); everything else replaces the current one.
 */
export function useListState(defaultSort: SortRule) {
  const searchParams = useSearchParams();

  const state = useMemo<ListState>(() => {
    const pageSize = parsePositiveInt(searchParams.get("size"), DEFAULT_PAGE_SIZE);
    return {
      page: parsePositiveInt(searchParams.get("page"), 1),
      pageSize: (PAGE_SIZES as readonly number[]).includes(pageSize) ? pageSize : DEFAULT_PAGE_SIZE,
      sort: parseSort(searchParams.get("sort"), defaultSort),
      search: searchParams.get("q") ?? "",
      tab: searchParams.get("tab") ?? DEFAULT_TAB,
      recordId: searchParams.get("record"),
    };
  }, [searchParams, defaultSort]);

  const setState = useCallback(
    (patch: ListStatePatch) => {
      const params = new URLSearchParams(window.location.search);
      const set = (key: string, value: string | null) =>
        value === null ? params.delete(key) : params.set(key, value);

      if (patch.page !== undefined) set("page", patch.page > 1 ? String(patch.page) : null);
      if (patch.pageSize !== undefined) {
        set("size", patch.pageSize !== DEFAULT_PAGE_SIZE ? String(patch.pageSize) : null);
      }
      if (patch.sort !== undefined) {
        const isDefault =
          patch.sort.field === defaultSort.field && patch.sort.direction === defaultSort.direction;
        set("sort", isDefault ? null : serializeSort(patch.sort));
      }
      if (patch.search !== undefined) set("q", patch.search || null);
      if (patch.tab !== undefined) set("tab", patch.tab !== DEFAULT_TAB ? patch.tab : null);
      if (patch.recordId !== undefined) set("record", patch.recordId);

      const query = params.toString();
      const url = query ? `?${query}` : window.location.pathname;
      const opensRecord = patch.recordId != null;
      if (opensRecord) window.history.pushState(null, "", url);
      else window.history.replaceState(null, "", url);
    },
    [defaultSort],
  );

  return [state, setState] as const;
}
