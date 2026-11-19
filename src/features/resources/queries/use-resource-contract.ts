import { useQuery } from "@tanstack/react-query";

import { fetchResourceContract } from "../api/resources.api";
import { resourceKeys } from "./keys";

/**
 * The description of one resource. It changes with permissions, language and deploys; the
 * browser revalidates it with its ETag, so refetching is cheap.
 */
export function useResourceContract(resource: string | null | undefined) {
  return useQuery({
    queryKey: resourceKeys.contract(resource ?? ""),
    queryFn: () => fetchResourceContract(resource as string),
    enabled: Boolean(resource),
    staleTime: 10 * 60_000,
  });
}
