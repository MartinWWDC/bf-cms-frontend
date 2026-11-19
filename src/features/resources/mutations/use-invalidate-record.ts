import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { navigationKeys } from "@/features/navigation/queries";
import type { RecordId } from "@/lib/api/types";

import { resourceKeys } from "../queries/keys";

/**
 * What every write to a record has to refresh: the record itself (detail, screen, related
 * lists, notes, history), every list of its resource (a change can move it between tabs),
 * and the menu counts.
 */
export function useInvalidateRecord(resource: string) {
  const queryClient = useQueryClient();

  return useCallback(
    (id?: RecordId | null) =>
      Promise.all([
        id == null
          ? queryClient.invalidateQueries({ queryKey: resourceKeys.records(resource) })
          : queryClient.invalidateQueries({ queryKey: resourceKeys.record(resource, id) }),
        queryClient.invalidateQueries({ queryKey: resourceKeys.lists(resource) }),
        queryClient.invalidateQueries({ queryKey: resourceKeys.assignmentSummary(resource) }),
        queryClient.invalidateQueries({ queryKey: navigationKeys.badges() }),
      ]),
    [queryClient, resource],
  );
}
