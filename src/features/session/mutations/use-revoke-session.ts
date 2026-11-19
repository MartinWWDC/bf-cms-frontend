import { useMutation, useQueryClient } from "@tanstack/react-query";

import { revokeSession } from "../api/session.api";
import { sessionKeys } from "../queries/keys";

export function useRevokeSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: revokeSession,
    onSettled: () => queryClient.invalidateQueries({ queryKey: sessionKeys.sessions() }),
  });
}
