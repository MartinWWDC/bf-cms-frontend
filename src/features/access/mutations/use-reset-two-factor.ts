import { useMutation, useQueryClient } from "@tanstack/react-query";

import { resetAdminTwoFactor } from "../api/access.api";
import { accessKeys } from "../queries/keys";

/** Removes a staff member's two-factor setup. They are signed out and set it up again at the next login. */
export function useResetTwoFactor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: resetAdminTwoFactor,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: accessKeys.staff() }),
  });
}
