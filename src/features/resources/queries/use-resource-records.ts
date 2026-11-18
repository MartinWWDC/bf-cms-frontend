import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { fetchResourceRecords } from "../api/resources.api";
import type { ListParams } from "../types";
import { resourceKeys } from "./keys";

export function useResourceRecords(resource: string, params: ListParams) {
  return useQuery({
    queryKey: resourceKeys.list(resource, params),
    queryFn: () => fetchResourceRecords(resource, params),
    // Keep the current page on screen while the next page, sort or search loads.
    placeholderData: keepPreviousData,
  });
}
