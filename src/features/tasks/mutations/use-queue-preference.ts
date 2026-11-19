import { useMutation, useQueryClient } from "@tanstack/react-query";

import { updateQueuePreference } from "../api/tasks.api";
import { taskKeys } from "../queries/keys";

export function useQueuePreference() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ queue, ...preference }: { queue: string; pinned?: boolean; hidden?: boolean }) =>
      updateQueuePreference(queue, preference),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: taskKeys.queues() }),
  });
}
