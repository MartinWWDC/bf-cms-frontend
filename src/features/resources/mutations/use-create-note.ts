import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { RecordId } from "@/lib/api/types";

import { createNote } from "../api/resources.api";
import { resourceKeys } from "../queries/keys";
import type { NoteInput } from "../types";

export function useCreateNote(resource: string, id: RecordId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: NoteInput) => createNote(resource, id, input),
    // Notes also show in the history, and the record counts them.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: resourceKeys.record(resource, id) }),
  });
}
