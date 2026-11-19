import { useQuery } from "@tanstack/react-query";

import { fetchSessions } from "../api/session.api";
import { sessionKeys } from "./keys";

export function useSessions() {
  return useQuery({
    queryKey: sessionKeys.sessions(),
    queryFn: fetchSessions,
    staleTime: 0,
  });
}
