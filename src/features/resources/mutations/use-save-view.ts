import { useMutation, useQueryClient } from "@tanstack/react-query";

import { navigationKeys } from "@/features/navigation/queries";

import { createSavedView, updateSavedView } from "../api/resources.api";
import { resourceKeys } from "../queries/keys";
import type { SavedViewInput } from "../types";

/** Creates a personal saved view, or changes one when `id` is given. */
export function useSaveView(resource: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id?: number; input: SavedViewInput }) =>
      id === undefined ? createSavedView(resource, input) : updateSavedView(resource, id, input),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: resourceKeys.savedViews(resource) }),
        queryClient.invalidateQueries({ queryKey: resourceKeys.lists(resource) }),
        // Saved views are listed in the menu under their resource.
        queryClient.invalidateQueries({ queryKey: navigationKeys.tree() }),
      ]),
  });
}
