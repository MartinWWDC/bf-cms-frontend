import { useQuery } from "@tanstack/react-query";

import type { RecordId } from "@/lib/api/types";

import { fetchRecordScreen } from "../api/resources.api";
import { resourceKeys } from "./keys";

/**
 * The aggregated screen of a record, for resources whose contract has
 * `detail.custom_endpoint`. `meta.record` is the normal record answer.
 */
export function useRecordScreen<TData = Record<string, unknown>>(resource: string, id: RecordId | null, enabled = true) {
  return useQuery({
    queryKey: resourceKeys.screen(resource, id ?? ""),
    queryFn: () => fetchRecordScreen<TData>(resource, id as RecordId),
    enabled: enabled && id !== null,
    staleTime: 0,
  });
}
