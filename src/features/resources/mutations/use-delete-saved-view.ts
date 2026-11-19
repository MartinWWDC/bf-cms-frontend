import { useMutation, useQueryClient } from "@tanstack/react-query";

import { navigationKeys } from "@/features/navigation/queries";

import { deleteSavedView } from "../api/resources.api";
import { resourceKeys } from "../queries/keys";

export function useDeleteSavedView(resource: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteSavedView(resource, id),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: resourceKeys.savedViews(resource) }),
        queryClient.invalidateQueries({ queryKey: navigationKeys.tree() }),
      ]),
  });
}
