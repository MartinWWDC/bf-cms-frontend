import { useMutation, useQueryClient } from "@tanstack/react-query";

import { navigationKeys } from "@/features/navigation/queries";

import { orderSavedViews } from "../api/resources.api";
import { resourceKeys } from "../queries/keys";

export function useOrderSavedViews(resource: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: number[]) => orderSavedViews(resource, ids),
    onSuccess: (views) => {
      queryClient.setQueryData(resourceKeys.savedViews(resource), views);
      return queryClient.invalidateQueries({ queryKey: navigationKeys.tree() });
    },
  });
}
