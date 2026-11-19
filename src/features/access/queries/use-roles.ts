import { useQuery } from "@tanstack/react-query";

import { fetchRoles } from "../api/access.api";
import { accessKeys } from "./keys";

export function useRoles(enabled = true) {
  return useQuery({ queryKey: accessKeys.roles(), queryFn: fetchRoles, enabled, staleTime: 30_000 });
}
