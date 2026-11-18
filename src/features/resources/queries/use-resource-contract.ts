import { useQuery } from "@tanstack/react-query";

import { fetchResourceContract } from "../api/resources.api";
import { resourceKeys } from "./keys";

export function useResourceContract(resource: string) {
  return useQuery({
    queryKey: resourceKeys.contract(resource),
    queryFn: () => fetchResourceContract(resource),
    // The contract changes only on deploy. Later: revalidate with its ETag.
    staleTime: Infinity,
  });
}
