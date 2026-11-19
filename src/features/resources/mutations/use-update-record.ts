import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { RecordId } from "@/lib/api/types";

import { updateRecord } from "../api/resources.api";
import { resourceKeys } from "../queries/keys";
import type { RecordInput } from "../types";
import { useInvalidateRecord } from "./use-invalidate-record";

interface UpdateInput {
  id: RecordId;
  /** `meta.version` of the record as it was loaded; a newer one answers `409 stale_record`. */
  version: string;
  /** Only the fields that changed. */
  input: RecordInput;
}

export function useUpdateRecord(resource: string) {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateRecord(resource);

  return useMutation({
    mutationFn: ({ id, version, input }: UpdateInput) => updateRecord(resource, id, version, input),
    onSuccess: (record, { id }) => {
      queryClient.setQueryData(resourceKeys.detail(resource, id), record);
      return invalidate(id);
    },
  });
}
