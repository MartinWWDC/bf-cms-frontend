"use client";

import { useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";

import { parseFilter, pruneFilter } from "../lib/filters";
import type { FilterGroup, Trashed } from "../types";

/** The API default is 50 per page, at most 200. */
export const PAGE_SIZES = [25, 50, 100, 200] as const;
export const DEFAULT_PAGE_SIZE = 50;

/** `?saved=0`: the admin left their saved view on purpose, so the default one is not applied. */
export const NO_SAVED_VIEW = 0;

export interface OpenRecord {
  /** `null`: a record of the resource the list shows. Otherwise a linked record of another resource. */
  resource: string | null;
  /** Record id, or `new` for the create form. */
  id: string;
  /** Key of the list view the record was opened from (`?from=`); absent for a direct link. */
  view?: string | null;
}

export interface ListState {
  /** Tab key; `null` means the view's first tab. */
  tab: string | null;
  page: number;
  pageSize: number;
  /** `-created_at`; `null` means the tab's default sort. */
  sort: string | null;
  search: string;
  /** The admin's own filter. It can only narrow the view. */
  filter: FilterGroup | null;
  groupBy: string | null;
  aggregates: string[];
  trashed: Trashed | null;
  /** Id of the saved view in use, `NO_SAVED_VIEW`, or `null` when the URL names none. */
  savedView: number | null;
  /** Columns the admin picked; `null` means the tab's columns. */
  columns: string[] | null;
  /** The record open in the detail drawer, if any. */
  record: OpenRecord | null;
}

export type ListStatePatch = Partial<ListState>;

function parsePositiveInt(raw: string | null, fallback: number) {
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

function parseList(raw: string | null): string[] {
  return raw ? raw.split(",").filter(Boolean) : [];
}

function parseRecord(raw: string | null, view: string | null): OpenRecord | null {
  if (!raw) return null;
  const separator = raw.indexOf(":");
  return separator === -1
    ? { resource: null, id: raw, view }
    : { resource: raw.slice(0, separator), id: raw.slice(separator + 1), view: null };
}

function serializeRecord(record: OpenRecord | null): string | null {
  if (!record) return null;
  return record.resource ? `${record.resource}:${record.id}` : record.id;
}

/**
 * List state (tab, page, sort, search, filter, grouping, saved view, columns, open record
 * and the view it was opened from)
 * kept in the URL, so a view can be shared or reloaded as-is. Defaults are left out of the
 * URL to keep it short.
 *
 * Uses the native History API, which Next.js syncs with `useSearchParams`, so changing the
 * state never triggers a server round trip. Opening a record pushes a history entry (Back
 * closes the drawer); everything else replaces the current one.
 */
export function useListState() {
  const searchParams = useSearchParams();

  const state = useMemo<ListState>(() => {
    const pageSize = parsePositiveInt(searchParams.get("size"), DEFAULT_PAGE_SIZE);
    const trashed = searchParams.get("trashed");
    const saved = searchParams.get("saved");
    const columns = parseList(searchParams.get("cols"));
    return {
      tab: searchParams.get("tab"),
      page: parsePositiveInt(searchParams.get("page"), 1),
      pageSize: (PAGE_SIZES as readonly number[]).includes(pageSize) ? pageSize : DEFAULT_PAGE_SIZE,
      sort: searchParams.get("sort"),
      search: searchParams.get("q") ?? "",
      filter: pruneFilter(parseFilter(searchParams.get("filter"))),
      groupBy: searchParams.get("group"),
      aggregates: parseList(searchParams.get("agg")),
      trashed: trashed === "with" || trashed === "only" ? trashed : null,
      savedView: saved === null ? null : Number.isInteger(Number(saved)) ? Number(saved) : null,
      columns: columns.length > 0 ? columns : null,
      record: parseRecord(searchParams.get("record"), searchParams.get("from")),
    };
  }, [searchParams]);

  const setState = useCallback((patch: ListStatePatch) => {
    const params = new URLSearchParams(window.location.search);
    const set = (key: string, value: string | null) => (value === null ? params.delete(key) : params.set(key, value));

    if (patch.tab !== undefined) set("tab", patch.tab);
    if (patch.page !== undefined) set("page", patch.page > 1 ? String(patch.page) : null);
    if (patch.pageSize !== undefined) {
      set("size", patch.pageSize !== DEFAULT_PAGE_SIZE ? String(patch.pageSize) : null);
    }
    if (patch.sort !== undefined) set("sort", patch.sort);
    if (patch.search !== undefined) set("q", patch.search || null);
    if (patch.filter !== undefined) {
      const filter = pruneFilter(patch.filter);
      set("filter", filter ? JSON.stringify(filter) : null);
    }
    if (patch.groupBy !== undefined) set("group", patch.groupBy);
    if (patch.aggregates !== undefined) set("agg", patch.aggregates.length ? patch.aggregates.join(",") : null);
    if (patch.trashed !== undefined) set("trashed", patch.trashed);
    if (patch.savedView !== undefined) set("saved", patch.savedView === null ? null : String(patch.savedView));
    if (patch.columns !== undefined) set("cols", patch.columns?.length ? patch.columns.join(",") : null);
    if (patch.record !== undefined) {
      set("record", serializeRecord(patch.record));
      // The view travels with the record, so reload, Back and shared links open the same detail screen.
      set("from", patch.record && !patch.record.resource ? (patch.record.view ?? null) : null);
    }

    const query = params.toString();
    const url = query ? `${window.location.pathname}?${query}` : window.location.pathname;
    if (patch.record != null) window.history.pushState(null, "", url);
    else window.history.replaceState(null, "", url);
  }, []);

  return [state, setState] as const;
}
