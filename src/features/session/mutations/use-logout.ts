import { useMutation } from "@tanstack/react-query";

import { clearAuthToken } from "@/lib/api/auth-token";

import { logout } from "../api/session.api";

/** Ends the current session. The token is dropped even when the request fails. */
export function useLogout() {
  return useMutation({
    mutationFn: logout,
    onSettled: () => clearAuthToken(),
  });
}
