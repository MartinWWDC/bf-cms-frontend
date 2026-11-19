import { useQuery } from "@tanstack/react-query";

import { fetchNavigationBadges } from "../api/navigation.api";
import { navigationKeys } from "./keys";

export function useNavigationBadges(enabled = true) {
  return useQuery({
    queryKey: navigationKeys.badges(),
    queryFn: fetchNavigationBadges,
    enabled,
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
}
