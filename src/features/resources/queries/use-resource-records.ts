import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { fetchResourceRecords } from "../api/resources.api";
import type { ListParams } from "../types";
import { resourceKeys } from "./keys";

interface Options {
  enabled?: boolean;
  /** Keep the current rows on screen while the next page, sort or filter loads. */
  keepPrevious?: boolean;
}

export function useResourceRecords(resource: string, params: ListParams, options: Options = {}) {
  return useQuery({
    queryKey: resourceKeys.list(resource, params),
    queryFn: ({ signal }) => fetchResourceRecords(resource, params, { signal }),
    enabled: options.enabled ?? true,
    placeholderData: options.keepPrevious === false ? undefined : keepPreviousData,
    staleTime: 15_000,
  });
}
