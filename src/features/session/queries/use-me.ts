import { useQuery } from "@tanstack/react-query";

import { fetchMe } from "../api/session.api";
import { sessionKeys } from "./keys";

export function useMe() {
  return useQuery({
    queryKey: sessionKeys.me(),
    queryFn: fetchMe,
    staleTime: Infinity,
  });
}
