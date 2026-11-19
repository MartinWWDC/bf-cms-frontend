import { useMutation } from "@tanstack/react-query";

import { login } from "../api/session.api";

/** Password step. On success the caller moves on to the two-factor step. */
export function useLogin() {
  return useMutation({ mutationFn: login });
}
