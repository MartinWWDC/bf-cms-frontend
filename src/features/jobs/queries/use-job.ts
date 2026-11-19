import { useQuery } from "@tanstack/react-query";

import { fetchJob } from "../api/jobs.api";
import { isJobDone } from "../types";
import { jobKeys } from "./keys";

/**
 * One job, polled while it is queued or running. Polling is the documented fallback of the
 * live channel and always works.
 */
export function useJob(id: string | null) {
  return useQuery({
    queryKey: jobKeys.detail(id ?? ""),
    queryFn: () => fetchJob(id as string),
    enabled: id !== null,
    staleTime: 0,
    refetchInterval: (query) => (query.state.data && isJobDone(query.state.data) ? false : 2_000),
  });
}
