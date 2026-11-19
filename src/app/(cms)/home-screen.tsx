"use client";

import { useDashboards } from "@/features/dashboards/queries";
import { HomeRedirect } from "@/features/navigation/components/home-redirect";
import { routes } from "@/lib/routes";

/**
 * The start page goes to the admin's home dashboard (`meta.home` of `GET /dashboards`).
 * Without one, or when the admin may not open dashboards at all, it goes to the first
 * entry of the menu.
 */
export function HomeScreen() {
  const dashboards = useDashboards();
  const home = dashboards.data?.meta.home ?? null;

  return <HomeRedirect waiting={dashboards.isPending} preferred={home ? routes.dashboard(home) : null} />;
}
