import { useInfiniteQuery } from "@tanstack/react-query";

import type { RecordId } from "@/lib/api/types";

import { fetchNotes } from "../api/resources.api";
import { resourceKeys } from "./keys";

/** Notes of a record, pinned first, then newest. `linked` adds the notes of its linked records. */
export function useNotes(resource: string, id: RecordId, linked: boolean, enabled = true) {
  return useInfiniteQuery({
    queryKey: resourceKeys.notes(resource, id, linked),
    queryFn: ({ pageParam }) => fetchNotes(resource, id, pageParam, linked),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.meta.has_more ? last.meta.page + 1 : undefined),
    enabled,
    // Attachment links are signed for 30 minutes: reload well before that.
    staleTime: 60_000,
  });
}
