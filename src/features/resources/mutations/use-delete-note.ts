import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { RecordId } from "@/lib/api/types";

import { deleteNote } from "../api/resources.api";
import { resourceKeys } from "../queries/keys";

export function useDeleteNote(resource: string, id: RecordId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (noteId: number) => deleteNote(resource, id, noteId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: resourceKeys.records(resource) }),
  });
}
