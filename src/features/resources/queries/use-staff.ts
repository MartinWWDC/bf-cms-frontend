import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { fetchStaff } from "../api/resources.api";
import { resourceKeys } from "./keys";

/** Staff for assignee and mention pickers (at most 50 per search). */
export function useStaff(query: string, enabled = true) {
  return useQuery({
    queryKey: resourceKeys.staff(query),
    queryFn: () => fetchStaff(query),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 5 * 60_000,
  });
}
