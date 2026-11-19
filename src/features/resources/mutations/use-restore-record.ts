import { useMutation } from "@tanstack/react-query";

import type { RecordId } from "@/lib/api/types";

import { restoreRecord } from "../api/resources.api";
import { useInvalidateRecord } from "./use-invalidate-record";

export function useRestoreRecord(resource: string) {
  const invalidate = useInvalidateRecord(resource);

  return useMutation({
    mutationFn: ({ id, reason }: { id: RecordId; reason?: string }) => restoreRecord(resource, id, reason),
    onSuccess: (_result, { id }) => invalidate(id),
  });
}
