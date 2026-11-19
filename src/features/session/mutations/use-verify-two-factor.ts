import { useMutation, useQueryClient } from "@tanstack/react-query";

import { setAuthToken } from "@/lib/api/auth-token";

import { confirmTwoFactorSetup, verifyTwoFactor } from "../api/session.api";
import type { TwoFactorInput } from "../types";

interface VerifyInput extends TwoFactorInput {
  /** `true` on the first login, when the code confirms the authenticator setup. */
  setup: boolean;
  /**
   * Keep the token back instead of signing in right away. Used by the setup step, which
   * first has to show the recovery codes.
   */
  hold?: boolean;
}

/** Two-factor step. Stores the token, which signs the admin in. */
export function useVerifyTwoFactor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ setup, challenge_token, code }: VerifyInput) =>
      setup ? confirmTwoFactorSetup({ challenge_token, code }) : verifyTwoFactor({ challenge_token, code }),
    onSuccess: (session, input) => {
      if (input.hold) return;
      // Nothing cached for a previous admin may survive a new sign-in.
      queryClient.clear();
      setAuthToken(session.token, session.expires_at);
    },
  });
}
