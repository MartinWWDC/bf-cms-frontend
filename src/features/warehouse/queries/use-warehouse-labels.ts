import { useQuery } from "@tanstack/react-query";

import { fetchLabels } from "../api/warehouse.api";
import { warehouseKeys } from "./keys";

export function useWarehouseLabels(codes: string[]) {
  return useQuery({
    queryKey: warehouseKeys.labels(codes),
    queryFn: () => fetchLabels(codes),
    enabled: codes.length > 0,
    staleTime: 60_000,
  });
}
