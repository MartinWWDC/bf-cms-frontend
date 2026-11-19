import { useInfiniteQuery } from "@tanstack/react-query";

import type { RecordId } from "@/lib/api/types";

import { fetchHistory } from "../api/resources.api";
import { resourceKeys } from "./keys";

/** The merged history of a record, newest first. There is no total, only `has_more`. */
export function useHistory(resource: string, id: RecordId, types: string[], enabled = true) {
  return useInfiniteQuery({
    queryKey: resourceKeys.history(resource, id, types),
    queryFn: ({ pageParam }) => fetchHistory(resource, id, pageParam, types),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.meta.has_more ? last.meta.page + 1 : undefined),
    enabled,
    staleTime: 0,
  });
}
