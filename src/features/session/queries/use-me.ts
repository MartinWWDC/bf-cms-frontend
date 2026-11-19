import { useQuery } from "@tanstack/react-query";

import { fetchMe } from "../api/session.api";
import { useAuthToken } from "../hooks/use-auth-token";
import { sessionKeys } from "./keys";

/** The signed-in admin. Idle while nobody is signed in. */
export function useMe() {
  const token = useAuthToken();

  return useQuery({
    queryKey: sessionKeys.me(),
    queryFn: fetchMe,
    enabled: token !== null,
    // Access changes apply from the admin's next request; pick them up regularly.
    staleTime: 5 * 60_000,
  });
}
