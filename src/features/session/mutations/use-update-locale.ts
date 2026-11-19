import { useMutation, useQueryClient } from "@tanstack/react-query";

import { updateMyLocale } from "../api/session.api";
import { sessionKeys } from "../queries/keys";

/**
 * Saves the admin's interface language on the backend. From then on the backend uses it
 * for every request, whatever the browser sends (`conventions.md` section 12).
 */
export function useUpdateLocale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateMyLocale,
    onSuccess: (me) => queryClient.setQueryData(sessionKeys.me(), me),
  });
}
