import { Suspense } from "react";

import { ComingSoon } from "@/components/layout/coming-soon";

/** Catches every menu entry that has no screen yet. Remove routes from here as they are built. */
export default function PlaceholderPage() {
  return (
    <Suspense fallback={null}>
      <ComingSoon />
    </Suspense>
  );
}
