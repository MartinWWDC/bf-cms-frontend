import { useMutation } from "@tanstack/react-query";

import type { RecordId } from "@/lib/api/types";

import { deleteRecord } from "../api/resources.api";
import { useInvalidateRecord } from "./use-invalidate-record";

export function useDeleteRecord(resource: string) {
  const invalidate = useInvalidateRecord(resource);

  return useMutation({
    mutationFn: ({ id, version, reason }: { id: RecordId; version: string; reason?: string }) =>
      deleteRecord(resource, id, version, reason),
    onSuccess: (_result, { id }) => invalidate(id),
  });
}
