import { useQuery } from "@tanstack/react-query";

import { fetchPermissionCatalogue } from "../api/access.api";
import { accessKeys } from "./keys";

/** Every permission that can be granted. It changes only with a deploy or the language. */
export function usePermissionCatalogue(enabled = true) {
  return useQuery({
    queryKey: accessKeys.catalogue(),
    queryFn: fetchPermissionCatalogue,
    enabled,
    staleTime: 10 * 60_000,
  });
}
