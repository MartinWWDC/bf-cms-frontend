import { useMutation } from "@tanstack/react-query";

import { exportRecords } from "../api/resources.api";
import type { ExportFormat, ListParams } from "../types";

/** Queues an export of the list the admin is looking at. Follow the returned job. */
export function useExportRecords(resource: string) {
  return useMutation({
    mutationFn: ({ format, params }: { format: ExportFormat; params: ListParams }) =>
      exportRecords(resource, format, params),
  });
}
