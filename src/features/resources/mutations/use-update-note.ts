import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { RecordId } from "@/lib/api/types";

import { updateNote } from "../api/resources.api";
import { resourceKeys } from "../queries/keys";
import type { NoteInput } from "../types";

/** Edits one of the admin's own notes. A linked record's note is edited on its own record. */
export function useUpdateNote(resource: string, id: RecordId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ noteId, input }: { noteId: number; input: Omit<NoteInput, "attachments"> }) =>
      updateNote(resource, id, noteId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: resourceKeys.records(resource) }),
  });
}
