import { keepPreviousData, useQuery } from "@tanstack/react-query";

import type { RecordId } from "@/lib/api/types";

import { fetchRelatedRecords } from "../api/resources.api";
import type { ListParams } from "../types";
import { resourceKeys } from "./keys";

export function useRelatedRecords(resource: string, id: RecordId, relation: string, params: ListParams, enabled = true) {
  return useQuery({
    queryKey: resourceKeys.related(resource, id, relation, params),
    queryFn: () => fetchRelatedRecords(resource, id, relation, params),
    enabled,
    placeholderData: keepPreviousData,
  });
}
