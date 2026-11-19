import { useQuery } from "@tanstack/react-query";

import { scanCode } from "../api/warehouse.api";
import { warehouseKeys } from "./keys";

/** The item and location behind a code. Pass `null` until a code was scanned. Always read fresh: stock moves. */
export function useWarehouseScan(code: string | null) {
  return useQuery({
    queryKey: warehouseKeys.scan(code ?? ""),
    queryFn: () => scanCode(code as string),
    enabled: code !== null,
    staleTime: 0,
    gcTime: 0,
  });
}
