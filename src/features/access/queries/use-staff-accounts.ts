import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { fetchStaffAccounts } from "../api/access.api";
import { accessKeys } from "./keys";

export function useStaffAccounts(params: { q: string; page: number; perPage: number }) {
  return useQuery({
    queryKey: accessKeys.staffList(params),
    queryFn: () => fetchStaffAccounts(params),
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });
}
