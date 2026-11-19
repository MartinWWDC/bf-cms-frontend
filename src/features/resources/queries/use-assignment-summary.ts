import { useQuery } from "@tanstack/react-query";

import { fetchAssignmentSummary } from "../api/resources.api";
import { resourceKeys } from "./keys";

/** Open records per admin, for balancing the load. */
export function useAssignmentSummary(resource: string, enabled = true) {
  return useQuery({
    queryKey: resourceKeys.assignmentSummary(resource),
    queryFn: () => fetchAssignmentSummary(resource),
    enabled,
    staleTime: 30_000,
  });
}
