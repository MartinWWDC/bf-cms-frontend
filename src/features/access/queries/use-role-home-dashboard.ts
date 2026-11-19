import { useQuery } from "@tanstack/react-query";

import { fetchRoleHomeDashboard } from "../api/access.api";
import { accessKeys } from "./keys";

export function useRoleHomeDashboard(roleId: number | null) {
  return useQuery({
    queryKey: accessKeys.homeDashboard(roleId ?? 0),
    queryFn: () => fetchRoleHomeDashboard(roleId as number),
    enabled: roleId !== null,
    staleTime: 0,
  });
}
