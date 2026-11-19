import { useQuery } from "@tanstack/react-query";

import { fetchConversation } from "../api/assistant.api";
import { assistantKeys } from "./keys";

/** One conversation with its messages. Another admin's id answers `404`. */
export function useConversation(id: number | null) {
  return useQuery({
    queryKey: assistantKeys.conversation(id ?? 0),
    queryFn: () => fetchConversation(id as number),
    enabled: id !== null,
    staleTime: 0,
  });
}
