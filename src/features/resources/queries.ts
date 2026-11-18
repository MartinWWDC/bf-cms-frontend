import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { fetchResourceContract, fetchResourceRecord, fetchResourceRecords } from "./api";
import type { ListParams } from "./types";

export const resourceKeys = {
  all: (resource: string) => ["resources", resource] as const,
  contract: (resource: string) => [...resourceKeys.all(resource), "contract"] as const,
  lists: (resource: string) => [...resourceKeys.all(resource), "list"] as const,
  list: (resource: string, params: ListParams) => [...resourceKeys.lists(resource), params] as const,
  record: (resource: string, id: string) => [...resourceKeys.all(resource), "record", id] as const,
};

export function useResourceContract(resource: string) {
  return useQuery({
    queryKey: resourceKeys.contract(resource),
    queryFn: () => fetchResourceContract(resource),
    // The contract changes only on deploy. Later: revalidate with its ETag.
    staleTime: Infinity,
  });
}

export function useResourceRecords(resource: string, params: ListParams, enabled = true) {
  return useQuery({
    queryKey: resourceKeys.list(resource, params),
    queryFn: () => fetchResourceRecords(resource, params),
    // Keep the current page on screen while the next page, sort or search loads.
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useResourceRecord(resource: string, id: string | null) {
  return useQuery({
    queryKey: resourceKeys.record(resource, id ?? ""),
    queryFn: () => fetchResourceRecord(resource, id as string),
    enabled: id !== null,
  });
}
