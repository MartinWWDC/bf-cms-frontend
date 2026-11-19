import { Suspense } from "react";
import type { Metadata } from "next";

import { LabelsScreen } from "@/features/warehouse/components/labels-screen";
import { WarehouseGate } from "@/features/warehouse/components/warehouse-gate";

export const metadata: Metadata = { title: "Warehouse labels" };

export default function WarehouseLabelsPage() {
  return (
    <WarehouseGate>
      {/* The codes to print come from the URL, which is only known in the browser. */}
      <Suspense fallback={null}>
        <LabelsScreen />
      </Suspense>
    </WarehouseGate>
  );
}
