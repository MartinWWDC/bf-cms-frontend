import { getData } from "@/lib/api/client";

import type { NavBadges, NavNode } from "../types";

export function fetchNavigation(): Promise<NavNode[]> {
  return getData<NavNode[]>("/navigation");
}

/** Kept apart from the navigation so that the tree stays cacheable. */
export function fetchNavigationBadges(): Promise<NavBadges> {
  return getData<NavBadges>("/navigation/badges");
}
