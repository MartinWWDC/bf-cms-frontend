import { useQuery } from "@tanstack/react-query";

import { fetchTaskTypes } from "../api/tasks.api";
import { taskKeys } from "./keys";

/** The task types, for the type filter. They only change with a deploy. */
export function useTaskTypes() {
  return useQuery({
    queryKey: taskKeys.types(),
    queryFn: fetchTaskTypes,
    staleTime: 10 * 60_000,
  });
}
