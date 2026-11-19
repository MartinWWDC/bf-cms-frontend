import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { fetchGlobalSearch } from "../api/search.api";
import { searchKeys } from "./keys";

export function useGlobalSearch(query: string, enabled: boolean) {
  return useQuery({
    queryKey: searchKeys.query(query),
    queryFn: ({ signal }) => fetchGlobalSearch(query, signal),
    enabled,
    placeholderData: keepPreviousData,
    // Recently opened records change with every record the admin opens.
    staleTime: query === "" ? 0 : 30_000,
  });
}
