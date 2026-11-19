import type { Metadata } from "next";

import { ScanScreen } from "@/features/warehouse/components/scan-screen";
import { WarehouseGate } from "@/features/warehouse/components/warehouse-gate";

export const metadata: Metadata = { title: "Warehouse scan" };

export default function WarehouseScanPage() {
  return (
    <WarehouseGate>
      <ScanScreen />
    </WarehouseGate>
  );
}
