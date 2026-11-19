import { useQuery } from "@tanstack/react-query";

import type { RecordId } from "@/lib/api/types";

import { fetchResourceRecord } from "../api/resources.api";
import { resourceKeys } from "./keys";

/** One record with its `meta`. Pass `null` while no record is selected. */
export function useResourceRecord(resource: string, id: RecordId | null, enabled = true) {
  return useQuery({
    queryKey: resourceKeys.detail(resource, id ?? ""),
    queryFn: () => fetchResourceRecord(resource, id as RecordId),
    enabled: enabled && id !== null,
    // A record is always read fresh: its version decides whether a save is stale.
    staleTime: 0,
  });
}
