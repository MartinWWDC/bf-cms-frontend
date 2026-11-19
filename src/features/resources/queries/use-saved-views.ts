import { useQuery } from "@tanstack/react-query";

import { fetchSavedViews } from "../api/resources.api";
import { resourceKeys } from "./keys";

/** The admin's own saved views of a resource, in their order. */
export function useSavedViews(resource: string, enabled = true) {
  return useQuery({
    queryKey: resourceKeys.savedViews(resource),
    queryFn: () => fetchSavedViews(resource),
    enabled,
    staleTime: 60_000,
  });
}
