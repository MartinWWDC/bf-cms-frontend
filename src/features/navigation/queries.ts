import { useQuery } from "@tanstack/react-query";

import { fetchNavigation } from "./api";

export const navigationKeys = {
  all: ["navigation"] as const,
};

export function useNavigation() {
  return useQuery({
    queryKey: navigationKeys.all,
    queryFn: fetchNavigation,
    staleTime: Infinity,
  });
}
