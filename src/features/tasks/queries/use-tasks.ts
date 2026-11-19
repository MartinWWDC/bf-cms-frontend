import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { fetchTasks } from "../api/tasks.api";
import type { TaskListParams } from "../types";
import { taskKeys } from "./keys";

export function useTasks(params: TaskListParams) {
  return useQuery({
    queryKey: taskKeys.list(params),
    queryFn: () => fetchTasks(params),
    placeholderData: keepPreviousData,
    staleTime: 15_000,
    refetchInterval: 60_000,
  });
}
