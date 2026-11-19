import { useQuery } from "@tanstack/react-query";

import { fetchTaskQueues } from "../api/tasks.api";
import { taskKeys } from "./keys";

/**
 * Queues with their counts, and the stored task counts. The backend recounts every minute;
 * the live channel would push changes (`tasks.counts`), polling is the documented fallback.
 */
export function useTaskQueues() {
  return useQuery({
    queryKey: taskKeys.queues(),
    queryFn: fetchTaskQueues,
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
}
