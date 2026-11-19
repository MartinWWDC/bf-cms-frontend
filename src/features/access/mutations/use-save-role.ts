import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createRole, updateRole } from "../api/access.api";
import { accessKeys } from "../queries/keys";
import type { RoleInput } from "../types";

/** Creates a role, or changes one when `id` is given. */
export function useSaveRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id?: number; input: RoleInput }) =>
      id === undefined ? createRole(input) : updateRole(id, input),
    // A role's permissions decide what its staff may do: their access views are stale too.
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: accessKeys.roles() }),
        queryClient.invalidateQueries({ queryKey: accessKeys.staff() }),
      ]),
  });
}
