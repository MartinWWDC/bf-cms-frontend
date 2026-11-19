import { useInfiniteQuery } from "@tanstack/react-query";

import { fetchConversations } from "../api/assistant.api";
import { assistantKeys } from "./keys";

/** The admin's own conversations, last active first. */
export function useConversations(enabled = true) {
  return useInfiniteQuery({
    queryKey: assistantKeys.conversations(),
    queryFn: ({ pageParam }) => fetchConversations(pageParam),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.meta.has_more ? last.meta.page + 1 : undefined),
    enabled,
    staleTime: 15_000,
  });
}
