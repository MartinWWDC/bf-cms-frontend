import { useMutation } from "@tanstack/react-query";

import type { RecordId } from "@/lib/api/types";

import { assignRecord, unassignRecord } from "../api/resources.api";
import { useInvalidateRecord } from "./use-invalidate-record";

/** Assigns or reassigns a record; `adminId: null` removes the assignment. */
export function useAssignRecord(resource: string) {
  const invalidate = useInvalidateRecord(resource);

  return useMutation({
    mutationFn: async ({ id, adminId, reason }: { id: RecordId; adminId: number | null; reason?: string }) => {
      if (adminId === null) await unassignRecord(resource, id);
      else await assignRecord(resource, id, adminId, reason);
    },
    onSuccess: (_result, { id }) => invalidate(id),
  });
}
