import { useQuery } from "@tanstack/react-query";

import { fetchResourceRecord } from "../api/resources.api";
import { resourceKeys } from "./keys";

/** One record with its detail data. Pass `null` while no record is selected. */
export function useResourceRecord(resource: string, id: string | null) {
  return useQuery({
    queryKey: resourceKeys.record(resource, id ?? ""),
    queryFn: () => fetchResourceRecord(resource, id as string),
    enabled: id !== null,
  });
}
