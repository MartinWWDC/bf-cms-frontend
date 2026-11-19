import { useMutation } from "@tanstack/react-query";

import { assignRecords } from "../api/resources.api";
import type { BulkTarget } from "../types";

/** Assigns many records in a background job (type `bulk_assignment`). Follow the job. */
export function useAssignRecords(resource: string) {
  return useMutation({
    mutationFn: ({ adminId, target }: { adminId: number | null; target: BulkTarget }) =>
      assignRecords(resource, adminId, target),
  });
}
