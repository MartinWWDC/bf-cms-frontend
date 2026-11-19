import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { fetchAssistantUsage } from "../api/assistant.api";
import { assistantKeys } from "./keys";

/** Usage and cost per admin for one month (`2026-11`). Needs `assistant.usage`. */
export function useAssistantUsage(month: string, enabled = true) {
  return useQuery({
    queryKey: assistantKeys.usage(month),
    queryFn: () => fetchAssistantUsage(month),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}
