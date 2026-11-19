import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createConversation } from "../api/assistant.api";
import { assistantKeys } from "../queries/keys";

export function useCreateConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (title?: string | null) => createConversation(title),
    onSuccess: (conversation) => {
      queryClient.setQueryData(assistantKeys.conversation(conversation.id), { ...conversation, messages: [] });
      return queryClient.invalidateQueries({ queryKey: assistantKeys.conversations() });
    },
  });
}
