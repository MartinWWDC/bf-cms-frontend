"use client";

import { useParams } from "next/navigation";

import { CheckoutScreen } from "@/features/checkouts/components/checkout-screen";
import { ModerationScreen } from "@/features/moderation/components/moderation-screen";
import { RouteGuard } from "@/features/navigation/components/route-guard";
import type { ScreenRegistry } from "@/features/resources/components/record-drawer";
import { ResourceView } from "@/features/resources/components/resource-view";

/**
 * Custom-built screens, by resource key. A resource whose contract names a
 * `detail.custom_endpoint` and has an entry here gets the screen as the first tab of its
 * drawer; every other resource, and the Details tab of these, use the generic layout.
 * Kept at module scope so the drawer sees one stable object.
 */
const screens: ScreenRegistry = {
  checkouts: CheckoutScreen,
  moderation_ads: ModerationScreen,
  moderation_users: ModerationScreen,
  moderation_business_accounts: ModerationScreen,
  moderation_reports: ModerationScreen,
};

export function ResourceScreen() {
  const params = useParams<{ resource: string; view?: string[] }>();

  return (
    <RouteGuard resource={params.resource}>
      <ResourceView resource={params.resource} view={params.view?.[0] ?? null} screens={screens} />
    </RouteGuard>
  );
}
