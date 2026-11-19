import { useMutation, useQueryClient } from "@tanstack/react-query";

import { setAuthToken } from "@/lib/api/auth-token";

import { login } from "../api/session.api";
import { isIssuedSession } from "../types";

/**
 * Password step. Normally the caller moves on to the two-factor step. Where two-factor is
 * switched off for the environment, the answer is already the session: the admin is
 * signed in here.
 */
export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: login,
    onSuccess: (result) => {
      if (!isIssuedSession(result)) return;
      // Nothing cached for a previous admin may survive a new sign-in.
      queryClient.clear();
      setAuthToken(result.token, result.expires_at);
    },
  });
}
