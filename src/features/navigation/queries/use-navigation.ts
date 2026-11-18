import { useQuery } from "@tanstack/react-query";

import { fetchNavigation } from "../api/navigation.api";
import { navigationKeys } from "./keys";

export function useNavigation() {
  return useQuery({
    queryKey: navigationKeys.all,
    queryFn: fetchNavigation,
    staleTime: Infinity,
  });
}
