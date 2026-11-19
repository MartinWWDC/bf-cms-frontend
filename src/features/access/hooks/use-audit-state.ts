"use client";

import { useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";

import type { AuditFilters } from "../types";

export interface AuditState extends Required<AuditFilters> {
  page: number;
}

const KEYS = {
  adminId: "admin",
  event: "event",
  resource: "resource",
  recordId: "record",
  requestId: "request",
  from: "from",
  to: "to",
} as const;

/**
 * The audit filters and page, kept in the URL so a search can be shared (for example
 * "everything request X did"). Changing a filter goes back to page 1.
 */
export function useAuditState() {
  const searchParams = useSearchParams();

  const state = useMemo<AuditState>(() => {
    const admin = Number(searchParams.get(KEYS.adminId));
    const page = Number(searchParams.get("page"));
    return {
      adminId: Number.isInteger(admin) && admin > 0 ? admin : null,
      event: searchParams.get(KEYS.event),
      resource: searchParams.get(KEYS.resource),
      recordId: searchParams.get(KEYS.recordId),
      requestId: searchParams.get(KEYS.requestId),
      from: searchParams.get(KEYS.from),
      to: searchParams.get(KEYS.to),
      page: Number.isInteger(page) && page > 0 ? page : 1,
    };
  }, [searchParams]);

  const setState = useCallback((patch: Partial<AuditState>) => {
    const params = new URLSearchParams(window.location.search);
    let filterChanged = false;
    for (const [name, key] of Object.entries(KEYS) as [keyof typeof KEYS, string][]) {
      if (!(name in patch)) continue;
      filterChanged = true;
      const value = patch[name];
      if (value === null || value === undefined || value === "") params.delete(key);
      else params.set(key, String(value));
    }
    const page = patch.page ?? (filterChanged ? 1 : undefined);
    if (page !== undefined) {
      if (page > 1) params.set("page", String(page));
      else params.delete("page");
    }
    const query = params.toString();
    window.history.replaceState(null, "", query ? `${window.location.pathname}?${query}` : window.location.pathname);
  }, []);

  const reset = useCallback(() => window.history.replaceState(null, "", window.location.pathname), []);

  return [state, setState, reset] as const;
}
