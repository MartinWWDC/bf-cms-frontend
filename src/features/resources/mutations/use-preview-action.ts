import { useMutation } from "@tanstack/react-query";

import type { RecordId } from "@/lib/api/types";

import { previewRecordAction } from "../api/resources.api";

/** What an action would do, with its risk flags. Nothing changes. */
export function usePreviewAction(resource: string) {
  return useMutation({
    mutationFn: ({ id, action, input }: { id: RecordId; action: string; input: Record<string, unknown> }) =>
      previewRecordAction(resource, id, action, input),
  });
}
