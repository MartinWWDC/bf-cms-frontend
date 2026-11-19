import { Suspense } from "react";

import { DashboardRoute } from "./dashboard-route";

/** A dashboard (`/dashboards/{key}`) or the personal dashboards manager (`/dashboards/personal`). */
export default function DashboardPage() {
  return (
    // The dashboard key, the range and the filters come from the URL, which is only known at request time.
    <Suspense fallback={null}>
      <DashboardRoute />
    </Suspense>
  );
}
