"use client";

import { useParams } from "next/navigation";

import { DashboardScreen, PERSONAL_DASHBOARDS } from "@/features/dashboards/components/dashboard-screen";
import { PersonalDashboards } from "@/features/dashboards/components/personal-dashboards";
import { RouteGuard } from "@/features/navigation/components/route-guard";

export function DashboardRoute() {
  const { dashboard } = useParams<{ dashboard: string }>();

  return (
    // The navigation lists `dashboards/{key}` per dashboard the admin may open.
    <RouteGuard page="dashboards" pagePrefix>
      {dashboard === PERSONAL_DASHBOARDS ? <PersonalDashboards /> : <DashboardScreen key={dashboard} dashboard={dashboard} />}
    </RouteGuard>
  );
}
