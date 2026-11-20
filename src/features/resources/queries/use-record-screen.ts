import { useQuery } from "@tanstack/react-query";

import type { RecordId } from "@/lib/api/types";

import { fetchRecordScreen } from "../api/resources.api";
import { resourceKeys } from "./keys";

/**
 * The aggregated screen of a record, for resources whose contract has
 * `detail.custom_endpoint`. `meta.record` is the normal record answer. `view` is the list
 * view the record was opened from: each view can have its own screen.
 */
export function useRecordScreen<TData = Record<string, unknown>>(
  resource: string,
  id: RecordId | null,
  view: string | null = null,
  enabled = true,
) {
  return useQuery({
    queryKey: resourceKeys.screen(resource, id ?? "", view),
    queryFn: () => fetchRecordScreen<TData>(resource, id as RecordId, view),
    enabled: enabled && id !== null,
    staleTime: 0,
  });
}
