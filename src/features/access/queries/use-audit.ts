import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { fetchAudit } from "../api/access.api";
import type { AuditFilters } from "../types";
import { accessKeys } from "./keys";

/** The audit trail of all staff activity. There is no total, only `has_more`. */
export function useAudit(filters: AuditFilters, page: number, perPage: number) {
  return useQuery({
    queryKey: accessKeys.auditList(filters, page, perPage),
    queryFn: () => fetchAudit(filters, page, perPage),
    placeholderData: keepPreviousData,
    staleTime: 0,
  });
}
