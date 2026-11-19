import { useQuery } from "@tanstack/react-query";

import { fetchNavigation } from "../api/navigation.api";
import { navigationKeys } from "./keys";

/**
 * The menu and route guard. It changes with permissions, language, saved views and
 * deploys, so it is refreshed in the background; the browser revalidates it with its ETag.
 */
export function useNavigation() {
  return useQuery({
    queryKey: navigationKeys.tree(),
    queryFn: fetchNavigation,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: true,
  });
}
