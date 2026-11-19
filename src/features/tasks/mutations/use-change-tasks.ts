import { useMutation, useQueryClient } from "@tanstack/react-query";

import { changeTasks } from "../api/tasks.api";
import { taskKeys } from "../queries/keys";
import type { TaskOperation } from "../types";

/** The same change on many tasks. The answer lists what succeeded and what failed. */
export function useChangeTasks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ids, change }: { ids: number[]; change: TaskOperation }) => changeTasks(ids, change),
    onSettled: () => queryClient.invalidateQueries({ queryKey: taskKeys.all }),
  });
}
