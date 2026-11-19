import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { RecordId } from "@/lib/api/types";

import { pinNote } from "../api/resources.api";
import { resourceKeys } from "../queries/keys";

/** Pinning is shared: everyone sees a pinned note at the top. */
export function usePinNote(resource: string, id: RecordId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ noteId, pinned }: { noteId: number; pinned: boolean }) => pinNote(resource, id, noteId, pinned),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: resourceKeys.records(resource) }),
  });
}
