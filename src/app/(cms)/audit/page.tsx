import { Suspense } from "react";
import type { Metadata } from "next";

import { AuditScreen } from "@/features/access/components/audit-screen";
import { RouteGuard } from "@/features/navigation/components/route-guard";

export const metadata: Metadata = { title: "Audit trail" };

export default function AuditPage() {
  return (
    <RouteGuard page="audit">
      {/* The filters live in the URL, which is only known in the browser. */}
      <Suspense fallback={null}>
        <AuditScreen />
      </Suspense>
    </RouteGuard>
  );
}
