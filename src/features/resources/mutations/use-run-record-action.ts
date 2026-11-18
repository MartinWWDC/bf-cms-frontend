import { useMutation, useQueryClient } from "@tanstack/react-query";

import { runResourceAction } from "../api/resources.api";
import { resourceKeys } from "../queries/keys";
import type { RunActionInput } from "../types";

/**
 * Runs one of a record's actions (refund, cancel, resend label...).
 * On success the record and every list of the resource are refetched, because an action
 * can change the record's fields and which tabs it belongs to.
 */
export function useRunRecordAction(resource: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: RunActionInput) => runResourceAction(resource, input),
    onSuccess: (_result, input) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: resourceKeys.record(resource, input.recordId) }),
        queryClient.invalidateQueries({ queryKey: resourceKeys.lists(resource) }),
      ]),
  });
}
