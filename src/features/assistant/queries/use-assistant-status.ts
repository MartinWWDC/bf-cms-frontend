import { useQuery } from "@tanstack/react-query";

import { fetchAssistantStatus } from "../api/assistant.api";
import { assistantKeys } from "./keys";

/** Whether the assistant is switched on, what the admin may do with it, the limits and today's usage. */
export function useAssistantStatus(enabled = true) {
  return useQuery({
    queryKey: assistantKeys.status(),
    queryFn: fetchAssistantStatus,
    enabled,
    staleTime: 30_000,
  });
}
