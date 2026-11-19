import { Suspense } from "react";

import { ResourceViewSkeleton } from "@/features/resources/components/resource-view";

import { ResourceScreen } from "./resource-screen";

/** The generic list of any resource: `/r/{resource}` or `/r/{resource}/{view}`. */
export default function ResourcePage() {
  return (
    // The resource, the view and the list state come from the URL, which is only known at request time.
    <Suspense fallback={<ResourceViewSkeleton />}>
      <ResourceScreen />
    </Suspense>
  );
}
