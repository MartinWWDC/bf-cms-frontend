import { useMutation } from "@tanstack/react-query";

import { createRecord } from "../api/resources.api";
import type { RecordInput } from "../types";
import { useInvalidateRecord } from "./use-invalidate-record";

export function useCreateRecord(resource: string) {
  const invalidate = useInvalidateRecord(resource);

  return useMutation({
    mutationFn: (input: RecordInput) => createRecord(resource, input),
    onSuccess: (record) => invalidate(record.data.id),
  });
}
