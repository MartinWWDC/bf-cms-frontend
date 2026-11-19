import { useMutation, useQueryClient } from "@tanstack/react-query";

import { changeTask } from "../api/tasks.api";
import { taskKeys } from "../queries/keys";
import type { TaskOperation } from "../types";

/** Take, assign, set the status of or dismiss one task. */
export function useChangeTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, change }: { id: number; change: TaskOperation }) => changeTask(id, change),
    // Also after a failure: `task_closed` means the list on screen is out of date.
    onSettled: () => queryClient.invalidateQueries({ queryKey: taskKeys.all }),
  });
}
