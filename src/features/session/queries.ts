import { useQuery } from "@tanstack/react-query";

import { fetchMe } from "./api";

export const sessionKeys = {
  me: ["session", "me"] as const,
};

export function useMe() {
  return useQuery({
    queryKey: sessionKeys.me,
    queryFn: fetchMe,
    staleTime: Infinity,
  });
}
