import { useQuery } from "@tanstack/react-query";

import { fetchAdminAccess } from "../api/access.api";
import { accessKeys } from "./keys";

/** Roles, overrides and effective permissions of one staff member. */
export function useAdminAccess(adminId: number | null) {
  return useQuery({
    queryKey: accessKeys.adminAccess(adminId ?? 0),
    queryFn: () => fetchAdminAccess(adminId as number),
    enabled: adminId !== null,
    staleTime: 0,
  });
}
