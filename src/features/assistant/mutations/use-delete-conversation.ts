import { useMutation, useQueryClient } from "@tanstack/react-query";

import { deleteConversation } from "../api/assistant.api";
import { assistantKeys } from "../queries/keys";

export function useDeleteConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteConversation,
    onSuccess: (_result, id) => {
      queryClient.removeQueries({ queryKey: assistantKeys.conversation(id) });
      return queryClient.invalidateQueries({ queryKey: assistantKeys.conversations() });
    },
  });
}
