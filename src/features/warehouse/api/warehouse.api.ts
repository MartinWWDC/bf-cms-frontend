import { getData } from "@/lib/api/client";

import type { WarehouseLabel, WarehouseScan } from "../types";

/** Looks up a scanned or typed code. `404 not_found` when neither an item nor a location matches. */
export function scanCode(code: string): Promise<WarehouseScan> {
  return getData<WarehouseScan>(`/warehouse/scan/${encodeURIComponent(code)}`);
}

/** Label data for up to 100 item and location codes. The frontend renders the label. */
export function fetchLabels(codes: string[]): Promise<WarehouseLabel[]> {
  return getData<WarehouseLabel[]>("/warehouse/labels", { params: { codes: codes.join(",") } });
}
