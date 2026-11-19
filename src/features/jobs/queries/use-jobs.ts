import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { fetchJobs } from "../api/jobs.api";
import { isJobDone } from "../types";
import { jobKeys } from "./keys";

/** The admin's jobs, newest first. Refreshed while any of them is still running. */
export function useJobs(page: number) {
  return useQuery({
    queryKey: jobKeys.list(page),
    queryFn: () => fetchJobs(page),
    placeholderData: keepPreviousData,
    staleTime: 0,
    refetchInterval: (query) => (query.state.data?.data.some((job) => !isJobDone(job)) ? 3_000 : false),
  });
}
