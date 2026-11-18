import { Suspense } from "react";
import type { Metadata } from "next";

import { ResourceView, ResourceViewSkeleton } from "@/features/resources/components/resource-view";

export const metadata: Metadata = { title: "Orders" };

export default function OrdersPage() {
  return (
    // The list state lives in the URL, which is only known in the browser.
    <Suspense fallback={<ResourceViewSkeleton />}>
      <ResourceView resource="orders" />
    </Suspense>
  );
}
